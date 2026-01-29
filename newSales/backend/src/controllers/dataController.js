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
      const ok = exists === true || exists?.body === true || exists?.body === undefined;
      if (ok) found.push(idx);
    } catch (e) {
      console.warn(`Index check failed for ${idx}:`, e?.message || e);
    }
  }

  return { indices: found, tried: unique };
}

/* =========================================================
   ✅ FULL STRING PHRASE MATCH HELPERS
   ========================================================= */
function fullPhraseClauses(field, value) {
  const v = sanitizeQ(value);
  if (!v) return [];

  const upper = v.toUpperCase();
  const lower = v.toLowerCase();

  return [
    { term: { [`${field}.keyword`]: v } },
    { term: { [`${field}.keyword`]: upper } },
    { term: { [`${field}.keyword`]: lower } },
    { match_phrase: { [field]: v } },
  ];
}

function addFullPhraseFilterShould(filterArr, fields, value) {
  const v = sanitizeQ(value);
  if (!v) return;

  const should = [];
  for (const f of fields) should.push(...fullPhraseClauses(f, v));
  if (!should.length) return;

  filterArr.push({
    bool: { should, minimum_should_match: 1 },
  });
}

/* =========================================================
   normalized_email (exact)
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
    should.push({ term: { [`${f}.keyword`]: emailQ } });
    should.push({ term: { [f]: emailQ } });
    should.push({ match_phrase: { [f]: emailQ } });
  }

  if (!should.length) return;

  filterArr.push({ bool: { should, minimum_should_match: 1 } });
}

/* =========================================================
   phone filter (exact-ish)
   ========================================================= */
function normalizePhone(v) {
  const s = sanitizeQ(v);
  if (!s) return "";
  return s.replace(/[^\d]/g, "");
}

function phoneClauses(field, digits) {
  if (!digits) return [];
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
  for (const f of PHONE_FIELDS) should.push(...phoneClauses(f, digits));
  if (!should.length) return;

  filterArr.push({ bool: { should, minimum_should_match: 1 } });
}

/* =========================================================
   domain filter
   ========================================================= */
