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
    if (!mapping) return null;
    if (mapping.properties) return mapping.properties;
    if (mapping._doc && mapping._doc.properties) return mapping._doc.properties;
    for (const k of Object.keys(mapping)) {
      if (mapping[k] && mapping[k].properties) return mapping[k].properties;
    }
    return null;
  } catch (e) {
    console.warn('getIndexProperties error:', e && e.message ? e.message : e);
    return null;
  }
}

function findFirstExistingField(props, candidates) {
  if (!props) return null;
  for (const c of candidates) {
    if (Object.prototype.hasOwnProperty.call(props, c)) return c;
  }
  return null;
}
async function chooseDateSortField(index) {
  const candidates = ['linked_Last_Updated', 'linked_Last_Updated.keyword', 'created_at', 'createdAt', '@timestamp', 'created_date', 'created'];
  const props = await getIndexProperties(index);
  return findFirstExistingField(props, candidates);
}
async function chooseIdSort(index) {
  const props = await getIndexProperties(index);
  if (props && Object.prototype.hasOwnProperty.call(props, 'linked_id')) return { field: 'linked_id', mapped: true };
  if (props && Object.prototype.hasOwnProperty.call(props, 'id')) return { field: 'id', mapped: true };
  return { field: '_id', mapped: false };
}

