// src/controllers/dataController.js
const { Client } = require("@opensearch-project/opensearch");

const client = new Client({
  node: process.env.OPENSEARCH_NODE || "http://localhost:9200",
});

/* =========================================================
   Helpers
   ========================================================= */
function parseLimitOffset(req) {
  const rawLimit = req.query?.limit;
  const rawOffset = req.query?.offset;

  const limit =
    rawLimit !== undefined
      ? Math.max(1, Math.min(5000, parseInt(rawLimit, 10) || 100))
      : 100;

  const offset =
    rawOffset !== undefined ? Math.max(0, parseInt(rawOffset, 10) || 0) : 0;

  return { limit, offset };
}

function sanitizeQ(input) {
  if (input === undefined || input === null) return "";
  return String(input).trim().replace(/\s+/g, " ").trim();
}

function listFromComma(v) {
  if (v === undefined || v === null) return [];
  const s = String(v).trim();
  if (!s) return [];
  return s
    .split(",")
    .map((x) => String(x).trim())
    .filter(Boolean);
}

function normalizeNestedPrefixes(obj) {
  if (!obj || typeof obj !== "object") return obj;

  const clone = { ...obj };

  const normalizeOne = (nested, prefix) => {
    if (!nested || typeof nested !== "object") return nested;
    const out = {};
    for (const key of Object.keys(nested)) {
      let newKey = key;
      if (prefix && key.startsWith(prefix + "_")) {
        newKey = key.slice(prefix.length + 1);
      } else if (prefix && key.startsWith(prefix)) {
        let rest = key.slice(prefix.length);
        if (rest.startsWith("_")) rest = rest.slice(1);
        if (rest) newKey = rest;
      }
      out[newKey] = nested[key];
    }
    return out;
  };

  if (clone.merged && typeof clone.merged === "object") {
    clone.merged = normalizeOne(clone.merged, "merged");
  }
  if (clone.linked && typeof clone.linked === "object") {
    clone.linked = normalizeOne(clone.linked, "linked");
  }

  for (const key of Object.keys(obj)) {
    if (key.startsWith("merged_")) {
      clone.merged = clone.merged || {};
      const nk = key.slice("merged_".length);
      if (clone.merged[nk] === undefined) clone.merged[nk] = obj[key];
      delete clone[key];
    } else if (key.startsWith("linked_")) {
      clone.linked = clone.linked || {};
      const nk = key.slice("linked_".length);
      if (clone.linked[nk] === undefined) clone.linked[nk] = obj[key];
      delete clone[key];
    }
  }

  return clone;
}

/* =========================================================
   Resolve indices (env first, then fallbacks)
   ========================================================= */
async function resolveIndices() {
  const candidates = [];

  if (process.env.OPENSEARCH_LEADS_INDEX) {
    candidates.push(process.env.OPENSEARCH_LEADS_INDEX);
  }

  if (process.env.OPENSEARCH_FALLBACK_INDEXES) {
    const envList = String(process.env.OPENSEARCH_FALLBACK_INDEXES)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    candidates.push(...envList);
  }

  candidates.push("linked_in_usa_data", "merged_index_v1", "usa_companies_data");

  const unique = [...new Set(candidates)];
  const found = [];

  for (const idx of unique) {
    try {
      const exists = await client.indices.exists({ index: idx });
      const ok =
        exists === true ||
        exists?.body === true ||
        exists?.body === undefined;
      if (ok) found.push(idx);
    } catch (e) {
      console.warn(`Index check failed for ${idx}:`, e?.message || e);
    }
  }

  return { indices: found, tried: unique };
}

/* =========================================================
   Exact match helpers (filters MUST be exact)
   ========================================================= */
function exactTextClauses(field, value) {
  const v = sanitizeQ(value);
  if (!v) return [];

  // Try keyword, then plain term, then match_phrase
  return [
    { term: { [`${field}.keyword`]: v } },
    { term: { [field]: v } },
    { match_phrase: { [field]: v } },
  ];
}

function exactAnyCaseField(field, value) {
  const v = sanitizeQ(value);
  if (!v) return null;
  const upper = v.toUpperCase();
  const lower = v.toLowerCase();
  return {
    bool: {
      should: [
        { term: { [`${field}.keyword`]: upper } },
        { term: { [`${field}.keyword`]: lower } },
        { term: { [field]: upper } },
        { term: { [field]: lower } },
        { match_phrase: { [field]: v } },
      ],
      minimum_should_match: 1,
    },
  };
}

/* =========================================================
   Token contains helpers (for GLOBAL q only, unordered tokens)
   Fixes: "inna mesh" should match even if order is "mesh inna"
   ========================================================= */
