const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Client } = require("@opensearch-project/opensearch");

const { updateJob, getJob } = require("../utils/exportJobStore");

/**
 * 🔥 IMPORT THE SAME LOGIC USED BY getLeads
 */
const {
  buildESQuery,
  resolveIndices,
  normalizeNestedPrefixes
} = require("./dataController");

/* ---------------- OpenSearch client ---------------- */
const client = new Client({
  node: process.env.OPENSEARCH_NODE || "http://localhost:9200"
});

/* ---------------- Export directory ---------------- */
const EXPORT_DIR = path.join(__dirname, "../../exports");
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

/* ---------------- Auth helpers ---------------- */
function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function isAdminFromToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return false;

  const payload = decodeJwt(token);
  if (!payload) return false;

  const role = (payload.role || "").toLowerCase();
  return ["admin", "super_admin", "superadmin"].includes(role);
}

/* ---------------- CSV helpers ---------------- */
function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/* ---------------- Background export worker ---------------- */
async function runExportWorker(jobId, filters, filepath) {
  try {
    /* 1️⃣ Resolve indices EXACTLY like getLeads */
    const { indices } = await resolveIndices();
    if (!indices.length) {
      throw new Error("No OpenSearch index found");
    }

    const indexParam = indices.join(",");

    /* 2️⃣ Build SAME ES query */
    const esQuery = await buildESQuery(filters, indexParam);

    /* 3️⃣ Initial search with scroll */
    const search = await client.search({
      index: indexParam,
      scroll: "2m",
      size: 1000,
      body: {
        query: esQuery,
        track_total_hits: true
      }
    });

    let scrollId = search.body._scroll_id;
    let hits = search.body.hits.hits || [];
    const total = search.body.hits.total?.value || 0;

    updateJob(jobId, { total });

    const ws = fs.createWriteStream(filepath, { encoding: "utf8" });

    let processed = 0;
    let headersWritten = false;
    let headers = [];

    /* 4️⃣ Scroll loop */
    while (hits.length) {
      for (const h of hits) {
        const rowObj = normalizeNestedPrefixes({
          _id: h._id,
          ...(h._source || {})
        });

        /* Write header ONCE from first row */
        if (!headersWritten) {
          headers = Object.keys(rowObj);
          ws.write(headers.map(escapeCsv).join(",") + "\n");
          headersWritten = true;
        }

        const row = headers.map(h => escapeCsv(rowObj[h]));
        ws.write(row.join(",") + "\n");

        processed++;
      }

      updateJob(jobId, {
        processed,
        progress: total ? Math.round((processed / total) * 100) : 0
      });

      const next = await client.scroll({
        scroll_id: scrollId,
        scroll: "2m"
      });

      scrollId = next.body._scroll_id;
      hits = next.body.hits.hits || [];
    }

    ws.end();

    updateJob(jobId, {
      status: "done",
      progress: 100,
      finishedAt: Date.now()
    });

  } catch (err) {
    updateJob(jobId, {
      status: "error",
      error: err.message
    });
  }
}

/* ---------------- Start Export ---------------- */
exports.startExport = (req, res) => {
  if (!isAdminFromToken(req)) {
    return res.status(403).json({ message: "Admin only" });
  }

  const jobId = crypto.randomBytes(10).toString("hex");
  const filename = `leads_export_${Date.now()}_${jobId}.csv`;
  const filepath = path.join(EXPORT_DIR, filename);

  updateJob(jobId, {
    jobId,
    status: "running",
    progress: 0,
    filename,
    filepath,
    startedAt: Date.now()
  });

  /* 🔥 PASS SAME FILTERS AS getLeads */
  runExportWorker(jobId, req.body || {}, filepath);

  return res.json({ jobId, filename });
};

/* ---------------- Get Status ---------------- */
exports.getStatus = (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ message: "Job not found" });
  return res.json(job);
};
