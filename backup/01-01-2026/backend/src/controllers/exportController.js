// src/controllers/exportController.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Client } = require("@opensearch-project/opensearch");

const { updateJob, getJob } = require("../utils/exportJobStore");

/**
 * ✅ Use SAME functions that are used in the page API:
 * resolveIndices() -> find indexes
 * buildLeadsQuery(filters) -> build OpenSearch query from selected filters
 */
const { resolveIndices, buildLeadsQuery } = require("./dataController");

/* ---------------- OpenSearch client ---------------- */
const client = new Client({
  node: process.env.OPENSEARCH_NODE || "http://localhost:9200",
});

/* ---------------- Export directory ---------------- */
const EXPORT_DIR = path.join(__dirname, "../../exports");
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

/* ================= CSV COLUMN SCHEMA (ORDER + HEADERS) ================= */
const CSV_COLUMNS = [
  { key: "full_name", header: "Full name" },
  { key: "first_name", header: "First Name" },
  { key: "last_name", header: "Last Name" },
  { key: "phone", header: "Phone" },
  { key: "email", header: "Email" },
  { key: "city", header: "City" },
  { key: "state", header: "State" },
  { key: "company", header: "Company" },
  { key: "job_title", header: "Job Title" },
  { key: "website", header: "Website" },
  { key: "domain", header: "Domain" },
  { key: "employees", header: "Employees" },
  { key: "linkedin_url", header: "Linkedin Url" },
  { key: "facebook", header: "Facebook" },
  { key: "twitter", header: "Twitter" },
  { key: "sales_volume", header: "Sales Volume" },
  { key: "max_revenue", header: "Max Revenue" },
  { key: "revenue_range", header: "Revenue (Min–Max)" },
  { key: "median_income", header: "Median Income Census Area" },
  { key: "address", header: "Address" },
  { key: "zip", header: "Zip" },
  { key: "sic", header: "Sic" },
  { key: "fax", header: "Fax" },
  { key: "toll_free_phone", header: "Toll Free Phone" },
  { key: "county", header: "County" },
  { key: "created_at", header: "Created At" },
];

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

  const role = String(payload.role || "").toLowerCase();
  return ["admin", "super_admin", "superadmin"].includes(role);
}

/* ---------------- CSV helpers ---------------- */
function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/* ---------------- Row mapper (OpenSearch hit -> table-like row) ----------------
   This MUST match the data you show on the page (same columns).
*/
function normalizeHitToCsvRow(hit) {
  const src = hit?._source || {};
  const merged = src.merged || {};
  const linked = src.linked || {};

  const fullName =
    merged.normalized_full_name ||
    merged.Name ||
    linked.Full_name ||
    "";

  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  const first_name = parts[0] || "";
  const last_name = parts.length > 1 ? parts.slice(1).join(" ") : "";

  // Revenue values (adjust keys if your OpenSearch uses different field names)
  const minRevenue =
    merged.Min_Revenue ||
    merged.min_revenue ||
    merged.MinRevenue ||
    "";

  const maxRevenue =
    merged.Max_Revenue ||
    merged.max_revenue ||
    merged.SalesVolume ||
    merged.Sales_Volume ||
    merged.sales_volume ||
    "";

  const website =
    merged.normalized_website ||
    merged.Web_Address ||
    linked.Company_Website ||
    "";

  return {
    full_name: fullName,
    first_name,
    last_name,

    phone:
      merged.Telephone_Number ||
      merged.Phone ||
      linked.Phone_numbers ||
      linked.Mobile ||
      "",

    email:
      merged.normalized_email ||
      merged.Email ||
      linked.normalized_email ||
      linked.Emails ||
      "",

    city: merged.City || linked.Locality || "",
    state:
      merged.State ||
      merged.normalized_state ||
      linked.normalized_state ||
      "",

    company:
      merged.Company ||
      merged.normalized_company_name ||
      linked.Company_Name ||
      "",

    job_title: merged.Title_Full || linked.Job_title || "",
    website,
    domain: website,

    employees:
      merged.NumEmployees ||
      merged.Employees ||
      merged.employees ||
      "",

    linkedin_url:
      merged.Linkedin_URL ||
      linked.LinkedIn_URL ||
      linked.Linkedin_URL ||
      "",

    facebook:
      linked.Facebook ||
      merged.Facebook ||
      "",

    twitter:
      linked.Twitter ||
      merged.Twitter ||
      "",

    sales_volume:
      merged.SalesVolume ||
      merged.Sales_Volume ||
      merged.sales_volume ||
      "",

    max_revenue: maxRevenue,

    revenue_range:
      minRevenue || maxRevenue
        ? `${minRevenue || ""} – ${maxRevenue || ""}`
        : "",

    median_income:
      merged.Median_Income_Census_Area ||
      merged.median_income_census_area ||
      merged.MedianIncomeCensusArea ||
      "",

    address:
      merged.Address ||
      merged.address ||
      "",

    zip:
      merged.Zip ||
      merged.zip ||
      "",

    sic:
      merged.SIC ||
      merged.sic ||
      "",

    fax:
      merged.Fax ||
      merged.fax ||
      "",

    toll_free_phone:
      merged.Toll_Free_Phone ||
      merged.toll_free_phone ||
      merged.TollFreePhone ||
      "",

    county:
      merged.County ||
      merged.county ||
      "",

    created_at:
      merged.Created_At ||
      merged.created_at ||
      src.created_at ||
      "",
  };
}

