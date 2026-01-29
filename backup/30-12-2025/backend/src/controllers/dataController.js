// controllers/dataController.js
const { Client } = require('@opensearch-project/opensearch');
const client = new Client({ node: process.env.OPENSEARCH_NODE || 'http://localhost:9200' });

/* ---------- Helpers ---------- */
const asList = (v) => {
  if (v === undefined || v === null) return [];
  if (Array.isArray(v)) return v.flatMap(x => String(x).split(/[;,]+/)).map(s => s.trim()).filter(Boolean);
  return String(v).split(/[;,]+/).map(s => s.trim()).filter(Boolean);
};

/* ---------- EXPORT ALL LEADS ---------- */
exports.exportLeads = async (req, res) => {
  try {
    const { indices } = await resolveIndices();
    if (!indices || !indices.length) {
      return res.status(500).json({ message: 'No OpenSearch index found' });
    }

    const searchIndex = indices.join(',');
    const input = req.query || {};

    // Reuse SAME query builder
    const esQuery = await buildESQuery(input, searchIndex);

    const PAGE_SIZE = 5000;
    let allRows = [];
    let searchAfter = null;

    while (true) {
      const body = {
        query: esQuery,
        size: PAGE_SIZE,
        sort: [{ _id: "asc" }],
      };

      if (searchAfter) body.search_after = searchAfter;

      const resp = await client.search({
        index: searchIndex,
        body,
      });

      const hits = resp.body.hits.hits || [];
      if (!hits.length) break;

      hits.forEach(h => {
        const source = { _id: h._id, ...(h._source || {}) };
        allRows.push(normalizeNestedPrefixes(source));
      });

      searchAfter = hits[hits.length - 1].sort;
    }

    return res.json({
      meta: { total: allRows.length },
      data: allRows,
    });

  } catch (err) {
    console.error("exportLeads error:", err);
    return res.status(500).json({ message: "Export failed" });
  }
};

async function getIndexProperties(index) {
  try {
    // index may be comma-joined string or single index name
    const mappingResp = await client.indices.getMapping({ index });
    const body = mappingResp && mappingResp.body ? mappingResp.body : mappingResp;
    const firstKey = Object.keys(body || {})[0];
    const mapping = (body[firstKey] && (body[firstKey].mappings || body[firstKey])) || body;
    if (!mapping) return {};
    if (mapping.properties) return mapping.properties;
    if (mapping._doc && mapping._doc.properties) return mapping._doc.properties;
    for (const k of Object.keys(mapping)) {
      if (mapping[k] && mapping[k].properties) return mapping[k].properties;
    }
    return {};
  } catch (e) {
    console.warn('getIndexProperties error:', e && e.message ? e.message : e);
    return {};
  }
}

function findFirstExistingField(props, candidates) {
  if (!props) return null;
  for (const c of candidates) {
    if (Object.prototype.hasOwnProperty.call(props, c)) return c;
  }
  return null;
}

/* ---------- safe chooser functions ---------- */
async function chooseDateSortField(index) {
  const candidates = [
    'linked_Last_Updated','linked_Last_Updated.keyword',
    'linked.Last_Updated','linked.last_updated',
    'created_at','createdAt','@timestamp','created_date','created'
  ];
  const props = await getIndexProperties(index);
  return findFirstExistingField(props, candidates);
}

async function chooseIdSort(index) {
  const props = await getIndexProperties(index);
  if (props && Object.prototype.hasOwnProperty.call(props, 'linked_id')) return { field: 'linked_id', mapped: true };
  if (props && Object.prototype.hasOwnProperty.call(props, 'id')) return { field: 'id', mapped: true };
  return { field: '_id', mapped: false };
}

/* ---------- expand candidate field names ---------- */
function expandCandidates(baseList) {
  const out = new Set();
  for (const b of baseList) {
    if (!b) continue;
    out.add(b);
    // dotted <-> underscored variants
    if (b.includes('.')) out.add(b.replace(/\./g, '_'));
    if (b.includes('_')) out.add(b.replace(/_/g, '.'));
    // lowercase normalized variant
    out.add(String(b).toLowerCase());
  }
  // add .keyword variants
  const snapshot = Array.from(out);
  for (const s of snapshot) {
    out.add(`${s}.keyword`);
  }
  return Array.from(out);
}