/* ---------- buildESQuery (expanded fields) ---------- */
function buildESQuery(q) {
  const must = [];
  const should = [];
  const filter = [];

  // detect exact flag (accept '1' or 'true')
  const isExact = q && (String(q.exact) === '1' || String(q.exact).toLowerCase() === 'true');

  // helper: add match_phrase across multiple fields (must match at least one)
  const addMatchAcross = (param, fields, opts = {}) => {
    const v = q[param];
    if (!v || String(v).trim() === '') return;
    const term = String(v).trim();
    // If exact mode and caller requested exact behavior for this param, prefer term queries instead of match_phrase.
    if (isExact && opts.allowExact) {
      // prefer term on keyword/normalized fields if exact requested
      const subShould = [];
      for (const f of fields) {
        // add both keyword variant and field itself as term when possible
        subShould.push({ term: { [f]: String(term).toLowerCase() } });
        subShould.push({ term: { [`${f}.keyword`]: String(term).toLowerCase() } });
      }
      if (subShould.length) filter.push({ bool: { should: subShould, minimum_should_match: 1 } });
      return;
    }

    // loose/default behaviour: match_phrase
    const subShould = fields.map(f => ({ match_phrase: { [f]: { query: term, slop: 2 } } }));
    if (subShould.length) must.push({ bool: { should: subShould, minimum_should_match: 1 } });
  };

  // helper: treat comma/semicolon-separated lists and build boolean filters
  const addMulti = (param, fields) => {
    const list = asList(q[param]);
    if (!list.length) return;
    for (const val of list) {
      const subShould = [];
      for (const f of fields) {
        // prefer term on normalized/keyword fields, also include match_phrase fallback
        subShould.push({ term: { [f]: String(val).toLowerCase() } });
        subShould.push({ match_phrase: { [f]: { query: String(val), slop: 1 } } });
      }
      filter.push({ bool: { should: subShould, minimum_should_match: 1 } });
    }
  };

  // numeric range helpers
  const addMin = (param, field) => {
    const v = q[param];
    if (v !== undefined && v !== '' && !Number.isNaN(Number(v))) filter.push({ range: { [field]: { gte: Number(v) } } });
  };
  const addMax = (param, field) => {
    const v = q[param];
    if (v !== undefined && v !== '' && !Number.isNaN(Number(v))) filter.push({ range: { [field]: { lte: Number(v) } } });
  };

  // ---------------- Expanded mappings ----------------
  // contact name: try normalized, merged, linked, keyword versions
  addMatchAcross('contact_full_name', [
    'linked_normalized_full_name',
    'linked_normalized_full_name.keyword',
    'linked_Full_name',
    'linked_Full_name.keyword',
    'merged_normalized_full_name',
    'merged_normalized_full_name.keyword',
    'contact_full_name',
    'contact_name',
    'linked_First_Name',
    'linked_Last_Name'
  ], { allowExact: true });

  // company name / merged company
  addMatchAcross('company_name', [
    'linked_Company_Name', 'linked_Company_Name.keyword',
    'linked_normalized_company_name', 'merged_Company', 'merged_normalized_company_name', 'company'
  ], { allowExact: true });

  // industry / job title
  addMatchAcross('industry', [
    'linked_Company_Industry', 'linked_Company_Industry.keyword',
    'linked_Industry', 'linked_Industry_2', 'industry', 'job_title', 'linked_Job_title'
  ], { allowExact: true });

  // city / locality / merged_City
  addMatchAcross('city', [
    'linked_Locality', 'linked_Locality.keyword',
    'merged_City', 'company_location_locality', 'city'
  ], { allowExact: true });

  // zip
  addMatchAcross('zip_code', ['linked_Postal_Code', 'zip', 'zip_code', 'merged_Zip'], { allowExact: true });

  // website / domain / merged fields
  if (q.website) {
    const w = String(q.website).trim();
    addMatchAcross('website', ['linked_Company_Website', 'linked_normalized_company_website', 'website', 'merged_normalized_website', 'merged_Web_Address'], { allowExact: true });
  }
  if (q.domain) {
    let d = String(q.domain || '').trim().toLowerCase();
    d = d.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    if (d) {
      const domShould = [
        { term: { 'linked_normalized_company_website': d } },
        { match_phrase: { 'linked_normalized_company_website': { query: d } } },
        { match_phrase: { 'linked_Company_Website': { query: d } } },
        { match_phrase: { 'website': { query: d } } },
        { wildcard: { 'linked_normalized_company_website': `*${d}*` } },
        { term: { 'merged_normalized_website': d } }
      ];
      should.push(...domShould);
    }
  }

  // ----- EMAIL handling: strict when exact=1, loose otherwise -----
  if (q.normalized_email) {
    const rawEmail = String(q.normalized_email || '').trim();
    const v = rawEmail.toLowerCase();
    if (v) {
      if (isExact) {
        // STRICT exact: only term queries on normalized/keyword fields
        const emailShould = [
          { term: { 'linked_normalized_email': v } },
          { term: { 'linked_normalized_email.keyword': v } },
          { term: { 'merged_normalized_email': v } },
          { term: { 'merged_normalized_email.keyword': v } },
          { term: { 'normalized_email': v } },
          { term: { 'normalized_email.keyword': v } }
        ];
        filter.push({ bool: { should: emailShould, minimum_should_match: 1 } });
      } else {
        // LOOSE: retain previous logic (match_phrase / match)
        filter.push({ bool: { should: [
          { term: { 'linked_normalized_email': v } },
          { term: { 'merged_normalized_email': v } },
          { match_phrase: { 'linked_normalized_email': { query: v } } },
          { match: { 'normalized_email': { query: v } } }
        ], minimum_should_match: 1 }});
      }
    }
  }

  // ----- PHONE handling: strict when exact=1, loose otherwise -----
  if (q.phone) {
    const rawPhone = String(q.phone || '').trim();
    // normalized digits-only phone
    const digits = rawPhone.replace(/\D/g, '');
    if (digits) {
      if (isExact) {
        // STRICT: only match normalized/digits phone via term
        const phoneShould = [
          { term: { 'linked_normalized_phone': digits } },
          { term: { 'linked_normalized_phone.keyword': digits } },
          { term: { 'merged_normalized_phone': digits } },
          { term: { 'merged_normalized_phone.keyword': digits } },
          // fallback to other stored phone fields (mobile / phone) as digits
          { term: { 'linked_Mobile': digits } },
          { term: { 'merged_Phone': digits } }
        ];
        filter.push({ bool: { should: phoneShould, minimum_should_match: 1 } });
      } else {
        // LOOSE: allow match_phrase across phone-like fields (for partials)
        const phoneFields = ['linked_Mobile', 'linked_Phone_numbers', 'linked_normalized_phone', 'merged_Phone', 'merged_Telephone_Number'];
        const subShould = phoneFields.map(f => ({ match_phrase: { [f]: { query: rawPhone, slop: 1 } } }));
        filter.push({ bool: { should: subShould, minimum_should_match: 1 } });
      }
    } else {
      // if phone contains non-digit pattern but not digits, still add loose match
      if (!isExact) {
        addMatchAcross('phone', ['linked_Mobile', 'linked_Phone_numbers', 'linked_normalized_phone', 'merged_Phone', 'merged_Telephone_Number']);
      }
    }
  }

  // state(s)
  addMulti('state_code', ['linked_normalized_state', 'linked_normalized_state.keyword', 'merged_State', 'linked_state_hash']);
  addMulti('state', ['linked_normalized_state', 'merged_State']);

  // company location country (multi)
  addMulti('company_location_country', ['linked_Location_Country', 'linked_Countries', 'merged_Country', 'company_location_country']);

  // company location region / metro / continent
  addMulti('company_location_region', ['linked_region', 'linked_Location', 'company_location_region', 'merged_State', 'merged_Region']);
  addMulti('company_location_locality', ['linked_Locality', 'company_location_locality', 'merged_City']);
  addMulti('company_location_continent', ['linked_Location_Continent', 'company_location_continent']);

  // job_title (both match and IN/phrases)
  addMatchAcross('job_title', ['linked_Job_title', 'job_title', 'merged_Title_Full', 'merged_Title_Full.keyword'], { allowExact: true });
  addMulti('job_title', ['linked_Job_title', 'job_title', 'merged_Title_Full']);

  // merged/linked company phone/email/ids
  addMatchAcross('company', ['merged_Company', 'linked_Company_Name', 'company', 'merged_Name'], { allowExact: true });
  addMulti('es_id', ['es_id', 'linked_id', 'merged_id']); // allow searching es_id or linked_id
  addMulti('linked_id', ['linked_id', 'merged_id']);

  // countries field (linked_Countries)
  addMulti('countries', ['linked_Countries', 'merged_Country']);

  // skills & sub_role (tokenize via multiple LIKE-like clauses)
  const skillsTokens = asList(q.skills);
  if (skillsTokens.length) {
    for (const tok of skillsTokens) {
      must.push({ match_phrase: { 'linked_Skills': { query: tok, slop: 1 } } });
      must.push({ match_phrase: { 'skills': { query: tok, slop: 1 } } });
    }
  }
  if (q.sub_role) addMatchAcross('sub_role', ['linked_Sub_Role', 'sub_role']);

  // numeric ranges (employees/revenue)
  addMin('employees_min', 'linked_Company_Size'); // best-effort (may be string); keep original ones
  addMin('employees_min', 'employees');
  addMax('employees_max', 'employees');

  addMin('revenue_min', 'min_revenue');
  addMax('revenue_max', 'revenue_max');

  // combine bool
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
  // candidates.push('leads', 'alaska_joined_data_v2', 'alaska_joined_data');
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

    const esQuery = buildESQuery(req.query);

    const isValidFieldName = s => typeof s === 'string' && /^[\w.@\-]+$/.test(s);

    let sortClause;
    const requestedSortField = req.query.sort_field;
    const requestedSortDir = ((req.query.sort_dir || 'desc').toLowerCase() === 'asc') ? 'asc' : 'desc';

    if (requestedSortField && isValidFieldName(requestedSortField)) {
      sortClause = [{ [requestedSortField]: { order: requestedSortDir } }];
    } else {
      const dateField = await chooseDateSortField(index);
      const idChoice = await chooseIdSort(index);
      const sc = [];
      if (dateField) sc.push({ [dateField]: { order: 'desc', missing: '_last' } });
      if (idChoice && idChoice.mapped) sc.push({ [idChoice.field]: { order: 'desc' } });
      if (sc.length === 0) sc.push('_doc');
      sortClause = sc;
      if (requestedSortField !== undefined && requestedSortField !== null) {
        console.warn('Ignoring invalid sort_field from request:', requestedSortField);
      }
    }

    const searchParams = {
      index,
      body: {
        query: esQuery,
        // IMPORTANT: ensure OpenSearch calculates exact totals rather than capping at 10k
        track_total_hits: true
      },
      from: offset,
      size: limit,
      sort: sortClause
    };

    let resp;
    try {
      resp = await client.search(searchParams);
    } catch (err) {
      try {
        resp = await client.search({ index, body: { query: esQuery, track_total_hits: true }, from: offset, size: limit });
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

    // Extract total safely (body.hits.total may be a number or object { value, relation })
    let total = 0;
    let totalIsEstimate = false;
    if (body.hits && body.hits.total !== undefined && body.hits.total !== null) {
      if (typeof body.hits.total === 'object') {
        total = Number(body.hits.total.value || 0);
        // relation may be 'eq' or 'gte' (gte indicates a lower-bound/capped estimate)
        if (body.hits.total.relation && String(body.hits.total.relation).toLowerCase() === 'gte') {
          totalIsEstimate = true;
        }
      } else {
        total = Number(body.hits.total) || 0;
      }
    } else {
      total = 0;
    }

    // If the engine still reports an estimate/capped relation (gte), optionally use count API to get exact number.
    if (totalIsEstimate) {
      try {
        const countResp = await client.count({ index, body: { query: esQuery } });
        const countBody = countResp && countResp.body ? countResp.body : countResp;
        if (countBody && typeof countBody.count === 'number') {
          total = countBody.count;
          totalIsEstimate = false;
        }
      } catch (countErr) {
        // if count fails, we'll keep the estimate from the search response but warn
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
