// controllers/dataController.js
const { Client } = require('@opensearch-project/opensearch');
const client = new Client({ node: process.env.OPENSEARCH_NODE || 'http://localhost:9200' });

/* ---------- Helpers ---------- */
const asList = (v) => {
  if (v === undefined || v === null) return [];
  if (Array.isArray(v)) return v.flatMap(x => String(x).split(/[;,]+/)).map(s => s.trim()).filter(Boolean);
  return String(v).split(/[;,]+/).map(s => s.trim()).filter(Boolean);
};

async function getIndexProperties(index) {
  try {
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

/**
 * Merge properties for multiple indices into a single 'props' object.
 * Later entries overwrite earlier ones (not usually important for 'type').
 */
async function getIndexPropertiesForIndices(indices = []) {
  const out = {};
  for (const idx of indices) {
    try {
      const p = await getIndexProperties(idx);
      if (p && typeof p === 'object') {
        Object.assign(out, p);
      }
    } catch (e) {
      console.warn('Error loading mapping for', idx, e && e.message ? e.message : e);
    }
  }
  return out;
}

function findFirstExistingField(props, candidates) {
  if (!props) return null;
  for (const c of candidates) {
    if (Object.prototype.hasOwnProperty.call(props, c)) return c;
  }
  return null;
}

/* ---------- safe chooser functions (unchanged) ---------- */
async function chooseDateSortField(indices) {
  const candidates = [
    'linked_Last_Updated','linked_Last_Updated.keyword',
    'linked.Last_Updated','linked.last_updated',
    'created_at','createdAt','@timestamp','created_date','created'
  ];
  const props = await getIndexPropertiesForIndices(indices);
  return findFirstExistingField(props, candidates);
}

async function chooseIdSort(indices) {
  const props = await getIndexPropertiesForIndices(indices);
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

/* ---------- buildESQuery (mapping-aware & robust) ----------
   This is the same code you used previously; no functional changes.
*/
async function buildESQuery(q, indices) {
  const must = [];
  const should = [];
  const filter = [];

  // load mapping properties for indices (may be empty object)
  const props = await getIndexPropertiesForIndices(indices);

  // detect numeric field types
  const isNumericField = (field) => {
    if (!props || !field) return false;
    const p = props[field];
    if (!p) return false;
    const t = p.type;
    return ['integer', 'long', 'short', 'byte', 'float', 'double', 'scaled_float'].includes(t);
  };

  // detect exact flag (accept '1' or 'true')
  const isExact = q && (String(q.exact) === '1' || String(q.exact).toLowerCase() === 'true');

  // ---------- Utility builders ----------
  const addMatchAcross = (param, rawFields, opts = {}) => {
    const v = q[param];
    if (!v || String(v).trim() === '') return;
    const term = String(v).trim();

    const fields = expandCandidates(rawFields);

    if (isExact && opts.allowExact) {
      const subShould = [];
      for (const f of fields) {
        if (isNumericField(f)) continue;
        subShould.push({ term: { [f]: String(term).toLowerCase() } });
      }
      if (subShould.length) filter.push({ bool: { should: subShould, minimum_should_match: 1 } });
      return;
    }

    const subShould = fields
      .filter(f => !isNumericField(f))
      .map(f => ({ match_phrase: { [f]: { query: term, slop: 2 } } }));

    if (subShould.length) must.push({ bool: { should: subShould, minimum_should_match: 1 } });
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
        subShould.push({ term: { [f]: String(valStr).toLowerCase() } });
        subShould.push({ match_phrase: { [f]: { query: String(valStr), slop: 1 } } });
      }
      if (subShould.length) filter.push({ bool: { should: subShould, minimum_should_match: 1 } });
    }
  };

  const addMin = (param, field) => {
    const v = q[param];
    if (v !== undefined && v !== '' && !Number.isNaN(Number(v))) filter.push({ range: { [field]: { gte: Number(v) } } });
  };
  const addMax = (param, field) => {
    const v = q[param];
    if (v !== undefined && v !== '' && !Number.isNaN(Number(v))) filter.push({ range: { [field]: { lte: Number(v) } } });
  };

  /* ---------- Field mappings: check merged + linked explicitly ---------- */
  addMatchAcross('contact_full_name', [
    'merged.ContactName', 'merged.normalized_full_name', 'merged_normalized_full_name',
    'linked.Full_name', 'linked.normalized_full_name', 'linked_normalized_full_name',
    'contact_full_name', 'contact_name'
  ], { allowExact: true });

  addMatchAcross('company_name', [
    'merged.Company', 'merged.normalized_company_name', 'merged_normalized_company_name',
    'linked.Company_Name', 'linked.normalized_company_name', 'company'
  ], { allowExact: true });

  addMatchAcross('city', ['merged.City', 'linked.Locality', 'company_location_locality', 'city'], { allowExact: true });

  addMulti('state_code', ['merged.State', 'merged.normalized_state', 'merged_normalized_state', 'linked.normalized_state', 'linked_normalized_state', 'linked_state_hash']);

  addMatchAcross('zip_code', ['merged.Zip', 'merged_Zip', 'zip', 'zip_code', 'linked.Postal_Code', 'linked_Postal_Code'], { allowExact: true });

  if (q.website) {
    addMatchAcross('website', ['merged.Web_Address', 'merged.normalized_website', 'merged_normalized_website', 'linked.Company_Website', 'linked.normalized_company_website', 'website'], { allowExact: true });
  }

  if (q.domain) {
    let d = String(q.domain || '').trim().toLowerCase();
    d = d.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    if (d) {
      const rawFields = ['merged.normalized_website', 'merged_normalized_website', 'linked.normalized_company_website', 'linked_normalized_company_website', 'linked.Company_Website', 'website'];
      const fields = expandCandidates(rawFields);
      const domShould = [];
      for (const f of fields) {
        domShould.push({ term: { [f]: d } });
        domShould.push({ match_phrase: { [f]: { query: d } } });
        domShould.push({ wildcard: { [f]: `*${d}*` } });
      }
      should.push(...domShould);
    }
  }

  if (q.normalized_email) {
    const rawEmail = String(q.normalized_email || '').trim();
    const v = rawEmail.toLowerCase();
    if (v) {
      const rawFields = ['merged.normalized_email', 'merged_normalized_email', 'linked.normalized_email', 'linked_normalized_email', 'normalized_email', 'linked.Emails', 'linked.Emails.keyword', 'merged.Email', 'merged.Email.keyword'];
      const fields = expandCandidates(rawFields);
      if (isExact) {
        const emailShould = fields.map(f => ({ term: { [f]: v } }));
        if (emailShould.length) filter.push({ bool: { should: emailShould, minimum_should_match: 1 } });
      } else {
        const emailShould = [];
        for (const f of fields) {
          emailShould.push({ term: { [f]: v } });
          emailShould.push({ match_phrase: { [f]: { query: v } } });
          emailShould.push({ wildcard: { [f]: `*${v}*` } });
        }
        filter.push({ bool: { should: emailShould, minimum_should_match: 1 } });
      }
    }
  }

  if (q.phone) {
    const rawPhone = String(q.phone || '').trim();
    const digits = rawPhone.replace(/\D/g, '');
    const variants = [];
    if (digits) {
      variants.push(digits);
      if (!rawPhone.startsWith('+')) variants.push(`+${digits}`);
    } else {
      variants.push(rawPhone);
    }

    const rawPhoneFields = [
      'merged.Phone','merged.Phone.keyword','merged_Telephone_Number','merged.Telephone_Number',
      'merged_normalized_phone','linked.Phone_numbers','linked.Phone_numbers.keyword','linked.Mobile','linked.Mobile.keyword',
      'linked_normalized_phone','normalized_phone','Phone','contact_phone','merged.PHONE'
    ];
    const phoneFields = expandCandidates(rawPhoneFields);

    const phoneShould = [];
    for (const f of phoneFields) {
      for (const val of variants) {
        if (!val) continue;
        if (isExact) {
          phoneShould.push({ term: { [f]: val } });
          phoneShould.push({ term: { [`${f}.keyword`]: val } });
          phoneShould.push({ wildcard: { [f]: `*${val}*` } });
          phoneShould.push({ wildcard: { [`${f}.keyword`]: `*${val}*` } });
        } else {
          phoneShould.push({ match_phrase: { [f]: { query: rawPhone, slop: 1 } } });
          if (digits) phoneShould.push({ wildcard: { [f]: `*${digits}*` } });
        }
      }
    }

    // deduplicate
    const seen = new Set();
    const uniquePhoneClauses = [];
    for (const clause of phoneShould) {
      const str = JSON.stringify(clause);
      if (!seen.has(str)) {
        uniquePhoneClauses.push(clause);
        seen.add(str);
      }
    }
    if (uniquePhoneClauses.length) filter.push({ bool: { should: uniquePhoneClauses, minimum_should_match: 1 } });
  }

  addMatchAcross('job_title', ['linked.Job_title', 'linked_Job_title', 'job_title', 'merged.Title_Full', 'merged_Title_Full'], { allowExact: true });
  addMulti('job_title', ['linked.Job_title','job_title','merged_Title_Full']);

  addMatchAcross('industry', ['linked.Industry','linked_Industry','merged.SIC','merged_SIC','industry'], { allowExact: true });

  addMin('years_min', 'linked.Years_Experience');
  addMax('years_max', 'linked.Years_Experience');

  if (q.job_start_from) {
    filter.push({ range: { 'linked.Last_Updated': { gte: q.job_start_from } } });
  }
  if (q.job_start_to) {
    filter.push({ range: { 'linked.Last_Updated': { lte: q.job_start_to } } });
  }

  addMin('employees_min', 'linked_Company_Size');
  addMin('employees_min', 'employees');
  addMax('employees_max', 'employees');
  addMin('revenue_min', 'min_revenue');
  addMax('revenue_max', 'max_revenue');

  addMulti('state', ['merged.State','linked.normalized_state','linked_normalized_state']);
  addMulti('company_location_country', ['merged.Country','linked.Location_Country','linked_Countries','company_location_country']);
  addMulti('company_location_region', ['linked_region','linked.Location','company_location_region','merged_State','merged_Region']);
  addMulti('company_location_locality', ['linked_Locality','company_location_locality','merged_City']);
  addMulti('company_location_continent', ['linked_Location_Continent','company_location_continent']);

  addMulti('es_id', ['es_id','linked_id','merged_id']);
  addMulti('linked_id', ['linked_id','merged_id']);

  const skillsTokens = asList(q.skills);
  if (skillsTokens.length) {
    for (const tok of skillsTokens) {
      if (!isNumericField('linked_Skills')) must.push({ match_phrase: { 'linked_Skills': { query: tok, slop: 1 } } });
      if (!isNumericField('skills')) must.push({ match_phrase: { 'skills': { query: tok, slop: 1 } } });
    }
  }

  if (q.public_company && String(q.public_company).toLowerCase() !== 'any') {
    const val = String(q.public_company).trim();
    const flds = expandCandidates(['merged.PublicCompany','PublicCompany','public_company']);
    const sub = flds.map(f => ({ term: { [f]: val } }));
    if (sub.length) filter.push({ bool: { should: sub, minimum_should_match: 1 } });
  }

  if (q.franchise_flag && String(q.franchise_flag).toLowerCase() !== 'any') {
    const val = String(q.franchise_flag).trim();
    const flds = expandCandidates(['merged.FranchiseFlag','FranchiseFlag','franchise_flag']);
    const sub = flds.map(f => ({ term: { [f]: val } }));
    if (sub.length) filter.push({ bool: { should: sub, minimum_should_match: 1 } });
  }

  if (q.has_company_linkedin && String(q.has_company_linkedin).toLowerCase() !== 'any') {
    const v = String(q.has_company_linkedin).trim();
    const candidateFields = expandCandidates(['linked.Company_Website','linked_Company_Website','merged_normalized_website','company_linkedin','company_linkedin_url']);
    if (v === '1' || v.toLowerCase() === 'true') {
      const existShould = candidateFields.map(f => ({ exists: { field: f } }));
      if (existShould.length) filter.push({ bool: { should: existShould, minimum_should_match: 1 } });
    } else {
      const anyExists = candidateFields.map(f => ({ exists: { field: f } }));
      if (anyExists.length) filter.push({ bool: { must_not: anyExists } });
    }
  }

  if (q.has_contact_linkedin && String(q.has_contact_linkedin).toLowerCase() !== 'any') {
    const v = String(q.has_contact_linkedin).trim();
    const candidateFields = expandCandidates(['linked_LinkedIn_URL','linked_LinkedIn','linked_LinkedIn_Username','linked.LinkedIn_URL','linked.LinkedIn_Username']);
    if (v === '1' || v.toLowerCase() === 'true') {
      const existShould = candidateFields.map(f => ({ exists: { field: f } }));
      if (existShould.length) filter.push({ bool: { should: existShould, minimum_should_match: 1 } });
    } else {
      const anyExists = candidateFields.map(f => ({ exists: { field: f } }));
      if (anyExists.length) filter.push({ bool: { must_not: anyExists } });
    }
  }

  /* ---------- combine bool ---------- */
  const bool = {};
  if (must.length) bool.must = must;
  if (should.length) bool.should = should;
  if (filter.length) bool.filter = filter;

  return Object.keys(bool).length ? { bool } : { match_all: {} };
}

/* ---------- Resolve indices (returns array) ---------- */
async function resolveIndices() {
  // Priority order: OPENSEARCH_LEADS_INDEX (if set), merged_index_v1, usa_companies_data
  const candidates = [];
  if (process.env.OPENSEARCH_LEADS_INDEX) candidates.push(process.env.OPENSEARCH_LEADS_INDEX);
  // include the specific indices the user mentioned as desired
  candidates.push('merged_index_v1', 'usa_companies_data');
  // also include fallback indexes if provided in env
  if (process.env.OPENSEARCH_FALLBACK_INDEXES) {
    const envList = process.env.OPENSEARCH_FALLBACK_INDEXES.split(',').map(s => s.trim()).filter(Boolean);
    candidates.push(...envList);
  }

  // ensure uniqueness & preserve order
  const unique = [...new Set(candidates)];
  const found = [];
  const tried = [];
  for (const idx of unique) {
    try {
      const exists = await client.indices.exists({ index: idx });
      tried.push(idx);
      if (exists && (exists.body === true || exists.body === undefined)) {
        found.push(idx);
      }
    } catch (e) {
      console.warn(`Error checking index existence for ${idx}:`, e && e.message ? e.message : e);
    }
  }
  return { indices: found, tried: tried };
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

/* ---------- Helper: normalize domain/email/phone ---------- */
function normalizeDomain(d) {
  if (!d) return null;
  let s = String(d).trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  return s || null;
}
function normalizeEmail(e) {
  if (!e) return null;
  const s = String(e).trim().toLowerCase();
  return s || null;
}
function normalizePhoneDigits(p) {
  if (!p) return null;
  const d = String(p).replace(/\D/g, '');
  return d || null;
}

/* ---------- Helper: determine uniqueness key for a hit ---------- */
function computeUniqueKey(hit) {
  const src = hit._source || {};
  // priority of keys
  const candidates = [
    src.linked_id,
    src.merged_id,
    src.es_id,
    src.normalized_email || src.normalizedEmail || src.normalized_email_address,
    normalizeEmail(src.email) || normalizeEmail(src.normalized_email),
    normalizeDomain(src.domain) || normalizeDomain(src.website) || normalizeDomain(src.company_website) || normalizeDomain(src.linked_company_website) || normalizeDomain(getNested(src,'linked.Company_Website')),
    normalizePhoneDigits(src.phone) || normalizePhoneDigits(src.normalized_phone) || normalizePhoneDigits(getNested(src,'merged.Phone')) || normalizePhoneDigits(getNested(src,'linked.Mobile'))
  ];
  for (const c of candidates) {
    if (c !== undefined && c !== null && String(c).trim() !== '') return String(c).trim();
  }
  // fallback: index:_id
  return `${hit._index || 'idx'}:${hit._id}`;
}

/* ---------- Helper: merge two source objects (prefer 'preferredIndices' order) ---------- */
function mergeRecords(existing, incoming, incomingIndex, preferredIndexOrder) {
  // existing and incoming are plain objects (existing is mutated)
  // copy all keys from incoming into existing if existing doesn't already have a non-empty value.
  // keep track of contributing indexes/ids
  existing._source_indexes = existing._source_indexes || [];
  existing._source_ids = existing._source_ids || [];

  if (!existing._source_indexes.includes(incomingIndex)) existing._source_indexes.push(incomingIndex);
  if (!existing._source_ids.includes(incoming._id)) existing._source_ids.push(incoming._id);

  // For deterministic merge we can respect preferredIndexOrder: fields from earlier-preferred sources are kept.
  // existing._preferred_rank holds the rank (lower = higher priority) of the index that provided most fields so far.
  const incomingRank = preferredIndexOrder.indexOf(incomingIndex);
  const existingRank = existing._preferred_rank === undefined ? Number.MAX_SAFE_INTEGER : existing._preferred_rank;

  // If incoming has higher priority (lower rank number) we will prefer its non-empty values for fields
  const preferIncoming = incomingRank >= 0 && incomingRank < existingRank;

  for (const key of Object.keys(incoming)) {
    if (key === '_id' || key === '_index') continue;
    const curVal = existing[key];
    const incVal = incoming[key];
    const curEmpty = curVal === undefined || curVal === null || (typeof curVal === 'string' && curVal.trim() === '');
    const incEmpty = incVal === undefined || incVal === null || (typeof incVal === 'string' && String(incVal).trim() === '');

    if (curEmpty && !incEmpty) {
      existing[key] = incVal;
    } else if (!curEmpty && !incEmpty && preferIncoming) {
      // if incoming has higher priority we can overwrite empty-ish values (but avoid clobbering complex objects blindly)
      existing[key] = incVal;
    } // otherwise keep existing
  }

  // update preferred rank if incoming has better rank
  if (incomingRank >= 0 && incomingRank < existingRank) existing._preferred_rank = incomingRank;

  return existing;
}

/* ---------- Main: getLeads (updated to query multiple indices and dedupe) ---------- */
exports.getLeads = async (req, res) => {
  try {
    // find which indices we will query
    const { indices, tried } = await resolveIndices();
    if (!indices || indices.length === 0) {
      console.error('No OpenSearch index found. Tried:', tried);
      return res.status(500).json({ message: 'No OpenSearch index found', tried });
    }

    // pagination / limits
    const rawLimit = req.query.limit;
    const rawOffset = req.query.offset;
    const limit = rawLimit !== undefined ? Math.max(1, Math.min(1000, parseInt(rawLimit, 10) || 100)) : 100;
    const offset = rawOffset !== undefined ? Math.max(0, parseInt(rawOffset, 10) || 0) : 0;

    // debug: incoming query
    console.info('DEBUG getLeads request query:', req.query);

    // Build ES query using combined mapping context
    const esQuery = await buildESQuery(req.query, indices);
    console.info('DEBUG built esQuery:', JSON.stringify(esQuery));

    // Load combined properties for indices
    const props = await getIndexPropertiesForIndices(indices);

    // Build safe sortClause — try requested field first; otherwise best-effort date + id
    let sortClause = [];
    const requestedSortField = req.query.sort_field;
    const requestedSortDir = ((req.query.sort_dir || 'desc').toLowerCase() === 'asc') ? 'asc' : 'desc';

    if (requestedSortField && typeof requestedSortField === 'string' && /^[\w.@\-]+$/.test(requestedSortField)) {
      if (fieldExistsInProps(props, requestedSortField)) {
        sortClause.push({ [requestedSortField]: { order: requestedSortDir } });
      } else {
        console.warn('Requested sort_field not found in combined mapping, ignoring sort_field:', requestedSortField);
      }
    } else {
      const dateField = await chooseDateSortField(indices);
      const idChoice = await chooseIdSort(indices);
      if (dateField && typeof dateField === 'string' && fieldExistsInProps(props, dateField)) {
        sortClause.push({ [dateField]: { order: 'desc', missing: '_last' } });
      } else if (dateField) {
        console.warn('Date field chosen for sort not present in combined mapping, skipping date sort:', dateField);
      }
      if (idChoice && idChoice.field && idChoice.mapped && fieldExistsInProps(props, idChoice.field)) {
        sortClause.push({ [idChoice.field]: { order: 'desc' } });
      } else if (idChoice && idChoice.mapped) {
        console.warn('Id sort field chosen but not found in combined mapping, skipping id sort:', idChoice.field);
      }
    }

    if (!Array.isArray(sortClause) || sortClause.length === 0) sortClause = null;

    const searchParams = {
      index: indices.join(','),
      body: {
        query: esQuery,
        track_total_hits: true
      },
      from: offset,
      size: limit
    };
    if (sortClause) searchParams.sort = sortClause;

    if (req.query && req.query.phone) {
      console.info('DEBUG getLeads: phone param present. searchParams summary:', JSON.stringify({ index: searchParams.index, from: searchParams.from, size: searchParams.size, sort: searchParams.sort }));
    }

    let resp;
    try {
      resp = await client.search(searchParams);
    } catch (err) {
      console.error('getLeads error on initial search:', err && err.message ? err.message : err);
      // Retry without sort if present
      try {
        if (searchParams.sort) {
          console.warn('Retrying search without sort due to error.');
          const retryParams = { index: searchParams.index, body: { query: esQuery, track_total_hits: true }, from: offset, size: limit };
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

    // Extract total safely (body.hits.total may be object or number)
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
        const countResp = await client.count({ index: indices.join(','), body: { query: esQuery } });
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

    // Deduplicate + merge logic
    const seen = new Map();
    // preferred index order same as 'indices' array (0 = highest priority)
    const preferredIndexOrder = indices;

    for (const h of hits) {
      // _source may be undefined if stored differently; ensure plain object
      const src = (h._source && typeof h._source === 'object') ? { ...h._source } : {};
      // attach raw id/index for traceability in mergeRecords
      src._id = h._id;
      src._index = h._index;

      const key = computeUniqueKey(h);

      if (!seen.has(key)) {
        // initialize merged record
        const init = Object.assign({}, src);
        init._source_indexes = [h._index];
        init._source_ids = [h._id];
        init._preferred_rank = preferredIndexOrder.indexOf(h._index) >= 0 ? preferredIndexOrder.indexOf(h._index) : Number.MAX_SAFE_INTEGER;
        seen.set(key, init);
      } else {
        const existing = seen.get(key);
        mergeRecords(existing, src, h._index, preferredIndexOrder);
        // store back (existing is mutated but keep for clarity)
        seen.set(key, existing);
      }
    }

    // Convert map -> rows array
    const rows = Array.from(seen.values()).map(r => {
      // remove internal helper field before returning
      const clean = { ...r };
      if (clean._preferred_rank !== undefined) delete clean._preferred_rank;
      return clean;
    });

    return res.json({
      meta: {
        indices: indices,
        tried,
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