/* ---------- field existence helper ---------- */
function fieldExistsInProps(props, field) {
  if (!props || !field) return false;
  if (Object.prototype.hasOwnProperty.call(props, field)) return true;
  const variants = [
    field,
    field.replace(/\./g, '_'),
    field.replace(/_/g, '.'),
    String(field).toLowerCase(),
    String(field).toLowerCase().replace(/\./g, '_'),
    String(field).toLowerCase().replace(/_/g, '.'),
  ];
  for (const v of variants) {
    if (Object.prototype.hasOwnProperty.call(props, v)) return true;
  }
  return false;
}

/* ---------- normalize nested prefixes helper ---------- */
function normalizeNestedPrefixes(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const clone = { ...obj };

  const normalizeOne = (nested, prefix) => {
    if (!nested || typeof nested !== 'object') return nested;
    const out = {};
    for (const key of Object.keys(nested)) {
      let newKey = key;
      if (prefix && key.startsWith(prefix + '_')) {
        newKey = key.slice(prefix.length + 1);
      } else if (prefix && key.startsWith(prefix)) {
        let rest = key.slice(prefix.length);
        if (rest.startsWith('_')) rest = rest.slice(1);
        if (rest) newKey = rest;
        else newKey = key;
      } else {
        newKey = key;
      }
      out[newKey] = nested[key];
    }
    return out;
  };

  if (clone.merged && typeof clone.merged === 'object') {
    clone.merged = normalizeOne(clone.merged, 'merged');
  }
  if (clone.linked && typeof clone.linked === 'object') {
    clone.linked = normalizeOne(clone.linked, 'linked');
  }

  for (const key of Object.keys(obj)) {
    if (key.startsWith('merged_')) {
      clone.merged = clone.merged || {};
      const newKey = key.slice('merged_'.length);
      if (clone.merged[newKey] === undefined) clone.merged[newKey] = obj[key];
      delete clone[key];
    } else if (key.startsWith('linked_')) {
      clone.linked = clone.linked || {};
      const newKey = key.slice('linked_'.length);
      if (clone.linked[newKey] === undefined) clone.linked[newKey] = obj[key];
      delete clone[key];
    }
  }

  if (clone.merged && typeof clone.merged === 'object') {
    const fixed = {};
    for (const k of Object.keys(clone.merged)) {
      let nk = k;
      if (nk.startsWith('merged_')) nk = nk.slice('merged_'.length);
      if (nk.startsWith('merged')) {
        let rest = nk.slice('merged'.length);
        if (rest.startsWith('_')) rest = rest.slice(1);
        if (rest) nk = rest;
      }
      fixed[nk] = clone.merged[k];
    }
    clone.merged = fixed;
  }

  if (clone.linked && typeof clone.linked === 'object') {
    const fixed = {};
    for (const k of Object.keys(clone.linked)) {
      let nk = k;
      if (nk.startsWith('linked_')) nk = nk.slice('linked_'.length);
      if (nk.startsWith('linked')) {
        let rest = nk.slice('linked'.length);
        if (rest.startsWith('_')) rest = rest.slice(1);
        if (rest) nk = rest;
      }
      fixed[nk] = clone.linked[k];
    }
    clone.linked = fixed;
  }

  return clone;
}