function normalizeDomain(v) {
  const s = sanitizeQ(v).toLowerCase();
  if (!s) return "";
  let d = s.replace(/^https?:\/\//i, "");
  d = d.split("/")[0];
  d = d.replace(/^www\./i, "");
  return d.trim();
}

function domainClauses(field, domain) {
  if (!domain) return [];
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
  for (const f of DOMAIN_FIELDS) should.push(...domainClauses(f, domain));
  if (!should.length) return;

  filterArr.push({ bool: { should, minimum_should_match: 1 } });
}

/* =========================================================
   ✅ GLOBAL q must full phrase
   ========================================================= */
function addGlobalQMustFullPhrase(mustArr, qVal) {
  const v = sanitizeQ(qVal);
  if (!v) return;

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
  for (const f of Q_FIELDS) should.push(...fullPhraseClauses(f, v));
  if (!should.length) return;

  mustArr.push({ bool: { should, minimum_should_match: 1 } });
}

/* =========================================================
   Build Query (used by getLeads + export)
   ========================================================= */
function buildLeadsQuery(reqQuery) {
  const must = [];
  const filter = [];

  const qVal = sanitizeQ(reqQuery?.q);
  if (qVal) addGlobalQMustFullPhrase(must, qVal);

  addNormalizedEmailFilter(filter, reqQuery?.normalized_email);
  addPhoneFilter(filter, reqQuery?.phone);

  if (sanitizeQ(reqQuery?.domain)) addDomainFilter(filter, reqQuery.domain);

  addFullPhraseFilterShould(
    filter,
    ["merged.Company", "merged.normalized_company_name", "linked.Company_Name"],
    reqQuery?.company_name
  );

  addFullPhraseFilterShould(
    filter,
    ["merged.City", "linked.Locality", "merged.normalized_city", "linked.normalized_city"],
    reqQuery?.city
  );

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

  addFullPhraseFilterShould(
    filter,
    ["merged.Web_Address", "merged.normalized_website", "linked.Company_Website"],
    reqQuery?.website
  );

  addFullPhraseFilterShould(
    filter,
    ["linked.Full_name", "merged.Name", "merged.normalized_full_name"],
    reqQuery?.contact_full_name
  );

  const states = listFromComma(reqQuery?.state_code);
  if (states.length) {
    const shouldStates = [];
    for (const st of states) {
      const stVal = sanitizeQ(st);
      if (!stVal) continue;
      const upper = stVal.toUpperCase();
      const lower = stVal.toLowerCase();

      shouldStates.push({ term: { "merged.State.keyword": upper } });
      shouldStates.push({ term: { "merged.State.keyword": lower } });
      shouldStates.push({ term: { "linked.normalized_state.keyword": upper } });
      shouldStates.push({ term: { "linked.normalized_state.keyword": lower } });
      shouldStates.push({ term: { "merged.normalized_state.keyword": upper } });
      shouldStates.push({ term: { "merged.normalized_state.keyword": lower } });
      shouldStates.push({ match_phrase: { "merged.State": stVal } });
      shouldStates.push({ match_phrase: { "linked.normalized_state": stVal } });
      shouldStates.push({ match_phrase: { "merged.normalized_state": stVal } });
    }

    if (shouldStates.length) {
      filter.push({ bool: { should: shouldStates, minimum_should_match: 1 } });
    }
  }

  addFullPhraseFilterShould(
    filter,
    ["linked.Job_title", "merged.Title_Full"],
    reqQuery?.job_title
  );

  const skills = listFromComma(reqQuery?.skills);
  if (skills.length) {
    const should = [];
    for (const sk of skills) {
      const v = sanitizeQ(sk);
      if (!v) continue;
      should.push(...fullPhraseClauses("linked.Skills", v));
      should.push(...fullPhraseClauses("merged.Skills", v));
    }
    if (should.length) filter.push({ bool: { should, minimum_should_match: 1 } });
  }

  if (sanitizeQ(reqQuery?.skills_tokens)) {
    const v = sanitizeQ(reqQuery.skills_tokens);
    filter.push({
      bool: {
        should: [
          ...fullPhraseClauses("linked.Skills", v),
          ...fullPhraseClauses("merged.Skills", v),
        ],
        minimum_should_match: 1,
      },
    });
  }

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
      return res.status(500).json({ message: "No OpenSearch index found", tried });
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

    const indexParam = Array.isArray(searchIndex) ? searchIndex.join(",") : searchIndex;
    const esQuery = buildLeadsQuery(req.query);

    const resp = await client.search({
      index: indexParam,
      body: { query: esQuery, track_total_hits: true },
      from: offset,
      size: limit,
    });

    const body = resp?.body || resp;
    const hits = body?.hits?.hits || [];
    const totalObj = body?.hits?.total;

    const total =
      typeof totalObj === "object" && totalObj !== null
        ? Number(totalObj.value || 0)
        : Number(totalObj || 0);

    const rows = hits.map((h) => {
      const source = { _id: h._id, ...(h._source || {}) };
      return normalizeNestedPrefixes(source);
    });

    return res.json({
      meta: { index: indexParam, total, from: offset, size: limit },
      data: rows,
    });
  } catch (err) {
    console.error("getLeads error:", err?.message || err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* =========================================================
   Controller: GET /api/data/leads/export (kept)
   ========================================================= */
async function exportLeads(req, res) {
  try {
    const { indices, tried } = await resolveIndices();
    if (!indices || indices.length === 0) {
      return res.status(500).json({ message: "No OpenSearch index found", tried });
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

    return res.json({ meta: { total: allRows.length }, data: allRows });
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
      return res.status(500).json({ message: "No OpenSearch index found", tried });
    }

    const id = req.params?.id;
    if (!id) return res.status(400).json({ message: "Missing id" });

    const indexParam = indices.join(",");

    const resp = await client.search({
      index: indexParam,
      body: { size: 1, query: { ids: { values: [id] } } },
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

  // ✅ IMPORTANT: export helpers so exportController can reuse exact logic
  resolveIndices,
  buildLeadsQuery,
  normalizeNestedPrefixes,
};