function splitTokens(value) {
  const raw = sanitizeQ(value);
  if (!raw) return [];
  return raw
    .split(/\s+/g)
    .map((t) => t.trim())
    .filter(Boolean);
}

function escapeLuceneRegex(value) {
  return String(value).replace(/[.?+*|{}[\]()"'\\^$-]/g, "\\$&");
}

function containsTokenRegexp(field, token) {
  const t = escapeLuceneRegex(token);
  return {
    regexp: {
      [field]: {
        value: `.*${t}.*`,
        case_insensitive: true,
      },
    },
  };
}

// For a single field, require ALL tokens (any order) inside that field
function fieldContainsAllTokens(field, tokens) {
  if (!tokens || !tokens.length) return null;
  return {
    bool: {
      must: tokens.map((tok) => containsTokenRegexp(field, tok)),
    },
  };
}

// For global q: OR across fields, but inside a field, require all tokens
function addGlobalQMust(mustArr, qVal) {
  const tokens = splitTokens(qVal);
  if (!tokens.length) return;

  const Q_FIELDS = [
    "merged.Name",
    "merged.normalized_full_name",
    "merged.Company",
    "merged.normalized_company_name",
    "merged.City",
    "merged.Web_Address",
    "merged.normalized_website",
    "merged.Email",
    "merged.normalized_email",
    "linked.Full_name",
    "linked.Industry",
    "linked.Job_title",
    "linked.Emails",
    "linked.Company_Name",
    "linked.Locality",
    "linked.Skills",
  ];

  const should = [];
  for (const f of Q_FIELDS) {
    const clause = fieldContainsAllTokens(f, tokens);
    if (clause) should.push(clause);
  }

  if (!should.length) return;

  mustArr.push({
    bool: {
      should,
      minimum_should_match: 1,
    },
  });
}

/* =========================================================
   normalized_email (exact first)
   Must match: merged.Email OR merged.normalized_email OR linked.Emails OR linked.normalized_email
   ========================================================= */
function normalizeEmailInput(v) {
  if (v === undefined || v === null) return "";
  const s = String(v).trim();
  try {
    return decodeURIComponent(s).trim().toLowerCase();
  } catch {
    return s.toLowerCase();
  }
}

function addNormalizedEmailFilter(filterArr, normalizedEmailParam) {
  const emailQ = normalizeEmailInput(normalizedEmailParam);
  if (!emailQ) return;

  const EMAIL_FIELDS = [
    "merged.Email",
    "merged.normalized_email",
    "linked.Emails",
    "linked.normalized_email",
    "normalized_email",
  ];

  const should = [];
  for (const f of EMAIL_FIELDS) {
    should.push(...exactTextClauses(f, emailQ));
  }

  if (!should.length) return;

  filterArr.push({
    bool: {
      should,
      minimum_should_match: 1,
    },
  });
}

/* =========================================================
   phone filter (exact-ish)
   ========================================================= */
function normalizePhone(v) {
  const s = sanitizeQ(v);
  if (!s) return "";
  // Keep digits only
  const digits = s.replace(/[^\d]/g, "");
  return digits;
}

function phoneClauses(field, digits) {
  if (!digits) return [];
  // exact on keyword, and also allow wildcard for formats like "+1 (xxx) xxx-xxxx"
  return [
    { term: { [`${field}.keyword`]: digits } },
    { term: { [field]: digits } },
    { match_phrase: { [field]: digits } },
    { wildcard: { [`${field}.keyword`]: `*${digits}*` } },
    { wildcard: { [field]: `*${digits}*` } },
  ];
}

function addPhoneFilter(filterArr, phoneParam) {
  const digits = normalizePhone(phoneParam);
  if (!digits) return;

  const PHONE_FIELDS = [
    "merged.Telephone_Number",
    "merged.Phone",
    "linked.Phone_numbers",
    "linked.Mobile",
    "phone",
  ];

  const should = [];
  for (const f of PHONE_FIELDS) {
    should.push(...phoneClauses(f, digits));
  }

  if (!should.length) return;

  filterArr.push({
    bool: {
      should,
      minimum_should_match: 1,
    },
  });
}

/* =========================================================
   domain filter (exact for domain; also matches inside full URL)
   ========================================================= */
function normalizeDomain(v) {
  const s = sanitizeQ(v).toLowerCase();
  if (!s) return "";
  // strip protocol
  let d = s.replace(/^https?:\/\//i, "");
  // strip path
  d = d.split("/")[0];
  // strip leading www.
  d = d.replace(/^www\./i, "");
  return d.trim();
}

function domainClauses(field, domain) {
  if (!domain) return [];
  // exact on keyword and also allow wildcard for URLs
  return [
    { term: { [`${field}.keyword`]: domain } },
    { term: { [field]: domain } },
    { match_phrase: { [field]: domain } },
    { wildcard: { [`${field}.keyword`]: `*${domain}*` } },
    { wildcard: { [field]: `*${domain}*` } },
  ];
}

function addDomainFilter(filterArr, domainParam) {
  const domain = normalizeDomain(domainParam);
  if (!domain) return;

  const DOMAIN_FIELDS = [
    "merged.normalized_website",
    "merged.Web_Address",
    "linked.Company_Website",
    "website",
    "domain",
  ];

  const should = [];
  for (const f of DOMAIN_FIELDS) {
    should.push(...domainClauses(f, domain));
  }

  if (!should.length) return;

  filterArr.push({
    bool: {
      should,
      minimum_should_match: 1,
    },
  });
}

/* =========================================================
   Exact filter helper: should across multiple fields
   ========================================================= */
function addExactFilterShould(filterArr, fields, value) {
  const v = sanitizeQ(value);
  if (!v) return;

  const should = [];
  for (const f of fields) {
    should.push(...exactTextClauses(f, v));
  }

  if (!should.length) return;

  filterArr.push({
    bool: {
      should,
      minimum_should_match: 1,
    },
  });
}

/* =========================================================
   Build Query:
   - If q exists => MUST global match (unordered tokens)
   - Then apply filters in FILTER[] (EXACT)
   - If nothing => match_all
   ========================================================= */
function buildLeadsQuery(reqQuery) {
  const must = [];
  const filter = [];

  /* ---------- 1) GLOBAL q (unordered tokens; fixes "inna mesh") ---------- */
  const qVal = sanitizeQ(reqQuery?.q);
  if (qVal) addGlobalQMust(must, qVal);

  /* ---------- 2) FILTERS (EXACT matching) ---------- */
  addNormalizedEmailFilter(filter, reqQuery?.normalized_email);
  addPhoneFilter(filter, reqQuery?.phone);

  // domain (your SearchByDomain page)
  if (sanitizeQ(reqQuery?.domain)) {
    addDomainFilter(filter, reqQuery.domain);
  }

  // company_name -> merged.Company, merged.normalized_company_name, linked.Company_Name
  addExactFilterShould(
    filter,
    ["merged.Company", "merged.normalized_company_name", "linked.Company_Name"],
    reqQuery?.company_name
  );

  // city -> merged.City, linked.Locality
  addExactFilterShould(filter, ["merged.City", "linked.Locality"], reqQuery?.city);

  // zip_code -> merged.Zip (exact first)
  if (sanitizeQ(reqQuery?.zip_code)) {
    const z = sanitizeQ(reqQuery.zip_code);
    filter.push({
      bool: {
        should: [
          { term: { "merged.Zip.keyword": z } },
          { term: { "merged.Zip": z } },
          { match_phrase: { "merged.Zip": z } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  // website -> merged.Web_Address, merged.normalized_website
  addExactFilterShould(
    filter,
    ["merged.Web_Address", "merged.normalized_website", "linked.Company_Website"],
    reqQuery?.website
  );

  // contact_full_name -> linked.Full_name, merged.Name, merged.normalized_full_name
  addExactFilterShould(
    filter,
    ["linked.Full_name", "merged.Name", "merged.normalized_full_name"],
    reqQuery?.contact_full_name
  );

  // state_code (comma list) -> merged.State, linked.normalized_state
  const states = listFromComma(reqQuery?.state_code);
  if (states.length) {
    const shouldStates = [];
    for (const st of states) {
      const stVal = sanitizeQ(st);
      if (!stVal) continue;

      const t1 = exactAnyCaseField("merged.State", stVal);
      const t2 = exactAnyCaseField("linked.normalized_state", stVal);
      const t3 = exactAnyCaseField("merged.normalized_state", stVal);

      if (t1) shouldStates.push(t1);
      if (t2) shouldStates.push(t2);
      if (t3) shouldStates.push(t3);
    }

    if (shouldStates.length) {
      filter.push({
        bool: {
          should: shouldStates,
          minimum_should_match: 1,
        },
      });
    }
  }

  // job_title -> linked.Job_title, merged.Title_Full
  addExactFilterShould(
    filter,
    ["linked.Job_title", "merged.Title_Full"],
    reqQuery?.job_title
  );

  // skills (comma list or free text)
  // If "skills" exists, treat as list; if "skills_tokens" exists, treat as contains-all-tokens inside linked.Skills
  const skills = listFromComma(reqQuery?.skills);
  if (skills.length) {
    const should = [];
    for (const sk of skills) {
      const v = sanitizeQ(sk);
      if (!v) continue;
      should.push(...exactTextClauses("linked.Skills", v));
      should.push(...exactTextClauses("merged.Skills", v));
    }
    if (should.length) {
      filter.push({ bool: { should, minimum_should_match: 1 } });
    }
  }

  if (sanitizeQ(reqQuery?.skills_tokens)) {
    const toks = splitTokens(reqQuery.skills_tokens);
    if (toks.length) {
      filter.push({
        bool: {
          should: [
            fieldContainsAllTokens("linked.Skills", toks),
            fieldContainsAllTokens("merged.Skills", toks),
          ].filter(Boolean),
          minimum_should_match: 1,
        },
      });
    }
  }

  /* ---------- 3) Final query ---------- */
  if (!must.length && !filter.length) return { match_all: {} };

  const bool = {};
  if (must.length) bool.must = must;
  if (filter.length) bool.filter = filter;

  return { bool };
}

/* =========================================================
   Controller: GET /api/data/leads
   ========================================================= */
async function getLeads(req, res) {
  try {
    const { indices, tried } = await resolveIndices();
    if (!indices || indices.length === 0) {
      return res
        .status(500)
        .json({ message: "No OpenSearch index found", tried });
    }

    const { limit, offset } = parseLimitOffset(req);

    let searchIndex = indices;
    if (req.query?.index) {
      const requested = String(req.query.index)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const allowed = requested.filter((r) => indices.includes(r));
      if (allowed.length) searchIndex = allowed;
    }

    const indexParam = Array.isArray(searchIndex)
      ? searchIndex.join(",")
      : searchIndex;

    const esQuery = buildLeadsQuery(req.query);

    const searchParams = {
      index: indexParam,
      body: {
        query: esQuery,
        track_total_hits: true,
      },
      from: offset,
      size: limit,
    };

    const resp = await client.search(searchParams);
    const body = resp?.body || resp;

    const hits = body?.hits?.hits || [];
    const totalObj = body?.hits?.total;

    let total = 0;
    if (typeof totalObj === "object" && totalObj !== null) {
      total = Number(totalObj.value || 0);
    } else {
      total = Number(totalObj || 0);
    }

    const rows = hits.map((h) => {
      const source = { _id: h._id, ...(h._source || {}) };
      return normalizeNestedPrefixes(source);
    });

    return res.json({
      meta: {
        index: indexParam,
        total,
        from: offset,
        size: limit,
      },
      data: rows,
    });
  } catch (err) {
    console.error("getLeads error:", err?.message || err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* =========================================================
   Controller: GET /api/data/leads/export
   - Keep export as ALL docs (match_all)
   ========================================================= */
async function exportLeads(req, res) {
  try {
    const { indices, tried } = await resolveIndices();
    if (!indices || indices.length === 0) {
      return res
        .status(500)
        .json({ message: "No OpenSearch index found", tried });
    }

    const indexParam = indices.join(",");

    const PAGE_SIZE = 5000;
    const allRows = [];
    let searchAfter = null;

    while (true) {
      const body = {
        query: { match_all: {} },
        size: PAGE_SIZE,
        sort: [{ _id: "asc" }],
      };

      if (searchAfter) body.search_after = searchAfter;

      const resp = await client.search({ index: indexParam, body });
      const b = resp?.body || resp;
      const hits = b?.hits?.hits || [];
      if (!hits.length) break;

      for (const h of hits) {
        const source = { _id: h._id, ...(h._source || {}) };
        allRows.push(normalizeNestedPrefixes(source));
      }

      searchAfter = hits[hits.length - 1].sort;
    }

    return res.json({
      meta: { total: allRows.length },
      data: allRows,
    });
  } catch (err) {
    console.error("exportLeads error:", err?.message || err);
    return res.status(500).json({ message: "Export failed" });
  }
}

/* =========================================================
   Optional: GET /api/data/lead/:id
   ========================================================= */
async function getLeadById(req, res) {
  try {
    const { indices, tried } = await resolveIndices();
    if (!indices || indices.length === 0) {
      return res
        .status(500)
        .json({ message: "No OpenSearch index found", tried });
    }

    const id = req.params?.id;
    if (!id) return res.status(400).json({ message: "Missing id" });

    const indexParam = indices.join(",");

    const resp = await client.search({
      index: indexParam,
      body: {
        size: 1,
        query: { ids: { values: [id] } },
      },
    });

    const body = resp?.body || resp;
    const hit = body?.hits?.hits?.[0];
    if (!hit) return res.status(404).json({ message: "Not found" });

    const source = { _id: hit._id, ...(hit._source || {}) };
    return res.json({ data: normalizeNestedPrefixes(source) });
  } catch (err) {
    console.error("getLeadById error:", err?.message || err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  getLeads,
  exportLeads,
  getLeadById,
};