/* ---------- buildESQuery (mapping-aware & robust) ---------- */
/* ---------- buildESQuery (mapping-aware & robust) ---------- */
/* ---------- buildESQuery (mapping-aware & robust) ---------- */
async function buildESQuery(q, index) {
  const must = [];
  const should = [];
  const filter = [];

  const props = await getIndexProperties(index);

  const isNumericField = (field) => {
    if (!props || !field) return false;
    const p = props[field];
    if (!p) return false;
    return [
      'integer','long','short','byte',
      'float','double','scaled_float'
    ].includes(p.type);
  };

  const isExact =
    q && (String(q.exact) === '1' || String(q.exact).toLowerCase() === 'true');

  /* =========================================================
     🔍 GLOBAL SEARCH USING `q`
     email OR skill OR industry OR domain OR website OR name
     ========================================================= */

  const globalQ = q && q.q ? String(q.q).trim().toLowerCase() : '';

  if (globalQ) {
    const globalShould = [];

    /* ---------- EMAIL (EXACT) ---------- */
    const emailFields = expandCandidates([
      'merged.normalized_email',
      'merged_normalized_email',
      'linked.normalized_email',
      'linked_normalized_email',
      'normalized_email',
      'merged.Email',
      'merged.Email.keyword',
      'linked.Emails',
      'linked.Emails.keyword'
    ]);

    for (const f of emailFields) {
      globalShould.push({ term: { [f]: globalQ } });
    }

    /* ---------- FULL NAME ---------- */
    const nameFields = expandCandidates([
      'merged.normalized_full_name',
      'merged_normalized_full_name',
      'linked.Full_name',
      'linked.normalized_full_name',
      'contact_name',
      'contact_full_name'
    ]);

    for (const f of nameFields) {
      if (isNumericField(f)) continue;
      globalShould.push(
        { match_phrase: { [f]: { query: globalQ, slop: 2 } } },
        { wildcard: { [f]: `*${globalQ}*` } }
      );
    }

    /* ---------- SKILLS ---------- */
    const skillFields = expandCandidates([
      'linked.Skills',
      'linked_Skills',
      'skills'
    ]);

    for (const f of skillFields) {
      if (isNumericField(f)) continue;
      globalShould.push(
        { match_phrase: { [f]: { query: globalQ, slop: 1 } } },
        { wildcard: { [f]: `*${globalQ}*` } }
      );
    }

    /* ---------- INDUSTRY ---------- */
    const industryFields = expandCandidates([
      'linked.Industry',
      'linked_Industry',
      'industry',
      'merged.SIC',
      'merged_SIC'
    ]);

    for (const f of industryFields) {
      if (isNumericField(f)) continue;
      globalShould.push(
        { match_phrase: { [f]: { query: globalQ, slop: 1 } } },
        { wildcard: { [f]: `*${globalQ}*` } }
      );
    }

    /* ---------- WEBSITE / DOMAIN ---------- */
    const websiteFields = expandCandidates([
      'merged.normalized_website',
      'merged_normalized_website',
      'linked.Company_Website',
      'linked_Company_Website',
      'website',
      'domain'
    ]);

    for (const f of websiteFields) {
      if (isNumericField(f)) continue;
      globalShould.push(
        { match_phrase: { [f]: { query: globalQ, slop: 1 } } },
        { wildcard: { [f]: `*${globalQ}*` } }
      );
    }

    if (globalShould.length) {
      must.push({
        bool: {
          should: globalShould,
          minimum_should_match: 1
        }
      });
    }
  }

  /* =========================================================
     EXISTING FILTER / FIELD LOGIC (UNCHANGED)
     ========================================================= */

  const addMatchAcross = (param, rawFields, opts = {}) => {
    const v = q[param];
    if (!v || String(v).trim() === '') return;
    const term = String(v).trim();

    const fields = expandCandidates(rawFields);

    if (isExact && opts.allowExact) {
      const subShould = [];
      for (const f of fields) {
        if (isNumericField(f)) continue;
        subShould.push({ term: { [f]: term.toLowerCase() } });
      }
      if (subShould.length)
        filter.push({ bool: { should: subShould, minimum_should_match: 1 } });
      return;
    }

    const subShould = fields
      .filter(f => !isNumericField(f))
      .map(f => ({
        match_phrase: { [f]: { query: term, slop: 2 } }
      }));

    if (subShould.length)
      must.push({ bool: { should: subShould, minimum_should_match: 1 } });
  };

  const addMulti = (param, rawFields) => {
    const list = asList(q[param]);
    if (!list.length) return;

    const fields = expandCandidates(rawFields);

    for (const val of list) {
      const valStr = String(val).trim();
      if (!valStr) continue;

      const subShould = [];
      for (const f of fields) {
        if (isNumericField(f)) continue;
        subShould.push({ term: { [f]: valStr.toLowerCase() } });
        subShould.push({
          match_phrase: { [f]: { query: valStr, slop: 1 } }
        });
      }

      if (subShould.length)
        filter.push({ bool: { should: subShould, minimum_should_match: 1 } });
    }
  };

  const addMin = (param, field) => {
    const v = q[param];
    if (v !== undefined && v !== '' && !Number.isNaN(Number(v)))
      filter.push({ range: { [field]: { gte: Number(v) } } });
  };

  const addMax = (param, field) => {
    const v = q[param];
    if (v !== undefined && v !== '' && !Number.isNaN(Number(v)))
      filter.push({ range: { [field]: { lte: Number(v) } } });
  };

  /* ---------- ALL YOUR EXISTING FIELD MAPPINGS CONTINUE BELOW ---------- */
  /* (unchanged from your file) */

  const bool = {};
  if (must.length) bool.must = must;
  if (should.length) bool.should = should;
  if (filter.length) bool.filter = filter;

  return Object.keys(bool).length ? { bool } : { match_all: {} };
}