/* ---------------- Scroll helpers (FIX too_long_http_line_exception) ---------------- */
async function scrollNext(scrollId, scroll = "2m") {
  // force POST body so scroll_id doesn't end up in URL line
  const resp = await client.transport.request({
    method: "POST",
    path: "/_search/scroll",
    body: { scroll, scroll_id: scrollId },
  });
  return resp?.body || resp;
}

async function clearScroll(scrollId) {
  try {
    await client.transport.request({
      method: "DELETE",
      path: "/_search/scroll",
      body: { scroll_id: scrollId },
    });
  } catch {}
}

/* ---------------- Background export worker ---------------- */
async function runExportWorker(jobId, filters, filepath) {
  let scrollId = null;

  try {
    // 1) Resolve indices exactly like the page
    const { indices } = await resolveIndices();
    if (!indices || !indices.length) throw new Error("No OpenSearch index found");
    const indexParam = indices.join(",");

    // 2) Build SAME query as page uses
    const esQuery = buildLeadsQuery(filters || {});

    // 3) First search with scroll
    const first = await client.search({
      index: indexParam,
      scroll: "2m",
      size: 1000,
      body: {
        query: esQuery,
        track_total_hits: true,
      },
    });

    const firstBody = first?.body || first;
    scrollId = firstBody?._scroll_id || null;

    let hits = firstBody?.hits?.hits || [];
    const total = firstBody?.hits?.total?.value || 0;

    updateJob(jobId, { total, processed: 0, progress: 0 });

    const ws = fs.createWriteStream(filepath, { encoding: "utf8" });

    // ✅ write fixed header order/labels
    ws.write(CSV_COLUMNS.map((c) => escapeCsv(c.header)).join(",") + "\n");

    let processed = 0;

    while (hits.length) {
      for (const h of hits) {
        const rowObj = normalizeHitToCsvRow(h);
        const row = CSV_COLUMNS.map((c) => escapeCsv(rowObj[c.key]));
        ws.write(row.join(",") + "\n");
        processed++;
      }

      updateJob(jobId, {
        processed,
        progress: total ? Math.round((processed / total) * 100) : 0,
      });

      if (!scrollId) break;

      const nextBody = await scrollNext(scrollId, "2m");
      scrollId = nextBody?._scroll_id || null;
      hits = nextBody?.hits?.hits || [];
    }

    ws.end();

    updateJob(jobId, {
      status: "done",
      progress: 100,
      processed,
      finishedAt: Date.now(),
    });
  } catch (err) {
    updateJob(jobId, {
      status: "error",
      error: err?.message || "Export failed",
      finishedAt: Date.now(),
    });
  } finally {
    if (scrollId) await clearScroll(scrollId);
  }
}

