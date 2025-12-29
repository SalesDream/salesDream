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

/* ---------- buildESQuery (mapping-aware & robust) ---------- */
async function buildESQuery(q, index) {
  const must = [];
  const should = [];
  const filter = [];

  // load mapping properties for index (may be empty object)
  const props = await getIndexProperties(index);

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
  // contact name -> merged.ContactName OR linked.Full_name
  addMatchAcross('contact_full_name', [
    'merged.ContactName', 'merged.normalized_full_name', 'merged_normalized_full_name',
    'linked.Full_name', 'linked.normalized_full_name', 'linked_normalized_full_name',
    'contact_full_name', 'contact_name'
  ], { allowExact: true });

  // company name
  addMatchAcross('company_name', [
    'merged.Company', 'merged.normalized_company_name', 'merged_normalized_company_name',
    'linked.Company_Name', 'linked.normalized_company_name', 'company'
  ], { allowExact: true });

  // city / locality
  addMatchAcross('city', ['merged.City', 'linked.Locality', 'company_location_locality', 'city'], { allowExact: true });

  // state code
  addMulti('state_code', ['merged.State', 'merged.normalized_state', 'merged_normalized_state', 'linked.normalized_state', 'linked_normalized_state', 'linked_state_hash']);

  // zip
  addMatchAcross('zip_code', ['merged.Zip', 'merged_Zip', 'zip', 'zip_code', 'linked.Postal_Code', 'linked_Postal_Code'], { allowExact: true });

  // website
  if (q.website) {
    addMatchAcross('website', ['merged.Web_Address', 'merged.normalized_website', 'merged_normalized_website', 'linked.Company_Website', 'linked.normalized_company_website', 'website'], { allowExact: true });
  }

  // domain: normalize and check wildcard/term across candidates
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

  // email handling
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

  // phone handling
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

  // job title
  addMatchAcross('job_title', ['linked.Job_title', 'linked_Job_title', 'job_title', 'merged.Title_Full', 'merged_Title_Full'], { allowExact: true });
  addMulti('job_title', ['linked.Job_title','job_title','merged_Title_Full']);

  // industry (loose)
  addMatchAcross('industry', ['linked.Industry','linked_Industry','merged.SIC','merged_SIC','industry'], { allowExact: true });

  // years_min (numeric) mapped to Years_Experience on linked side
  addMin('years_min', 'linked.Years_Experience');
  addMax('years_max', 'linked.Years_Experience');

  // job_start_from / job_start_to (date) mapped to linked.Last_Updated as a best-effort
  if (q.job_start_from) {
    filter.push({ range: { 'linked.Last_Updated': { gte: q.job_start_from } } });
  }
  if (q.job_start_to) {
    filter.push({ range: { 'linked.Last_Updated': { lte: q.job_start_to } } });
  }

  // employees/revenue numeric ranges
  addMin('employees_min', 'linked_Company_Size');
  addMin('employees_min', 'employees');
  addMax('employees_max', 'employees');
  addMin('revenue_min', 'min_revenue');
  addMax('revenue_max', 'max_revenue');

  // state(s), countries & location multi-selects
  addMulti('state', ['merged.State','linked.normalized_state','linked_normalized_state']);
  addMulti('company_location_country', ['merged.Country','linked.Location_Country','linked_Countries','company_location_country']);
  addMulti('company_location_region', ['linked_region','linked.Location','company_location_region','merged_State','merged_Region']);
  addMulti('company_location_locality', ['linked_Locality','company_location_locality','merged_City']);
  addMulti('company_location_continent', ['linked_Location_Continent','company_location_continent']);

  // es_id / linked id
  addMulti('es_id', ['es_id','linked_id','merged_id']);
  addMulti('linked_id', ['linked_id','merged_id']);

  // skills tokens
  const skillsTokens = asList(q.skills);
  if (skillsTokens.length) {
    for (const tok of skillsTokens) {
      if (!isNumericField('linked_Skills')) must.push({ match_phrase: { 'linked_Skills': { query: tok, slop: 1 } } });
      if (!isNumericField('skills')) must.push({ match_phrase: { 'skills': { query: tok, slop: 1 } } });
    }
  }

  // flags
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

/* ---------- Resolve index ---------- */
async function resolveIndex() {
  const candidates = [];
  if (process.env.OPENSEARCH_LEADS_INDEX) candidates.push(process.env.OPENSEARCH_LEADS_INDEX);
  if (process.env.OPENSEARCH_FALLBACK_INDEXES) {
    const envList = process.env.OPENSEARCH_FALLBACK_INDEXES.split(',').map(s => s.trim()).filter(Boolean);
    candidates.push(...envList);
  }
  candidates.push('leads', 'merged_index_v1', 'alaska_joined_data');

  const unique = [...new Set(candidates)];
  for (const idx of unique) {
    try {
      const exists = await client.indices.exists({ index: idx });
      if (exists && (exists.body === true || exists.body === undefined)) return { index: idx, tried: unique };
    } catch (e) {
      console.warn(`Error checking index existence for ${idx}:`, e && e.message ? e.message : e);
    }
  }
  return { index: null, tried: unique };
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
    const { index, tried } = await resolveIndex();
    if (!index) {
      console.error('No OpenSearch index found. Tried:', tried);
      return res.status(500).json({ message: 'No OpenSearch index found', tried });
    }

    const rawLimit = req.query.limit;
    const rawOffset = req.query.offset;
    const limit = rawLimit !== undefined ? Math.max(1, Math.min(1000, parseInt(rawLimit, 10) || 100)) : 100;
    const offset = rawOffset !== undefined ? Math.max(0, parseInt(rawOffset, 10) || 0) : 0;

    // debug: incoming query
    console.info('DEBUG getLeads request query:', req.query);

    // build ES query (async & mapping-aware)
    const esQuery = await buildESQuery(req.query, index);
    console.info('DEBUG built esQuery:', JSON.stringify(esQuery));

    // Load properties once so we can safely validate sort fields
    const props = await getIndexProperties(index);

    // Build safe sortClause
    let sortClause = [];
    const requestedSortField = req.query.sort_field;
    const requestedSortDir = ((req.query.sort_dir || 'desc').toLowerCase() === 'asc') ? 'asc' : 'desc';

    if (requestedSortField && typeof requestedSortField === 'string' && /^[\w.@\-]+$/.test(requestedSortField)) {
      if (fieldExistsInProps(props, requestedSortField)) {
        sortClause.push({ [requestedSortField]: { order: requestedSortDir } });
      } else {
        console.warn('Requested sort_field not found in mapping, ignoring sort_field:', requestedSortField);
      }
    } else {
      const dateField = await chooseDateSortField(index);
      const idChoice = await chooseIdSort(index);
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

    const searchParams = {
      index,
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
          const retryParams = { index, body: { query: esQuery, track_total_hits: true }, from: offset, size: limit };
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
        const countResp = await client.count({ index, body: { query: esQuery } });
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
    const rows = hits.map(h => ({ _id: h._id, ...(h._source || {}) }));

    return res.json({
      meta: {
        index,
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