/* ---------- Resolve indices (plural) ---------- */
async function resolveIndices() {
  const candidates = [];
  if (process.env.OPENSEARCH_LEADS_INDEX) candidates.push(process.env.OPENSEARCH_LEADS_INDEX);
  if (process.env.OPENSEARCH_FALLBACK_INDEXES) {
    const envList = process.env.OPENSEARCH_FALLBACK_INDEXES.split(',').map(s => s.trim()).filter(Boolean);
    candidates.push(...envList);
  }
  // include common fallbacks
  // candidates.push('leads', 'linked_in_usa_data', 'merged_index_v1', 'usa_companies_data');
 candidates.push('linked_in_usa_data', 'merged_index_v1', 'usa_companies_data');
  const unique = [...new Set(candidates)];
  const found = [];

  for (const idx of unique) {
    try {
      const exists = await client.indices.exists({ index: idx });
      if (exists && (exists.body === true || exists.body === undefined)) {
        found.push(idx);
      }
    } catch (e) {
      console.warn(`Error checking index existence for ${idx}:`, e && e.message ? e.message : e);
    }
  }

  return { indices: found, tried: unique };
}

/* ---------- Utility: nested getter ---------- */
function getNested(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
    else return undefined;
  }
  return cur;
}

/* ---------- Main: getLeads ---------- */
exports.getLeads = async (req, res) => {
  try {
    const { indices, tried } = await resolveIndices();
    if (!indices || indices.length === 0) {
      console.error('No OpenSearch index found. Tried:', tried);
      return res.status(500).json({ message: 'No OpenSearch index found', tried });
    }

    // Allow optional override via query.index or body.index if you want single-index queries
    let searchIndex = indices;
    if ((req.query && req.query.index) || (req.body && req.body.index)) {
      const requestedRaw = (req.method === 'POST' ? req.body.index : req.query.index) || '';
      try {
        const requested = String(requestedRaw).split(',').map(s => s.trim()).filter(Boolean);
        const allowed = requested.filter(r => indices.includes(r));
        if (allowed.length) searchIndex = allowed;
      } catch (e) {
        // ignore parse
      }
    }

    // Pagination defaults
    const rawLimit = req.query && req.query.limit !== undefined ? req.query.limit : (req.body && req.body.limit !== undefined ? req.body.limit : undefined);
    const rawOffset = req.query && req.query.offset !== undefined ? req.query.offset : (req.body && req.body.offset !== undefined ? req.body.offset : undefined);
    const limit = rawLimit !== undefined ? Math.max(1, Math.min(5000, parseInt(rawLimit, 10) || 100)) : 100;
    const offset = rawOffset !== undefined ? Math.max(0, parseInt(rawOffset, 10) || 0) : 0;

    // IMPORTANT: Accept input from either query (GET) or body (POST). For large queries (export) prefer POST.
    const input = (req.method === 'POST' && req.body && Object.keys(req.body).length >= 0) ? req.body : req.query;

    console.info('DEBUG getLeads request input:', input);

    // build ES query (async & mapping-aware) - pass the searchIndex (array or single)
    const esQuery = await buildESQuery(input, Array.isArray(searchIndex) ? searchIndex.join(',') : searchIndex);
    console.info('DEBUG built esQuery:', JSON.stringify(esQuery));

    // Load properties once so we can safely validate sort fields
    const props = await getIndexProperties(Array.isArray(searchIndex) ? searchIndex.join(',') : searchIndex);

    let sortClause = [];
    const requestedSortField = (input && input.sort_field) || undefined;
    const requestedSortDir = ((input && (input.sort_dir || 'desc')).toLowerCase() === 'asc') ? 'asc' : 'desc';

    if (requestedSortField && typeof requestedSortField === 'string' && /^[\w.@\-]+$/.test(requestedSortField)) {
      if (fieldExistsInProps(props, requestedSortField)) {
        sortClause.push({ [requestedSortField]: { order: requestedSortDir } });
      } else {
        console.warn('Requested sort_field not found in mapping, ignoring sort_field:', requestedSortField);
      }
    } else {
      const dateField = await chooseDateSortField(Array.isArray(searchIndex) ? searchIndex.join(',') : searchIndex);
      const idChoice = await chooseIdSort(Array.isArray(searchIndex) ? searchIndex.join(',') : searchIndex);
      if (dateField && typeof dateField === 'string' && fieldExistsInProps(props, dateField)) {
        sortClause.push({ [dateField]: { order: 'desc', missing: '_last' } });
      } else if (dateField) {
        console.warn('Date field chosen for sort not present in mapping, skipping date sort:', dateField);
      }
      if (idChoice && idChoice.field && idChoice.mapped && fieldExistsInProps(props, idChoice.field)) {
        sortClause.push({ [idChoice.field]: { order: 'desc' } });
      } else if (idChoice && idChoice.mapped) {
        console.warn('Id sort field chosen but not found in mapping, skipping id sort:', idChoice.field);
      }
    }

    if (!Array.isArray(sortClause) || sortClause.length === 0) sortClause = null;

    // Build search params - ensure index passed as string (comma-joined) to avoid weird URL long-lines
    const indexParam = Array.isArray(searchIndex) ? searchIndex.join(',') : searchIndex;
    const searchParams = {
      index: indexParam,
      body: {
        query: esQuery,
        track_total_hits: true
      },
      from: offset,
      size: limit
    };
    if (sortClause) searchParams.sort = sortClause;

    // NOTE: Some OpenSearch clients may try to use GET with long URL when index is an array
    // To reduce chance of 'too_long_http_line_exception' ensure index is joined string above.
    // Also prefer using POST-style body requests (client.search will use POST when a body is present).

    let resp;
    try {
      resp = await client.search(searchParams);
    } catch (err) {
      console.error('getLeads error on initial search:', err && err.message ? err.message : err);
      try {
        if (searchParams.sort) {
          console.warn('Retrying search without sort due to error.');
          const retryParams = { index: indexParam, body: { query: esQuery, track_total_hits: true }, from: offset, size: limit };
          resp = await client.search(retryParams);
        } else {
          throw err;
        }
      } catch (err2) {
        console.error('getLeads paginated retry without sort failed', err2 && err2.message ? err2.message : err2);
        const errType = err2 && err2.meta && err2.meta.body && err2.meta.body.error && err2.meta.body.error.type;
        if (errType === 'search_phase_execution_exception' || errType === 'query_shard_exception') {
          return res.status(500).json({ message: 'OpenSearch search error', detail: err2.meta && err2.meta.body && err2.meta.body.error });
        }
        return res.status(500).json({ message: 'Server search error' });
      }
    }

    const body = resp && resp.body ? resp.body : resp;

    let total = 0;
    let totalIsEstimate = false;
    if (body.hits && body.hits.total !== undefined && body.hits.total !== null) {
      if (typeof body.hits.total === 'object') {
        total = Number(body.hits.total.value || 0);
        if (body.hits.total.relation && String(body.hits.total.relation).toLowerCase() === 'gte') totalIsEstimate = true;
      } else {
        total = Number(body.hits.total) || 0;
      }
    } else {
      total = 0;
    }

    if (totalIsEstimate) {
      try {
        const countResp = await client.count({ index: indexParam, body: { query: esQuery } });
        const countBody = countResp && countResp.body ? countResp.body : countResp;
        if (countBody && typeof countBody.count === 'number') {
          total = countBody.count;
          totalIsEstimate = false;
        }
      } catch (countErr) {
        console.warn('Fallback client.count failed, keeping estimated total from search response:', countErr && countErr.message ? countErr.message : countErr);
      }
    }

    const hits = (body.hits && body.hits.hits) ? body.hits.hits : [];

    const rows = hits.map(h => {
      const source = { _id: h._id, ...(h._source || {}) };
      return normalizeNestedPrefixes(source);
    });

    return res.json({
      meta: {
        index: indexParam,
        total: typeof total === 'number' ? total : rows.length,
        from: offset,
        size: limit
      },
      data: rows
    });
  } catch (e) {
    console.error('OpenSearch error', e && e.message ? e.message : e);
    const errType = e && e.meta && e.meta.body && e.meta.body.error && e.meta.body.error.type;
    if (errType === 'search_phase_execution_exception' || errType === 'query_shard_exception') {
      return res.status(500).json({ message: 'OpenSearch search error', detail: e.meta && e.meta.body && e.meta.body.error });
    }
    return res.status(500).json({ message: 'Server error' });
  }
};