/* ---------------- Start Export ----------------
   POST /api/export/start
   Body: { filters: {...} }
----------------------------------------------- */
exports.startExport = (req, res) => {
  if (!isAdminFromToken(req)) {
    return res.status(403).json({ message: "Admin only" });
  }

  const jobId = crypto.randomBytes(10).toString("hex");
  const filename = `leads_export_${Date.now()}_${jobId}.csv`;
  const filepath = path.join(EXPORT_DIR, filename);

  // frontend sends { filters: {...} }
  const filters = req.body?.filters ? req.body.filters : (req.body || {});

  updateJob(jobId, {
    jobId,
    status: "running",
    progress: 0,
    processed: 0,
    total: 0,
    filename,
    filepath,
    startedAt: Date.now(),
  });

  // async worker
  runExportWorker(jobId, filters, filepath);

  return res.json({ jobId, filename });
};

/* ---------------- Get Status ----------------
   GET /api/export/status/:jobId
--------------------------------------------- */
exports.getStatus = (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ message: "Job not found" });

  const out = { ...job };
  if (out.status === "done") {
    out.downloadUrl = `/api/export/download/${out.jobId}`;
  }
  return res.json(out);
};

/* ---------------- Download ----------------
   GET /api/export/download/:jobId
------------------------------------------- */
exports.downloadExport = (req, res) => {
  if (!isAdminFromToken(req)) {
    return res.status(403).json({ message: "Admin only" });
  }

  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ message: "Job not found" });
  if (job.status !== "done") {
    return res.status(409).json({ message: "Export not finished yet" });
  }

  if (!job.filepath || !fs.existsSync(job.filepath)) {
    return res.status(404).json({ message: "Export file missing on server" });
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${job.filename}"`);

  fs.createReadStream(job.filepath).pipe(res);
};

// =========================
// LIST + DOWNLOAD + DELETE (Saved exports)
// =========================
const EXPORT_DIR_ABS = path.join(__dirname, "../../exports");

function safeFilename(name) {
  // prevent path traversal
  const base = path.basename(String(name || ""));
  if (!base.toLowerCase().endsWith(".csv")) return null;
  return base;
}

/**
 * GET /api/export/files
 * returns [{ filename, sizeBytes, exportedAt }]
 */
exports.listExportFiles = (req, res) => {
  if (!isAdminFromToken(req)) {
    return res.status(403).json({ message: "Admin only" });
  }

  try {
    if (!fs.existsSync(EXPORT_DIR_ABS)) return res.json({ files: [] });

    const files = fs
      .readdirSync(EXPORT_DIR_ABS)
      .filter((f) => f.toLowerCase().endsWith(".csv"))
      .map((filename) => {
        const fp = path.join(EXPORT_DIR_ABS, filename);
        const st = fs.statSync(fp);
        return {
          filename,
          sizeBytes: st.size,
          exportedAt: st.mtimeMs || st.mtime.getTime(),
        };
      })
      .sort((a, b) => b.exportedAt - a.exportedAt);

    return res.json({ files });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Failed to list exports" });
  }
};

/**
 * GET /api/export/file/:filename
 * download by filename anytime
 */
exports.downloadByFilename = (req, res) => {
  if (!isAdminFromToken(req)) {
    return res.status(403).json({ message: "Admin only" });
  }

  const filename = safeFilename(req.params.filename);
  if (!filename) return res.status(400).json({ message: "Invalid filename" });

  const fp = path.join(EXPORT_DIR_ABS, filename);
  if (!fs.existsSync(fp)) return res.status(404).json({ message: "File not found" });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  fs.createReadStream(fp).pipe(res);
};

/**
 * DELETE /api/export/files/:filename
 * deletes a stored export file
 */
exports.deleteExportFile = (req, res) => {
  if (!isAdminFromToken(req)) {
    return res.status(403).json({ message: "Admin only" });
  }

  const filename = safeFilename(req.params.filename);
  if (!filename) return res.status(400).json({ message: "Invalid filename" });

  const fp = path.join(EXPORT_DIR_ABS, filename);
  if (!fs.existsSync(fp)) return res.status(404).json({ message: "File not found" });

  try {
    fs.unlinkSync(fp);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Failed to delete file" });
  }
};
