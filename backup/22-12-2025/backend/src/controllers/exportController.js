// src/controllers/exportController.js
const fs = require('fs');
const path = require('path');
const { Client } = require('@opensearch-project/opensearch');
const crypto = require('crypto');

// configure client from env
const client = new Client({ node: process.env.OPENSEARCH_NODE || 'http://localhost:9200' });

// directory to write exports
const EXPORT_DIR = path.join(__dirname, '../../exports');
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

// simple in-memory job store (replace with DB if needed)
const jobs = {};

/**
 * Helper: decode simple JWT to inspect role (no verification here).
 * If you have a shared secret or passport strategy, prefer verifying token properly.
 */
function decodeJwt(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return payload;
  } catch (e) {
    return null;
  }
}

function isAdminFromToken(req) {
  // Accept Authorization: Bearer <token>
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return false;
  const payload = decodeJwt(token);
  if (!payload) return false;
  const role = (payload.role || payload.roles || (payload.user && payload.user.role) || '').toString().toLowerCase();
  if (!role) return false;
  return ['admin','super_admin','super-admin','super admin','superadmin'].includes(role);
}

function normalizeValue(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'object') {
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  return String(v);
}

/**
 * Start export POST /api/export/start
 * Body expected:
 * {
 *   index: "optional_index_name" OR index: ["idx1","idx2"],
 *   query: { ... }   <-- if missing, uses { match_all: {} }
 *   columns: [ { field: 'name', header: 'Name' }, ... ]  // optional: export order
 *   sizePerScroll: 1000 (optional)
 * }
 */
exports.startExport = async (req, res) => {
  try {
    // Auth: ensure admin
    if (!isAdminFromToken(req)) {
      return res.status(403).json({ message: 'Forbidden: admin role required' });
    }

    const body = req.body || {};
    const index = body.index || process.env.OPENSEARCH_LEADS_INDEX || process.env.OPENSEARCH_FALLBACK_INDEXES || 'leads';
    const esQuery = (body.query && typeof body.query === 'object') ? body.query : { match_all: {} };
    const sizePerScroll = Number(body.sizePerScroll) || 1000;
    const columns = Array.isArray(body.columns) ? body.columns : null;

    // create job record
    const jobId = crypto.randomBytes(10).toString('hex');
    const filename = `leads_export_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}_${jobId}.csv`;
    const filepath = path.join(EXPORT_DIR, filename);

    jobs[jobId] = { status: 'running', progress: 0, filename, filepath, startedAt: Date.now(), total: 0 };

    // start background work (do not await here)
    (async () => {
      try {
        // We will use scroll API to fetch all results safely using POST body.
        // Use index as array or string
        const searchParams = {
          index,
          scroll: '2m',
          size: sizePerScroll,
          body: {
            query: esQuery,
            _source: true,
            track_total_hits: true
          }
        };

        // initial search
        const initResp = await client.search(searchParams);
        const initBody = initResp && initResp.body ? initResp.body : initResp;
        const totalHits = (initBody.hits && initBody.hits.total && (initBody.hits.total.value || initBody.hits.total)) || (initBody.hits && initBody.hits.hits ? initBody.hits.hits.length : 0);

        jobs[jobId].total = Number(totalHits) || 0;

        // Prepare write stream
        const ws = fs.createWriteStream(filepath, { encoding: 'utf8' });

        // If columns provided, write header row; otherwise extract header from first hit
        let headerWritten = false;
        // helper write row
        const escapeCsv = (s) => {
          if (s === null || s === undefined) return '';
          const str = String(s);
          if (/[",\n\r]/.test(str)) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        // process first batch
        let scrollId = initBody._scroll_id || (initBody._scrollId || null);
        let hits = (initBody.hits && Array.isArray(initBody.hits.hits)) ? initBody.hits.hits : [];

        // If no results, finish immediately
        if (!hits.length) {
          // write empty file with header if columns given
          if (columns && columns.length) {
            ws.write(columns.map(c => escapeCsv(c.header || c.field)).join(",") + "\r\n");
            headerWritten = true;
          }
          ws.end();
          jobs[jobId].status = 'done';
          jobs[jobId].progress = 100;
          jobs[jobId].finishedAt = Date.now();
          return;
        }

        // if columns not provided, infer from first hit
        let fieldOrder = [];
        if (columns && columns.length) {
          fieldOrder = columns.map(c => c.field);
        } else {
          // flatten keys from first hit _source (top-level fields only)
          const firstSource = (hits[0] && hits[0]._source) || {};
          fieldOrder = Object.keys(firstSource);
          // ensure there is at least something
          if (!fieldOrder.length) fieldOrder = ['id', ...(Object.keys(hits[0] || {}))];
        }

        // write header
        const headerRow = fieldOrder.map(f => escapeCsv(f)).join(",");
        ws.write(headerRow + "\r\n");
        headerWritten = true;

        let processed = 0;

        const processHits = (batch) => {
          for (const h of batch) {
            const src = (h._source || {});
            const row = fieldOrder.map(f => {
              // nested path support
              let val = undefined;
              if (String(f).includes('.')) {
                const parts = String(f).split('.');
                let cur = src;
                for (const p of parts) {
                  if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
                  else { cur = undefined; break; }
                }
                val = cur;
              } else {
                val = (src && Object.prototype.hasOwnProperty.call(src, f)) ? src[f] : undefined;
              }
              return escapeCsv(normalizeValue(val));
            });
            ws.write(row.join(",") + "\r\n");
            processed++;
          }
          // update progress (approx)
          jobs[jobId].progress = jobs[jobId].total ? Math.round((processed / jobs[jobId].total) * 100) : 0;
        };

        // first batch
        processHits(hits);

        // loop scroll while there are more hits
        while (true) {
          if (!scrollId) break;
          const scrollResp = await client.scroll({ scroll_id: scrollId, scroll: '2m' });
          const scrollBody = scrollResp && scrollResp.body ? scrollResp.body : scrollResp;
          scrollId = scrollBody._scroll_id || (scrollBody._scrollId || null);
          const moreHits = (scrollBody.hits && Array.isArray(scrollBody.hits.hits)) ? scrollBody.hits.hits : [];
          if (!moreHits.length) break;
          processHits(moreHits);
        }

        // clean scroll
        try {
          if (scrollId) {
            await client.clearScroll({ scroll_id: scrollId });
          }
        } catch (e) {
          // ignore clear scroll errors
        }

        ws.end();
        jobs[jobId].status = 'done';
        jobs[jobId].progress = 100;
        jobs[jobId].finishedAt = Date.now();
      } catch (err) {
        jobs[jobId].status = 'error';
        jobs[jobId].error = (err && err.message) ? err.message : String(err);
        try { fs.appendFileSync(path.join(EXPORT_DIR, `${jobId}.error.log`), String(err.stack || err) + "\n"); } catch(e) {}
      }
    })();

    return res.json({ jobId, downloadUrl: `/exports/${filename}`, message: 'Export started' });
  } catch (e) {
    console.error('startExport error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getStatus = async (req, res) => {
  const jobId = req.params.jobId;
  if (!jobId || !jobs[jobId]) return res.status(404).json({ message: 'Job not found' });
  return res.json(jobs[jobId]);
};
