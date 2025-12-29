// src/pages/Dashboard.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { Navigate, useLocation } from "react-router-dom";
import api from "../api";
import { AgGridReact } from "ag-grid-react";
import { useAuthToken } from "../useAuth";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Command,
  Filter as FilterIcon,
  Search as SearchIcon,
  User,
  MapPin,
  Briefcase,
  Tags,
  Building2,
  Users,
  Plus,
  Minus,
  Globe2,
  Phone,
  Mail,
  Linkedin,
  Facebook,
  Twitter,
  MapPin as MapPinIcon,
  Download,
  FileText,
  File
} from "lucide-react";

/**
 * NOTE:
 * - Adds a Columns toggle UI (persistent via localStorage)
 * - Shows `--` for blank/null cell values across columns
 * - Keeps original behavior / layout / filtering
 * - Adds backend "Export All Records" job control (start / poll / download).
 */

/* ---------- Small helpers ---------- */
const toHeader = (s) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

/* ---------- Static US state codes (requested static values) ---------- */
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC"
];

/* ---------- Small chip ---------- */
const Chip = ({ children, onRemove }) => (
  <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full mr-1 mb-1">
    {children}
    <button
      onClick={onRemove}
      className="text-blue-500 hover:text-blue-700"
      aria-label="Remove"
    >
      ×
    </button>
  </span>
);

/* ---------- Compact sidebar typography ---------- */
const labelCls = "block text-[10px] font-semibold text-slate-600 tracking-wide";
const inputCls =
  "mt-1 h-7 w-full rounded-md border border-slate-300 px-2 text-[11px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400";

/* ---------- Tri toggle ---------- */
const ToggleTri = ({ value, onChange }) => {
  const opts = [
    { key: "any", label: "Any" },
    { key: "Y", label: "Yes" },
    { key: "N", label: "No" },
  ];
  return (
    <div className="inline-flex rounded-md overflow-hidden border text-[10px]">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`px-2 h-7 ${value === o.key ? "bg-sky-600 text-white" : "bg-white hover:bg-slate-50"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
};

/* ---------- MultiSelect (lightweight) ---------- */
function MultiSelect({ label, options = [], values = [], onChange, searchable = true }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  // ensure values is always an array
  const curValues = Array.isArray(values) ? values : [];

  const filtered = useMemo(() => {
    const list = (options || []).filter(Boolean).map(String);
    const uniq = Array.from(new Set(list));
    if (!q.trim()) return uniq.slice(0, 200);
    const qs = q.toLowerCase();
    return uniq.filter((x) => x.toLowerCase().includes(qs)).slice(0, 200);
  }, [options, q]);

  const toggle = (val) => {
    const existing = Array.isArray(curValues) ? curValues.slice() : [];
    const has = existing.includes(val);
    let next;
    if (has) next = existing.filter((v) => v !== val);
    else next = [...existing, val];
    // dedupe defensively
    next = Array.from(new Set(next));
    onChange(next);
  };

  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="mt-1 relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={inputCls + " text-left"}
        >
          {curValues && curValues.length ? `${curValues.length} selected` : "Any"}
        </button>
        {open && (
          <div className="absolute z-[60] mt-1 w-full max-h-64 overflow-auto bg-white border rounded-md shadow-lg">
            {searchable && (
              <div className="p-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className={inputCls}
                  placeholder="Search options…"
                />
              </div>
            )}
            <ul className="p-2 space-y-1 text-[11px]">
              {filtered.length === 0 && (
                <li className="text-slate-400 px-1">No options</li>
              )}
              {filtered.map((opt) => (
                <li key={opt}>
                  <label className="inline-flex items-center gap-2">
                    <input
                      className="accent-sky-600"
                      type="checkbox"
                      checked={curValues.includes(opt)}
                      onChange={() => toggle(opt)}
                    />
                    <span>{opt}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="border-t p-2 flex justify-between">
              <button
                className="text-[10px] text-slate-600 hover:text-slate-900"
                onClick={() => onChange([])}
              >
                Clear
              </button>
              <button
                className="text-[10px] text-sky-600 hover:text-sky-800"
                onClick={() => setOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
      {curValues && curValues.length > 0 && (
        <div className="mt-1">
          {Array.from(new Set(curValues)).map((v) => (
            <Chip
              key={v}
              onRemove={() => onChange(curValues.filter((x) => x !== v))}
            >
              {v}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

const TextInput = ({ label, value, onChange, placeholder = "Any" }) => (
  <label className="block">
    <span className={labelCls}>{label}</span>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
      placeholder={placeholder}
    />
  </label>
);

/* ---------- Accordion section ---------- */
function FilterSection({ icon: Icon, label, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-md">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-10 px-3 flex items-center justify-between"
      >
        <span className="inline-flex items-center gap-2 text-[12px] font-medium text-slate-700">
          <Icon className="w-4 h-4 text-slate-500" />
          {label}
        </span>
        {open ? (
          <Minus className="w-4 h-4 text-slate-500" />
        ) : (
          <Plus className="w-4 h-4 text-slate-500" />
        )}
      </button>
      {open && (
        <div className="px-3 pb-3 pt-0">
          <div className="h-px bg-slate-200 mb-2" />
          <div className="space-y-2">{children}</div>
        </div>
      )}
    </div>
  );
}

/* ====== Filters Rail (narrower: 200px, compact fonts) ====== */
function FiltersRail({ open, setOpen, f, setF, facets, onSearch, onClear }) {
  return (
    <div
      className={`relative z-20 shrink-0 overflow-visible transition-all duration-200 ${open ? "w-[200px]" : "w-0"}`}
    >
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="absolute -left-3 top-[5px] z-30 w-6 h-6 grid place-items-center rounded-full border bg-white shadow"
          title="Expand filters"
          aria-label="Expand filters"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {open && (
        <aside className="relative h-full bg-white border rounded-xl shadow-md overflow-visible">
          <button
            onClick={() => setOpen(false)}
            className="absolute -right-3 top-[5px] z-30 w-6 h-6 grid place-items-center rounded-full border bg-white shadow"
            title="Collapse filters"
            aria-label="Collapse filters"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="h-10 px-3 border-b flex items-center gap-2 text-[12px] font-semibold text-slate-700">
            <FilterIcon className="w-4 h-4 text-slate-600" />
            Filter
          </div>

          <div className="px-3 pb-3 pt-3 overflow-y-auto overflow-x-hidden h-[calc(100%-40px)] space-y-2">
            {/* Contact: plain text input */}
            <FilterSection icon={User} label="Contact">
              <TextInput
                label="Contact Name"
                value={f.contact_full_name}
                onChange={(v) => setF((s) => ({ ...s, contact_full_name: v }))}
              />
            </FilterSection>

            {/* Location: State (multi), City (multi), Country (multi), Zip */}
            <FilterSection icon={MapPin} label="Location">
              <MultiSelect
                label="State"
                options={US_STATES}
                values={f.state_code || []}
                onChange={(v) => setF((s) => ({ ...s, state_code: v }))}
              />
              <MultiSelect
                label="City"
                options={facets.city || []}
                values={f.city || []}
                onChange={(v) => setF((s) => ({ ...s, city: v }))}
              />
              <TextInput
                label="ZIP Code"
                value={f.zip_code || ""}
                onChange={(v) => setF((s) => ({ ...s, zip_code: v }))}
                placeholder="Any"
              />
            </FilterSection>

            {/* Role & Department: Job Title from linked.Job_title */}
            <FilterSection icon={Briefcase} label="Role & Department">
              <MultiSelect
                label="Job Title"
                options={facets.job_title || []}
                values={f.job_title || []}
                onChange={(v) => setF((s) => ({ ...s, job_title: v }))}
              />
            </FilterSection>

            {/* Skills */}
            <FilterSection icon={Tags} label="Skills">
              <MultiSelect
                label="Skills"
                options={facets.skills || []}
                values={f.skills_tokens || []}
                onChange={(v) => setF((s) => ({ ...s, skills_tokens: v }))}
              />
            </FilterSection>

            {/* Company / Domain - company name & website/domain multi-selects */}
            <FilterSection icon={Building2} label="Company / Domain">
  <MultiSelect
    label="Company Name"
    options={facets.company || []}
    values={f.company_name || []}
    onChange={(v) => setF((s) => ({ ...s, company_name: v }))}
  />
  <MultiSelect
    label="Website / Domain"
    options={facets.website || []}
    values={f.website || []}
    onChange={(v) => setF((s) => ({ ...s, website: v }))}
  />

  {/* Aligned rows: label left, toggle right */}
  <div className="mt-2 space-y-2">
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <span className={labelCls}>Public Company</span>
      </div>
      <div className="ml-3">
        <ToggleTri
          value={f.public_company}
          onChange={(v) => setF((s) => ({ ...s, public_company: v }))}
        />
      </div>
    </div>

    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <span className={labelCls}>Franchise</span>
      </div>
      <div className="ml-3">
        <ToggleTri
          value={f.franchise_flag}
          onChange={(v) => setF((s) => ({ ...s, franchise_flag: v }))}
        />
      </div>
    </div>
  </div>
</FilterSection>

            {/* Industry - NEW */}
            <FilterSection icon={Briefcase} label="Industry">
              <MultiSelect
                label="Industry"
                options={facets.industry || []}
                values={f.industry || []}
                onChange={(v) => setF((s) => ({ ...s, industry: v }))}
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="block">
                  <span className={labelCls}>Industry Source</span>
                  <select
                    value={f.industry_source || ""}
                    onChange={(e) => setF((s) => ({ ...s, industry_source: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">Auto</option>
                    <option value="A">A (linked)</option>
                    <option value="B">B (merged)</option>
                  </select>
                </label>
                <div />
              </div>
            </FilterSection>

            <div className="pt-1">
              <button
                onClick={onSearch}
                className="w-full h-8 rounded-md bg-sky-600 text-white text-[12px] shadow-sm hover:bg-sky-700 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={false}
              >
                <SearchIcon className="w-4 h-4" />
                Search
              </button>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <button
                  onClick={onClear}
                  className="text-slate-700 hover:text-slate-900"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <div className="bg-white border rounded-xl shadow-sm p-6 h-[560px] flex flex-col items-center justify-center">
      <div className="flex items-center gap-2 text-sky-700 font-semibold">
        <Sparkles className="w-4 h-4" />
        <span>Accelerate Lead Discovery with AI Search</span>
        <span className="text-[10px] bg-sky-100 text-sky-700 rounded px-1.5 py-0.5">
          Beta
        </span>
      </div>

      <div className="mt-4 w-full max-w-3xl">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
          <input
            className="w-full h-11 pl-9 pr-24 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200"
            placeholder="Find HR professionals working in startups under 200 employees."
            readOnly
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 border rounded-md px-2 py-1 text-xs text-slate-700"
            title="Command Palette"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-700" />
            <span className="inline-flex items-center gap-0.5 bg-slate-100 rounded px-1">
              <Command className="w-3 h-3" />
              <span>Ctrl+K</span>
            </span>
          </button>
        </div>
      </div>

      <div className="mt-6 text-center text-slate-600 text-sm">
        Use the filters on the left to find people and companies that match your
        criteria. When you’re ready, click <b>Search</b>.
      </div>
    </div>
  );
}

/* ---------- Spinner ---------- */
function Spinner({ label = "Loading…" }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a 8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
      </svg>
      <span className="text-xs text-slate-600">{label}</span>
    </div>
  );
}

/* ---------- Helpers (same as before) ---------- */
const maskEmail = (v) => {
  if (!v) return "--";
  const [u, d] = String(v).split("@");
  if (!d) return "--";
  return `${u.slice(0, 1)}••••@${d}`;
};
const maskPhone = (v) => {
  if (!v) return "--";
  const s = String(v).replace(/\D/g, "");
  return s.length >= 3 ? `${s.slice(0, 3)}•••••••` : "--";
};
const LinkCell = (p) => {
  const v = p.value ?? p.data?.[p.colDef.field];
  if (!v) return <span className="text-slate-400">--</span>;
  const href = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  const label = String(v).replace(/^https?:\/\//i, "");
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-sky-700 hover:underline truncate"
      title={label}
    >
      {label}
    </a>
  );
};
const DateCell = (p) => {
  const v = p.value ?? p.data?.[p.colDef.field];
  if (!v) return <span className="text-slate-400">--</span>;
  const d = new Date(v);
  if (isNaN(d)) return <span className="text-slate-400">{String(v)}</span>;
  return d.toLocaleDateString();
};
const normalizeUrl = (v) => {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s === "-") return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

/* ======================
   MAIN Dashboard View (extended)
   ====================== */
export default function Dashboard() {
  const gridRef = useRef(null);
  const chipBarRef = useRef(null);
  const pollRef = useRef(null); // for export polling
  const [chipBarH, setChipBarH] = useState(0); // measured chip bar height

  const [rowData, setRowData] = useState([]);
  const [viewRows, setViewRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [pageSize, setPageSize] = useState(100);

  const [page, setPage] = useState(0); // zero-based page index for server pagination
  const [totalHits, setTotalHits] = useState(0);

  const location = useLocation();
  const pathname = location.pathname || "/dashboard";
  const PAGE_OPTIONS = [10, 25, 50, 100, 200, 500, 1000];
  const [pageOptionsOpen, setPageOptionsOpen] = useState(false);
  // Quick search input for sidebar pages
  const [quickInput, setQuickInput] = useState("");

  // Email search input (top right)
  const [emailInput, setEmailInput] = useState("");

  // Export job states
  const [exportJob, setExportJob] = useState(null); // { jobId, status, file }
  const [exportProgress, setExportProgress] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
const startExportAll = async () => {
    try {
      // ensure only admins can hit this; call will still return 403 if server denies
      setExportJob(null);
      setExporting(true);

      // build filters same as when searching:
      const params = buildQuery(f);
      // send index and query in body; server expects { index, query, columns? }
      const body = {
        index: undefined, // optional: leave undefined to let server choose default indices
        query: params && Object.keys(params).length ? undefined : { match_all: {} }, // we will transform below
      };

      // Convert our buildQuery-style params into an ES query on the server.
      // For simplicity: if you want server to build mapping-aware ES queries,
      // you can send `filters` instead and server code can call buildESQuery.
      // Here we send filters object so server can build query if you extend it.
      body.filters = params;

      // send Authorization header (token) so server can check admin role
      const tokenVal = token || localStorage.getItem('token') || '';
      const headers = {};
      if (tokenVal) headers['Authorization'] = `Bearer ${tokenVal}`;

      const resp = await api.post('/api/export/start', body, { headers });
      if (resp && resp.data && resp.data.jobId) {
        setExportJob({ jobId: resp.data.jobId, downloadUrl: resp.data.downloadUrl });
        // start polling
        pollExportStatus(resp.data.jobId);
      } else {
        setExportJob({ error: 'Unexpected response from export start' });
        setExporting(false);
      }
    } catch (err) {
      console.error('startExportAll error', err);
      const msg = err?.response?.data?.message || err.message || 'Export start failed';
      setExportJob({ error: msg });
      setExporting(false);
    }
  };

  const pollExportStatus = async (jobId) => {
    // Poll until job is 'done' or 'error'
    let attempts = 0;
    const maxAttempts = 120; // 2 minutes if interval 1s; adjust as needed
    const intervalMs = 1000;
    const run = async () => {
      try {
        attempts++;
        const tokenVal = token || localStorage.getItem('token') || '';
        const headers = {};
        if (tokenVal) headers['Authorization'] = `Bearer ${tokenVal}`;
        const st = await api.get(`/api/export/status/${jobId}`, { headers });
        const data = st?.data || {};
        setExportJob(data);
        if (data.status === 'done') {
          setExporting(false);
          // done — server returned download url earlier; ui can show link from job.filename
          return;
        }
        if (data.status === 'error') {
          setExporting(false);
          return;
        }
        if (attempts >= maxAttempts) {
          setExporting(false);
          return;
        }
        setTimeout(run, intervalMs);
      } catch (e) {
        console.error('pollExportStatus error', e);
        setExporting(false);
      }
    };
    setTimeout(run, intervalMs);
  };
  // measure chip bar height whenever it appears/changes
  useEffect(() => {
    const el = chipBarRef.current;
    if (!el) {
      setChipBarH(0);
      return;
    }
    const measure = () => setChipBarH(el.offsetHeight || 0);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [chipBarRef, viewRows.length, selectedCount]);

  // Dummy avatar
  const DUMMY_AVATAR =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="%23E5E7EB"/><circle cx="64" cy="48" r="24" fill="%23CBD5E1"/><path d="M16 112c8-24 32-32 48-32s40 8 48 32" fill="%23CBD5E1"/></svg>';

  // Auth
  const token = useAuthToken();
  if (!token) return <Navigate to="/login" replace />;

  // Filters rail open by default
  const [filtersOpen, setFiltersOpen] = useState(() => {
    const v = localStorage.getItem("leadFiltersCollapsed");
    return v === "0" || v === null;
  });
  useEffect(() => {
    localStorage.setItem("leadFiltersCollapsed", filtersOpen ? "0" : "1");
  }, [filtersOpen]);


  // optional: close dropdown when clicking outside (robust uses refs; this is simple)
  useEffect(() => {
    if (!pageOptionsOpen) return;
    const onDocClick = (e) => {
      setPageOptionsOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [pageOptionsOpen]);

  /* ====== Filters state (adjusted for multi-selects) ====== */
  const initialFilters = {
    state_code: [],
    city: [],
    zip_code: "",
    company_location_country: [],
    company_name: [], // multi-select
    industry: [],
    industry_source: "",
    skills_tokens: [],
    website: [], // multi-select (website / domain)
    public_company: "any",
    franchise_flag: "any",
    employees: [], // multi-select of merged.NumEmployees values
    sales_volume: [], // multi-select of merged.SalesVolume values
    contact_full_name: "", // text input
    job_title: [],
    contact_gender: [],
    has_company_linkedin: "any",
    has_contact_linkedin: "any",
    // quick keys:
    phone: "",
    normalized_email: "",
    domain: [],
  };
  const [f, setF] = useState(initialFilters);
  const [hasApplied, setHasApplied] = useState(false);

  // Facets (gathered from raw rows — uses merged/linked fields explicitly)
  const facets = useMemo(() => {
    const uniq = (arr) =>
      Array.from(new Set(arr.filter(Boolean))).sort((a, b) =>
        String(a).localeCompare(String(b))
      );

    // helper safe getter
    const get = (r, path) => {
      try {
        if (!r) return undefined;
        const parts = path.split(".");
        let cur = r;
        for (const p of parts) {
          if (!cur) return undefined;
          cur = cur[p];
        }
        return cur;
      } catch {
        return undefined;
      }
    };

    // collect arrays
    const states = [];
    const cities = [];
    const countries = [];
    const job_titles = [];
    const skills = [];
    const companies = [];
    const websites = [];
    const employees_options = [];
    const revenue_options = [];
    const industries = [];

    for (const row of rowData || []) {
      const raw = row.__raw || {};
      const merged = raw.merged || {};
      const linked = raw.linked || {};

      // state: merged.normalized_state || merged.State || linked.normalized_state
      const st = get(merged, "normalized_state") || get(merged, "State") || get(linked, "normalized_state") || row.state;
      if (st) states.push(String(st).trim());

      // city: linked.Locality || merged.City
      const ct = get(linked, "Locality") || get(merged, "City") || row.city;
      if (ct) cities.push(String(ct).trim());

      // country: merged.Country || linked.Countries || linked.Location_Country
      const co = get(merged, "Country") || get(linked, "Countries") || get(linked, "Location_Country") || row.country;
      if (co) countries.push(String(co).trim());

      // job title: linked.Job_title
      const jt = get(linked, "Job_title") || row.job_title;
      if (jt) job_titles.push(String(jt).trim());

      // skills: linked.Skills (may be comma/semicolon separated)
      const sk = get(linked, "Skills");
      if (sk) {
        const toks = String(sk).split(/[;,]+/).map(s => s.trim()).filter(Boolean);
        for (const t of toks) skills.push(t);
      }

      // company: merged.Company || linked.Company_Name
      const comp = get(merged, "Company") || get(linked, "Company_Name") || row.company;
      if (comp) companies.push(String(comp).trim());

      // website/domain: linked.Company_Website || merged.normalized_website || merged.Web_Address
      const site = get(linked, "Company_Website") || get(merged, "normalized_website") || get(merged, "Web_Address") || row.website || row.domain;
      if (site) websites.push(String(site).trim());

      // employees options: merged.NumEmployees
      const emp = get(merged, "NumEmployees") || row.employees;
      if (emp) employees_options.push(String(emp).trim());

      // revenue options: merged.SalesVolume
      const rev = get(merged, "SalesVolume") || row.min_revenue || row.max_revenue;
      if (rev) revenue_options.push(String(rev).trim());

      // industries: prefer linked.Industry, linked.Industry_2, fallback to row.industry
      const indCandidates = [];
      const li = get(linked, "Industry");
      const li2 = get(linked, "Industry_2");
      if (li) indCandidates.push(li);
      if (li2) indCandidates.push(li2);
      if (row.industry) indCandidates.push(row.industry);
      for (const ii of indCandidates) {
        // if comma-separated, split into tokens
        if (String(ii).includes(",")) {
          String(ii).split(",").map(s => s.trim()).filter(Boolean).forEach(t => industries.push(t));
        } else {
          industries.push(String(ii).trim());
        }
      }
    }

    return {
      state_code: uniq(states),
      city: uniq(cities),
      country: uniq(countries),
      industry: uniq(industries),
      job_title: uniq(job_titles),
      gender: uniq(rowData.map((r) => r.contact_gender)),
      skills: uniq(skills),
      company: uniq(companies),
      website: uniq(websites),
      employees_options: uniq(employees_options),
      revenue_options: uniq(revenue_options),
    };
  }, [rowData]);

  /* ====== Column definitions (compact) ====== */
  // Helper: try multiple ways to find a user's role
  const getUserRole = () => {
    try {
      // 1) Try common localStorage keys
      const candidates = ['user', 'profile', 'authUser', 'appUser', 'currentUser'];
      for (const key of candidates) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (!parsed) continue;
          // common shapes: { role: 'admin' } or { user: { role: 'admin' } }
          if (parsed.role) return String(parsed.role).toLowerCase();
          if (parsed.user && parsed.user.role) return String(parsed.user.role).toLowerCase();
          if (parsed.data && parsed.data.role) return String(parsed.data.role).toLowerCase();
        } catch (e) {
          // not JSON — skip
        }
      }

      // 2) Try decoding JWT token payload (if token present)
      if (token && typeof token === 'string') {
        try {
          const parts = token.split('.');
          if (parts.length >= 2) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            // payload might have role, roles, user.role
            if (payload.role) return String(payload.role).toLowerCase();
            if (payload.roles && Array.isArray(payload.roles) && payload.roles.length) {
              // return first role
              return String(payload.roles[0]).toLowerCase();
            }
            if (payload.user && payload.user.role) return String(payload.user.role).toLowerCase();
          }
        } catch (e) {
          // ignore decode errors
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  };

  const role = getUserRole();
  const isAdmin = role && ['admin', 'super_admin', 'super-admin', 'super admin', 'superadmin'].includes(role);

  // People renderer (unchanged: shows avatar, full name, title, company, location)
  const peopleCellRenderer = useCallback((params) => {
    const r = params.data || {};
    const name = (r.contact_name || r.name || "").trim();
    const title = (r.job_title || "").trim();
    const company = (r.company || r.domain || "").trim();
    const hasSub = !!(title || company);
    const loc = [r.city, r.state].filter(Boolean).join(", ");

    const lk = normalizeUrl(r.linkedin_url);
    const fb = normalizeUrl(r.facebook || r.facebook_url);
    const tw = normalizeUrl(r.twitter || r.twitter_url);

    const socials = [
      lk && { Icon: Linkedin, href: lk, title: "LinkedIn" },
      fb && { Icon: Facebook, href: fb, title: "Facebook" },
      tw && { Icon: Twitter, href: tw, title: "Twitter" },
    ].filter(Boolean);

    return (
      <div className="flex items-center gap-2 py-1 min-w-0 leading-4">
        <img
          src={DUMMY_AVATAR}
          alt=""
          className="w-8 h-8 rounded-full border bg-slate-100 object-cover shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="font-semibold text-[13px] text-slate-900 truncate"
              title={name || "--"}
            >
              {name || "--"}
            </div>
            {socials.length > 0 && (
              <div className="inline-flex items-center gap-1 text-slate-500">
                {socials.map(({ Icon, href, title }, i) => (
                  <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    title={title}
                    className="hover:text-slate-700"
                  >
                    <Icon className="w-3 h-3" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {hasSub && (
            <div
              className="text-[11.5px] text-slate-600 truncate"
              title={`${title}${title && company ? " · " : ""}${company}`}
            >
              {title || ""}
              {title && company ? " · " : ""}
              {company || ""}
            </div>
          )}

          {loc && (
            <div
              className="flex items-center gap-1 text-[11.5px] text-slate-500 truncate"
              title={loc}
            >
              <MapPinIcon className="w-3 h-3" />
              <span className="truncate">{loc}</span>
            </div>
          )}
        </div>
      </div>
    );
  }, []);

  const companyCellRenderer = useCallback((params) => {
    const r = params.data || {};
    const company = r.company || "";
    const website = r.website || r.domain || "";
    const loc = [r.city, r.state, r.country].filter(Boolean).join(", ");
    return (
      <div className="py-1 min-w-0 leading-4">
        <div className="font-medium text-[13px] text-slate-800 truncate" title={company || "--"}>
          {company || "--"}
        </div>
        {loc && (
          <div className="mt-0 flex items-center gap-1 text-[11.5px] text-slate-600 truncate" title={loc}>
            <MapPinIcon className="w-3 h-3" />
            <span className="truncate">{loc}</span>
          </div>
        )}
        <div className="mt-0 flex items-center gap-1 text-[11.5px] text-slate-600 truncate">
          <Globe2 className="w-3 h-3" />
          {website ? (
            <a
              href={/^https?:\/\//.test(website) ? website : `https://${website}`}
              target="_blank"
              rel="noreferrer"
              className="text-sky-700 hover:underline truncate"
            >
              {website}
            </a>
          ) : (
            <span className="text-slate-400">--</span>
          )}
        </div>
      </div>
    );
  }, []);

  // CONTACT: show full values and add copy buttons
  const contactCellRenderer = useCallback((params) => {
    const r = params.data || {};

    const copyToClipboard = async (text, label) => {
      try {
        if (!text) return;
        await navigator.clipboard.writeText(String(text));
        // small visual feedback: use alert as simple fallback
        // eslint-disable-next-line no-alert
        alert(`${label} copied to clipboard`);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("copy failed", e);
      }
    };

    const phoneVal = r.phone || "";
    const emailVal = r.email || "";

    return (
      <div className="flex flex-col gap-1 py-1 leading-4">
        <div className="flex items-center gap-2 text-[12px] text-slate-700">
          <Phone className="w-3 h-3 text-slate-500" />
          {phoneVal ? (
            <>
              <span className="truncate">{phoneVal}</span>
            </>
          ) : (
            <span className="text-slate-400">--</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[12px] text-slate-700">
          <Mail className="w-3 h-3 text-slate-500" />
          {emailVal ? (
            <>
              <span className="truncate">{emailVal}</span>
            </>
          ) : (
            <span className="text-slate-400">--</span>
          )}
        </div>
      </div>
    );
  }, []);

  // Base columns (unchanged except we keep People etc)
  const baseColumns = useMemo(
    () => [
      {
        headerName: "",
        field: "__sel__",
        checkboxSelection: true,
        headerCheckboxSelection: true,
        maxWidth: 44,
        suppressMenu: true,
        pinned: "left",
        resizable: false,
      },
      { headerName: "Employees", field: "employees", flex: 0.6, minWidth: 110, sortable: true },
      {
        headerName: "Revenue (Min–Max)",
        field: "min_revenue",
        flex: 0.8,
        minWidth: 160,
        valueGetter: (p) => {
          const a = p.data?.min_revenue,
            b = p.data?.max_revenue;
          return a || b ? `${a || "–"} – ${b || "–"}` : "";
        },
        sortable: true,
      },
    ],
    [peopleCellRenderer, companyCellRenderer, contactCellRenderer]
  );

  // Extra columns (same) — NOTE: removed "id" and added first_name, last_name
  const ALL_FIELDS = [
    "name", // will show as "Full name"
    "first_name",
    "last_name",
    "phone",
    "median_income_census_area",
    "address",
    "city",
    "state",
    "zip",
    "sic",
    "fax",
    "toll_free_phone",
    "county",
    "company",
    "job_title",
    "employees",
    "email",
    "website",
    "domain",
    "linkedin_url",
    "facebook",
    "twitter",
    "sales_volume",
    "min_revenue",
    "max_revenue",
    "created_at",
  ];
  const numericRight = new Set([
    "employees",
    "median_income_census_area",
    "sales_volume",
    "min_revenue",
    "max_revenue",
    "zip",
    "sic",
  ]);

  // Exclude fields that are already present in baseColumns to avoid duplicates
  const excludeFromExtras = useMemo(() => {
    try {
      return new Set((baseColumns || []).map((c) => c.field).filter(Boolean));
    } catch {
      return new Set();
    }
  }, [baseColumns]);

  const extraColumns = useMemo(() => {
    return ALL_FIELDS.filter((f) => !excludeFromExtras.has(f)).map((field) => {
      const def = {
        headerName: field === "name" ? "Full name" : toHeader(field),
        field,
        minWidth: 140,
        sortable: true,
        cellRenderer: undefined,
        type: numericRight.has(field) ? "rightAligned" : undefined,
        // default fallback formatter for blank/null values in these standard columns
        valueFormatter: (params) => {
          const v = params.value;
          if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) return "--";
          return v;
        },
      };
      if (["website", "domain", "linkedin_url", "facebook", "twitter"].includes(field)) {
        def.cellRenderer = LinkCell;
        def.minWidth = 180;
      }
      if (field === "created_at") {
        def.cellRenderer = DateCell;
        def.minWidth = 150;
      }
      // For phone/email fields show raw value (we already have contact renderer but keep these as simple columns)
      return def;
    });
  }, [excludeFromExtras]);

  // ---- NEW: desired column order ----
  const columnDefs = useMemo(() => {
    // Build a map of all available column defs by field
    const allDefs = [...baseColumns, ...extraColumns];
    const defMap = new Map();
    for (const d of allDefs) {
      if (d && d.field) defMap.set(d.field, d);
    }

    // Keep the selection column first (if present)
    const selCol = defMap.get("__sel__") || (baseColumns && baseColumns.length ? baseColumns[0] : null);

    // The exact desired sequence requested by the user:
    const desiredOrder = [
      "name",        // Full Name
      "first_name",
      "last_name",
      "phone",
      "email",
      "city",
      "state",
      "company",
      "job_title",
      "website",
      "domain",
      "employees",
      "linkedin_url",
      "facebook",
      "twitter",
      "sales_volume",
      "max_revenue"
    ];

    const used = new Set();
    const finalCols = [];

    // push selection column first
    if (selCol) {
      finalCols.push(selCol);
      if (selCol.field) used.add(selCol.field);
    }

    // push desired ordered fields (only if we have definitions for them)
    for (const f of desiredOrder) {
      const d = defMap.get(f);
      if (d) {
        finalCols.push(d);
        used.add(f);
      }
    }

    // append remaining columns that were not included above, preserving original order
    for (const d of allDefs) {
      if (!d || !d.field) continue;
      if (!used.has(d.field)) {
        finalCols.push(d);
        used.add(d.field);
      }
    }

    return finalCols;
  }, [baseColumns, extraColumns]);

  // defaultColDef includes a valueFormatter that returns -- for blank values,
  // but custom cellRenderers (people/company/contact) already handle fallbacks.
  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      resizable: true,
      suppressHeaderMenuButton: true,
      valueFormatter: (params) => {
        // Keep cellRenderer output unchanged (AG uses cellRenderer over valueFormatter),
        // but if there's no renderer and blank value, show '--'
        if (params && (params.value === undefined || params.value === null || (typeof params.value === "string" && params.value.trim() === ""))) return "--";
        return params && params.value !== undefined ? params.value : "";
      },
    }),
    []
  );

  /* ---------- Build query ---------- */
  const buildQuery = (filters) => {
    const q = {};
    const set = (k, v) => {
      if (v === undefined || v === null) return;
      if (typeof v === "string" && v.trim() === "") return;
      if (Array.isArray(v) && v.length === 0) return;
      q[k] = v;
    };

    set("company_name", filters.company_name && filters.company_name.join ? filters.company_name.join(",") : filters.company_name);
    set("city", filters.city && filters.city.join ? filters.city.join(",") : filters.city);
    set("zip_code", filters.zip_code);
    set("website", filters.website && filters.website.join ? filters.website.join(",") : filters.website);
    set("contact_full_name", filters.contact_full_name);

    set("state_code", filters.state_code && filters.state_code.join ? filters.state_code.join(",") : filters.state_code);
    set("company_location_country", filters.company_location_country && filters.company_location_country.join ? filters.company_location_country.join(",") : filters.company_location_country);
    set("industry", filters.industry && filters.industry.join ? filters.industry.join(",") : filters.industry);
    set("industry_source", filters.industry_source || "");
    set("job_title", filters.job_title && filters.job_title.join ? filters.job_title.join(",") : filters.job_title);
    set("contact_gender", filters.contact_gender && filters.contact_gender.join ? filters.contact_gender.join(",") : filters.contact_gender);
    set("skills", filters.skills_tokens && filters.skills_tokens.join ? filters.skills_tokens.join(",") : filters.skills_tokens);

    if (filters.public_company !== "any") set("public_company", filters.public_company);
    if (filters.franchise_flag !== "any") set("franchise_flag", filters.franchise_flag);

    // employees and revenue (sent as CSV lists)
    set("employees", filters.employees && filters.employees.join ? filters.employees.join(",") : filters.employees);
    set("sales_volume", filters.sales_volume && filters.sales_volume.join ? filters.sales_volume.join(",") : filters.sales_volume);

    // quick keys (phone, email, domain)
    set("phone", filters.phone);
    set("normalized_email", filters.normalized_email);
    set("domain", filters.domain && filters.domain.join ? filters.domain.join(",") : filters.domain);

    return q;
  };

  // -----------------------
  // Normalize server row -> grid row
  // -----------------------
  const normalizeRow = (raw = {}) => {
    const merged = raw.merged || {};
    const linked = raw.linked || {};

    // Helper to pick the first non-empty value
    const pick = (...keys) => {
      for (const k of keys) {
        if (!k) continue;
        const v = k.includes(".")
          ? k.split(".").reduce((o, p) => (o ? o[p] : undefined), raw)
          : raw[k];
        if (v !== undefined && v !== null && String(v).trim() !== "") return v;
      }
      return "";
    };

    const id = raw._id || pick("id", "merged.id", "linked.id");
    const fullName =
      raw.name ||
      pick("merged.normalized_full_name", "merged.Name", "linked.Full_name") ||
      merged.normalized_full_name ||
      merged.Name ||
      linked.Full_name ||
      "";
    // split fullName into first & last (basic heuristic)
    let first_name = "";
    let last_name = "";
    if (fullName && String(fullName).trim()) {
      const parts = String(fullName).trim().split(/\s+/);
      first_name = parts[0] || "";
      last_name = parts.length > 1 ? parts.slice(1).join(" ") : "";
    }

    const name = fullName || "";

    const company =
      raw.company ||
      pick("merged.Company", "merged.normalized_company_name", "linked.Company_Name") ||
      merged.Company ||
      merged.normalized_company_name ||
      linked.Company_Name ||
      "";
    const job_title =
      raw.job_title ||
      pick("merged.Title_Full", "linked.Job_title") ||
      merged.Title_Full ||
      linked.Job_title ||
      "";
    const city =
      raw.city ||
      pick("merged.City", "linked.Locality") ||
      merged.City ||
      linked.Locality ||
      "";
    const state =
      raw.state ||
      pick("merged.State", "linked.normalized_state", "merged.normalized_state") ||
      merged.State ||
      linked.normalized_state ||
      "";
    const country =
      raw.country ||
      pick("merged.Country", "linked.Countries", "linked.Location_Country") ||
      merged.Country ||
      linked.Countries ||
      linked.Location_Country ||
      "";
    const phone =
      raw.phone ||
      pick("merged.Telephone_Number", "merged.Phone", "linked.Phone_numbers", "linked.Mobile") ||
      merged.Telephone_Number ||
      merged.Phone ||
      linked.Phone_numbers ||
      linked.Mobile ||
      "";
    const email =
      raw.email ||
      pick("merged.normalized_email", "merged.Email", "linked.normalized_email", "linked.Emails") ||
      merged.normalized_email ||
      merged.Email ||
      linked.normalized_email ||
      linked.Emails ||
      "";
    const website =
      raw.website ||
      pick("linked.Company_Website", "merged.normalized_website", "merged.Web_Address") ||
      linked.Company_Website ||
      merged.normalized_website ||
      merged.Web_Address ||
      "";
    const domain = raw.domain || website || "";
    const employees =
      raw.employees ||
      pick("merged.NumEmployees") ||
      merged.NumEmployees ||
      "";
    const min_revenue =
      raw.min_revenue ||
      pick("merged.SalesVolume") ||
      merged.SalesVolume ||
      "";
    const max_revenue = min_revenue;
    const linkedin_url =
      raw.linkedin_url ||
      pick("merged.Linkedin_URL", "linked.LinkedIn_URL") ||
      merged.Linkedin_URL ||
      linked.LinkedIn_URL ||
      "";

    return {
      _id: id || raw._id,
      id,
      contact_name: name || "",
      name,
      first_name,
      last_name,
      company,
      job_title,
      city,
      state,
      country,
      phone,
      email,
      website,
      domain,
      employees,
      min_revenue,
      max_revenue,
      linkedin_url,
      __raw: raw,
    };
  };

  // helper for nested safe-get (used occasionally)
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

 /* ---------- Server-paginated fetch for a specific page ---------- */
  const fetchPage = async (pageNumber = 0, overrides = {}) => {
    // Ensure the UI renders the grid and overlay on first search click:
    setHasApplied(true);
    setLoading(true);

    try {
      // Merge filters: base filters `f` plus `overrides`.
      // The order below means `overrides` will take precedence.
      const mergedFilters = { ...f, ...overrides };

      // If user typed email in top box, prefer that and sync to filter state
      if (emailInput && emailInput.trim() !== "") {
        mergedFilters.normalized_email = emailInput.trim();
        setF((s) => ({ ...s, normalized_email: emailInput.trim() }));
      }

      const params = buildQuery(mergedFilters);
      params.limit = pageSize;
      params.offset = Math.max(0, pageNumber * pageSize);

      const res = await api.get("/api/data/leads", { params });
      const payload = res?.data ?? {};

      // response shape: { meta: { total }, data: [...] } OR array
      let hits = [];
      let total = 0;
      if (Array.isArray(payload)) {
        hits = payload;
        total = payload.length;
      } else {
        hits = Array.isArray(payload.data) ? payload.data : []; 
        const metaTotal = payload.meta && (payload.meta.total || payload.meta.count);
        total = (metaTotal !== undefined && metaTotal !== null) ? metaTotal : hits.length;
      }

      const normalized = hits.map((h) => normalizeRow(h));
      setRowData(normalized); // keep last fetched page as rowData
      setViewRows(normalized);
      setSelectedCount(0);
      setPage(pageNumber);
      setTotalHits(Number(total) || 0);
    } catch (e) {
      console.error("fetchPage error", e);
      setRowData([]);
      setViewRows([]);
      setSelectedCount(0);
      setTotalHits(0);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Search handlers ---------- */
  const runSearch = async () => {
    // run fresh search with page=0
    await fetchPage(0);
  };

  // supply overrides directly into fetchPage to avoid stale-setF
  const runSearchWithOverrides = async (overrides, pageNumber = 0) => {
    setF((s) => ({ ...s, ...overrides }));
    await fetchPage(pageNumber, overrides);
  };

  const clearFilters = () => {
    setF(initialFilters);
    setRowData([]);
    setViewRows([]);
    setHasApplied(false);
    setSelectedCount(0);
    setTotalHits(0);
    setPage(0);
    setEmailInput("");
  };

  // selection
  const onSelectionChanged = useCallback(() => {
    const count = gridRef.current?.api?.getSelectedNodes()?.length || 0;
    setSelectedCount(count);
  }, []);

  // when grid ready, restore hidden columns from localStorage (or state)
  const onGridReady = useCallback(() => {
    try {
      const stored = localStorage.getItem("dashboard_hidden_columns");
      const hidden = stored ? JSON.parse(stored) : [];
      if (Array.isArray(hidden) && hidden.length && gridRef.current?.columnApi) {
        hidden.forEach((field) => {
          try {
            gridRef.current.columnApi.setColumnVisible(field, false);
          } catch (e) {
            // ignore missing fields
          }
        });
      }
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  // -----------------------
  // Active chips (include phone / email / domain)
  // -----------------------
  const activeChips = useMemo(() => {
    const chips = [];
    const seen = new Set();
    const push = (label, onRemove) => {
      if (seen.has(label)) return;
      seen.add(label);
      chips.push({ label, onRemove });
    };

    if (f.state_code && f.state_code.length)
      f.state_code.forEach((v) =>
        push(`State: ${v}`, () => setF((s) => ({ ...s, state_code: s.state_code.filter((x) => x !== v) })))
      );
    if (f.company_location_country && f.company_location_country.length)
      f.company_location_country.forEach((v) =>
        push(
          `Country: ${v}`,
          () => setF((s) => ({ ...s, company_location_country: s.company_location_country.filter((x) => x !== v) }))
        )
      );
    if (f.industry && f.industry.length)
      f.industry.forEach((v) =>
        push(`Industry: ${v}`, () => setF((s) => ({ ...s, industry: s.industry.filter((x) => x !== v) })))
      );
    if (f.industry_source) push(`Industry Source: ${f.industry_source}`, () => setF((s) => ({ ...s, industry_source: "" })));

    if (f.contact_full_name)
      push(`Contact ~ ${f.contact_full_name}`, () => setF((s) => ({ ...s, contact_full_name: "" })));
    if (f.skills_tokens && f.skills_tokens.length)
      f.skills_tokens.forEach((v) =>
        push(
          `Skill: ${v}`,
          () => setF((s) => ({ ...s, skills_tokens: s.skills_tokens.filter((x) => x !== v) }))
        )
      );
    if (f.employees && f.employees.length)
      f.employees.forEach((v) =>
        push(`Employees: ${v}`, () => setF((s) => ({ ...s, employees: s.employees.filter((x) => x !== v) })))
      );
    if (f.sales_volume && f.sales_volume.length)
      f.sales_volume.forEach((v) =>
        push(`Revenue: ${v}`, () => setF((s) => ({ ...s, sales_volume: s.sales_volume.filter((x) => x !== v) })))
      );

    // Quick search chips
    if (f.phone) push(`Phone: ${f.phone}`, () => setF((s) => ({ ...s, phone: "" })));
    if (f.normalized_email) push(`Email: ${f.normalized_email}`, () => setF((s) => ({ ...s, normalized_email: "" })));
    if (f.domain && f.domain.length) f.domain.forEach((v) => push(`Domain: ${v}`, () => setF((s) => ({ ...s, domain: s.domain.filter(x => x !== v) }))));

    return chips;
  }, [f]);

  // ---- Dynamic grid height so footer never gets covered ----
  const GRID_BASE =1000; // original target height
  const gridHeight = Math.max(470, GRID_BASE - (hasApplied && activeChips.length ? chipBarH : 0));

  // -----------------------
  // Quick-search route mapping
  // -----------------------
  const quickMap = {
    "/search-phone": { key: "phone", placeholder: "Enter phone (e.g. +1 415 555 0123 or 4155550123)" },
    "/search-area-code": { key: "phone", placeholder: "Enter area code (e.g. 415)" },
    "/search-email": { key: "normalized_email", placeholder: "Enter email or partial (e.g. alice@, @gmail.com)" },
    "/search-domain": { key: "domain", placeholder: "Enter domain or website (e.g. example.com)" },
    "/search-name": { key: "contact_full_name", placeholder: "Enter full or partial name (e.g. John Smith)" },
  };
  const isQuickPage = pathname !== "/dashboard" && quickMap[pathname];

  // Handler for Quick Search input
  const handleQuickSearch = () => {
    if (!isQuickPage) return;
    const { key } = quickMap[pathname];
    const overrides = {};
    overrides[key] = quickInput;
    runSearchWithOverrides(overrides);
  };

  // Pagination controls (Prev/Next)
  const totalPages = Math.max(1, Math.ceil((totalHits || 0) / pageSize));
  const onPrev = () => {
    if (page <= 0) return;
    fetchPage(page - 1);
  };
  const onNext = () => {
    if (page + 1 >= totalPages) return;
    fetchPage(page + 1);
  };

  // When pageSize changes, refetch from page 0
  useEffect(() => {
    if (!hasApplied) return;
    fetchPage(0);
  }, [pageSize]);

  // human-friendly total display; if backend is capped at 10000, show "10,000+"
  const totalHitsDisplay = useMemo(() => {
    if (!totalHits) return "0";
    if (totalHits >= 10000) return `${Number(totalHits).toLocaleString()}+`;
    return Number(totalHits).toLocaleString();
  }, [totalHits]);

  /* ---------- COLUMN VISIBILITY CONTROLS ---------- */
  // store set of hidden column fields in local state
  const [hiddenCols, setHiddenCols] = useState(() => {
    try {
      const v = localStorage.getItem("dashboard_hidden_columns");
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  });

  // Columns dropdown open state
  const [colsOpen, setColsOpen] = useState(false);

  // Build list of visible/hidden items from columnDefs
  // NOTE: deduplicate by `field` to avoid duplicate keys in the rendered checkbox list.
  const allColumnItems = useMemo(() => {
    const map = new Map();
    (columnDefs || []).forEach((c) => {
      if (!c || !c.field) return;
      if (!map.has(c.field)) {
        map.set(c.field, { field: c.field, headerName: c.headerName || toHeader(c.field) });
      }
      // if the field already exists, we keep first occurrence (baseColumns first)
    });
    return Array.from(map.values());
  }, [columnDefs]);

  // Update AG Grid and localStorage when hiddenCols changes
  useEffect(() => {
    try {
      localStorage.setItem("dashboard_hidden_columns", JSON.stringify(hiddenCols || []));
    } catch (e) {
      // ignore
    }
    if (!gridRef.current?.columnApi) return;
    // iterate all columnDefs fields and set visibility based on hiddenCols
    const allFields = allColumnItems.map((c) => c.field);
    allFields.forEach((field) => {
      try {
        const visible = !(hiddenCols || []).includes(field);
        gridRef.current.columnApi.setColumnVisible(field, visible);
      } catch (e) {
        // ignore
      }
    });
  }, [hiddenCols, allColumnItems]);

  const toggleColumn = (field) => {
    setHiddenCols((prev) => {
      const isHidden = (prev || []).includes(field);
      if (isHidden) {
        // remove from hidden => show
        const next = (prev || []).filter((f) => f !== field);
        return next;
      } else {
        // add to hidden => hide
        return [...(prev || []), field];
      }
    });
  };

  const selectAllColumns = () => {
    // Clear hiddenCols (all visible)
    setHiddenCols([]);
    // Ensure grid shows all
    if (gridRef.current?.columnApi) {
      allColumnItems.forEach((c) => {
        try {
          gridRef.current.columnApi.setColumnVisible(c.field, true);
        } catch {}
      });
    }
  };

  const clearAllColumns = () => {
    // Hide all columns that have a field (you might want to keep selection column visible; change if desired)
    const toHide = allColumnItems.map((c) => c.field);
    setHiddenCols(toHide);
    if (gridRef.current?.columnApi) {
      toHide.forEach((f) => {
        try {
          gridRef.current.columnApi.setColumnVisible(f, false);
        } catch {}
      });
    }
  };

  // helper to check if a column is currently checked (visible)
  const isColumnVisible = (field) => {
    return !(hiddenCols || []).includes(field);
  };

  const resetColumns = () => {
    setHiddenCols([]);
    // ensure grid shows all
    if (gridRef.current?.columnApi) {
      columnDefs.forEach((c) => {
        if (c.field) {
          try {
            gridRef.current.columnApi.setColumnVisible(c.field, true);
          } catch { }
        }
      });
    }
    try {
      localStorage.removeItem("dashboard_hidden_columns");
    } catch {}
  };

  /* =======================
     EXPORT HELPERS (client-side CSV/Excel)
     ======================= */

  // Get ordered visible columns (returns array of {field, headerName})
  const getVisibleColumnsOrdered = () => {
    try {
      // prefer columnApi to get current visible order/visibility
      const colApi = gridRef.current?.columnApi;
      if (colApi && typeof colApi.getAllDisplayedColumns === "function") {
        const displayed = colApi.getAllDisplayedColumns(); // array of Column objects
        return displayed
          .map((c) => {
            const def = c.getColDef ? c.getColDef() : c.colDef;
            return { field: def?.field || def?.colId || "", headerName: def?.headerName || toHeader(def?.field || def?.colId || "") };
          })
          .filter((x) => x.field); // filter out columns with no field (e.g. selection if anonymous)
      }
    } catch (e) {
      // fall back
    }
    // fallback: use columnDefs and hiddenCols
    return (columnDefs || [])
      .filter((c) => c && c.field && !(hiddenCols || []).includes(c.field))
      .map((c) => ({ field: c.field, headerName: c.headerName || toHeader(c.field) }));
  };

  // Build export-ready 2D array (headers + rows). Use raw values from viewRows[field]
  const buildExportRows = () => {
    const cols = getVisibleColumnsOrdered();
    const headers = cols.map((c) => c.headerName || toHeader(c.field));
    const rows = (viewRows || []).map((r) => {
      return cols.map((c) => {
        const field = c.field;
        // attempt to read value; fall back to nested path if provided
        let val = r && Object.prototype.hasOwnProperty.call(r, field) ? r[field] : undefined;
        // if undefined and field looks nested (contains '.'), resolve
        if ((val === undefined || val === null) && field && field.includes('.')) {
          val = getNested(r, field);
        }
        // if still undefined, try fallback lookups for common possibilities
        if (val === undefined || val === null) {
          val = "";
        }
        // convert arrays/objects to JSON/text
        if (typeof val === "object") {
          try {
            val = JSON.stringify(val);
          } catch {
            val = String(val);
          }
        }
        return val;
      });
    });
    return { headers, rows, cols };
  };

  // Download helper
  const downloadFile = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Export CSV
  const exportCSV = () => {
    const { headers, rows } = buildExportRows();
    const escapeCsv = (s) => {
      if (s === null || s === undefined) return "";
      const str = String(s);
      if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const lines = [];
    lines.push(headers.map(escapeCsv).join(","));
    for (const row of rows) {
      lines.push(row.map(escapeCsv).join(","));
    }
    const csv = lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadFile(blob, `leads_export_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`);
  };

  // Export Excel (.xls using HTML table blob) - simple and works with Excel
  const exportExcel = () => {
    const { headers, rows } = buildExportRows();
    let html = `<html><head><meta charset="utf-8"/></head><body><table border="1" cellpadding="4" cellspacing="0"><thead><tr>`;
    html += headers.map(h => `<th>${String(h).replace(/</g,'&lt;').replace(/>/g,'&gt;')}</th>`).join("");
    html += `</tr></thead><tbody>`;
    rows.forEach(r => {
      html += `<tr>${r.map(cell => `<td>${String(cell ?? "").replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>`).join("")}</tr>`;
    });
    html += `</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    downloadFile(blob, `leads_export_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.xls`);
  };

  /* ================
     BACKEND EXPORT (Export All Records job)
     ================ */

  // Start export job on server. format = 'csv' | 'xls'
  const startExportJob = async (format = "csv") => {
    setExportError(null);
    setExporting(true);
    setExportJob(null);
    setExportProgress(0);

    try {
      // build server-side query from current filters
      const query = buildQuery(f || {});
      // Send POST to /api/export/start
      const resp = await api.post("/api/export/start", { query, format });
      const payload = resp?.data || {};
      const jobId = payload.jobId || payload.job_id || payload.id;
      if (!jobId) {
        throw new Error("Export job not started (no jobId returned).");
      }
      const job = { jobId, status: payload.status || "running", file: payload.file || null };
      setExportJob(job);

      // begin polling
      pollExportStatus(job.jobId);
    } catch (err) {
      console.error("startExportJob error", err);
      setExportError(err && err.message ? err.message : "Failed to start export");
      setExporting(false);
    }
  };

  // const pollExportStatus = async (jobId) => {
  //   // clear previous poll if present
  //   if (pollRef.current) {
  //     clearInterval(pollRef.current);
  //     pollRef.current = null;
  //   }

  //   // immediate fetch then interval
  //   const fetchStatus = async () => {
  //     try {
  //       const resp = await api.get(`/api/export/status/${encodeURIComponent(jobId)}`);
  //       const data = resp?.data || {};
  //       const status = data.status || data.state || "running";
  //       const progress = typeof data.progress === "number" ? data.progress : (data.percent || 0);
  //       const file = data.file || data.result_file || null;

  //       setExportJob((s) => ({ ...(s || {}), jobId, status, file }));
  //       setExportProgress(Number(progress) || 0);

  //       if (status === "completed" || status === "done" || status === "finished") {
  //         // stop polling
  //         if (pollRef.current) {
  //           clearInterval(pollRef.current);
  //           pollRef.current = null;
  //         }
  //         setExporting(false);
  //         setExportProgress(100);
  //         return;
  //       }

  //       if (status === "failed" || status === "error") {
  //         if (pollRef.current) {
  //           clearInterval(pollRef.current);
  //           pollRef.current = null;
  //         }
  //         setExporting(false);
  //         setExportError(data.error || "Export failed on server");
  //         return;
  //       }
  //       // otherwise keep polling
  //     } catch (err) {
  //       console.error("pollExportStatus error", err);
  //       // Don't immediately bail — record error and continue polling a few times.
  //       setExportError(err && err.message ? err.message : "Status poll failed");
  //     }
  //   };

  //   // first call immediately
  //   fetchStatus();

  //   // then set interval (every 3s)
  //   pollRef.current = setInterval(fetchStatus, 3000);
  // };

  // Download completed file (open in new tab or stream)
  const downloadExportFile = async (filePath) => {
    if (!filePath) return;
    try {
      // Try to download via API (preserve auth) as blob
      const resp = await api.get(`/api/export/download/${encodeURIComponent(filePath)}`, { responseType: "blob" });
      const contentDisposition = (resp.headers && (resp.headers["content-disposition"] || resp.headers["Content-Disposition"])) || "";
      let filename = filePath.split("/").pop();
      // attempt to parse filename from content-disposition
      const match = /filename\*?=(?:UTF-8'')?["']?([^;"']+)/i.exec(contentDisposition);
      if (match && match[1]) filename = decodeURIComponent(match[1]);
      downloadFile(resp.data, filename);
    } catch (err) {
      console.error("downloadExportFile error", err);
      // fallback: open direct link in new tab (if server exposes public path)
      const base = (api && api.defaults && api.defaults.baseURL) ? api.defaults.baseURL.replace(/\/$/, "") : "";
      const url = `${base}/api/export/download/${encodeURIComponent(filePath)}`;
      window.open(url, "_blank");
    }
  };

  // Cancel export polling & clear state
  const cancelExport = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setExporting(false);
    setExportJob(null);
    setExportProgress(0);
    setExportError(null);
  };

  // Clean up poll on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, []);

  /* =======================
     RENDER
     ======================= */
  return (
  <div className="h-[calc(96vh-0px)] flex">
    <FiltersRail
      open={filtersOpen}
      setOpen={setFiltersOpen}
      f={f}
      setF={setF}
      facets={facets}
      onSearch={runSearch}
      onClear={clearFilters}
    />

    {/* main column now a vertical flex so footer sits at bottom */}
    <main className="flex-1 px-2 pt-0 pb-6 -mt-3 flex flex-col">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Lead Finder</h1>
        </div>

        {/* Header controls: Rows selector + Columns filter + Export buttons */}
        <div className="flex items-center gap-2">
  {/* Export buttons (only visible to admin roles) */}
  {isAdmin ? (
    <>
      <div className="hidden sm:flex items-center gap-2">
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-3 py-1 border rounded-md bg-white text-sm text-slate-700 hover:bg-slate-50"
          title="Export CSV"
        >
          <Download className="w-4 h-4" />
          CSV
        </button>
        <button
          onClick={exportExcel}
          className="inline-flex items-center gap-2 px-3 py-1 border rounded-md bg-white text-sm text-slate-700 hover:bg-slate-50"
          title="Export Excel"
        >
          <FileText className="w-4 h-4" />
          Excel
        </button>

        {/* Export All Records (backend) */}
        <div className="inline-flex items-center gap-2">
          <button
            onClick={() => startExportJob("csv")}
            disabled={exporting}
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-md border ${exporting ? "bg-slate-200 text-slate-600 cursor-not-allowed" : "bg-white text-slate-700 hover:bg-slate-50"}`}
            title="Export all records via backend (CSV)"
          >
            {exporting ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /></svg>
                Exporting...
              </>
            ) : (
              <>
                <File className="w-4 h-4" />
                Export All (CSV)
              </>
            )}
          </button>
        </div>
      </div>

      {/* small responsive fallback for mobile */}
      <div className="sm:hidden inline-flex items-center gap-1">
        <button onClick={exportCSV} className="p-2 border rounded-md" title="CSV">
          <Download className="w-4 h-4" />
        </button>
        <button onClick={exportExcel} className="p-2 border rounded-md" title="Excel">
          <FileText className="w-4 h-4" />
        </button>
        <button
          onClick={() => startExportJob("csv")}
          disabled={exporting}
          className="p-2 border rounded-md"
          title="Export All (CSV)"
        >
          <File className="w-4 h-4" />
        </button>
      </div>
    </>
  ) : null}
</div>

      </div>

      {/* Export job status area (shown to admin only) */}
      {isAdmin && (exportJob || exporting || exportError) && (
        <div className="mb-2">
          <div className="bg-white border rounded-xl shadow-sm px-3 py-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <strong>Export job:</strong>
                  <span className="text-sm text-slate-600">{exportJob?.jobId || (exporting ? "starting..." : "—")}</span>
                  {exportJob?.status && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded text-white" style={{ background: exportJob.status === "completed" ? "#16a34a" : exportJob.status === "failed" ? "#dc2626" : "#0ea5e9" }}>
                      {exportJob.status}
                    </span>
                  )}
                </div>

                <div className="mt-2">
                  <div className="w-full bg-slate-100 rounded h-2">
                    <div className="h-2 rounded" style={{ width: `${Math.min(100, Math.max(0, exportProgress))}%`, background: "#06b6d4" }} />
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {exporting ? `Exporting... ${exportProgress || 0}%` : (exportJob?.status ? `Status: ${exportJob.status} ${exportProgress ? ` - ${exportProgress}%` : ""}` : "")}
                    {exportError && <span className="text-red-600 ml-2">Error: {exportError}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {exportJob?.file && (
                  <button
                    onClick={() => downloadExportFile(exportJob.file)}
                    className="inline-flex items-center gap-2 px-3 py-1 border rounded-md bg-white text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                )}

                {exporting && (
                  <button
                    onClick={cancelExport}
                    className="inline-flex items-center gap-2 px-3 py-1 border rounded-md bg-white text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chips ABOVE the grid; we measure this block and shrink the grid below */}
      {hasApplied && activeChips.length > 0 && (
        <div ref={chipBarRef} className="mb-2">
          <div className="bg-white border rounded-xl shadow-sm px-3 py-2 flex flex-wrap items-center gap-1">
            <span className="text-[11px] font-medium text-slate-600 mr-1">Filters:</span>
            {activeChips.map((c, i) => (
              <Chip key={i} onRemove={c.onRemove}>
                {c.label}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* If quick page and not applied: show input area (no hero) */}
      {isQuickPage && !hasApplied ? (
        <div className="mb-4">
          <div className="w-full max-w-3xl">
            <div className="relative">
              <input
                className="w-full h-11 pl-3 pr-24 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200"
                placeholder={quickMap[pathname].placeholder}
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleQuickSearch(); }}
              />
              <button
                type="button"
                onClick={handleQuickSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 border rounded-md px-3 py-1 text-sm text-white bg-sky-600 hover:bg-sky-700"
              >
                <SearchIcon className="w-4 h-4 text-white" />
                Search
              </button>
            </div>
            <div className="mt-3 text-sm text-slate-500">Search specific to <strong>{quickMap[pathname].placeholder.split(" ")[0]}</strong>. You can still expand the filters on the left and refine results after searching.</div>
          </div>
        </div>
      ) : null}

      {/* Original hero on dashboard if not applied */}
      {!hasApplied && !isQuickPage ? (
        <div className="relative">
          <Hero />
        </div>
      ) : (
        <div
          className="relative ag-theme-quartz bg-white border rounded-xl shadow-sm"
          style={{
            height: "-webkit-fill-available",
            width: "100%",
            "--ag-header-background-color": "#deeff7ff",
            "--ag-header-foreground-color": "#2c2a2aff",
            "--ag-header-height": "44px",
            "--ag-border-color": "#e5e7eb",
            "--ag-header-column-separator-display": "block",
            "--ag-header-column-separator-color": "rgba(255,255,255,0.25)",
            "--ag-header-column-resize-handle-color": "rgba(255,255,255,0.5)",
          }}
        >
          <AgGridReact
            ref={gridRef}
            rowData={viewRows}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowSelection="multiple"
            pagination={false} /* using server pagination, so disable AG's client pagination UI */
            animateRows
            enableCellTextSelection
            suppressDragLeaveHidesColumns
            onSelectionChanged={onSelectionChanged}
            onGridReady={onGridReady}
            rowHeight={56}
          />

          {loading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
              <Spinner label="Loading data…" />
            </div>
          )}
        </div>
      )}

      {!loading && hasApplied && viewRows.length === 0 && (
        <div className="mt-2 text-xs text-slate-500">No data found.</div>
      )}

      {/* Server pagination footer — now anchored at the bottom of main */}
      {hasApplied && totalHits > 0 && (
        <div className="mt-3 flex items-center justify-between">
          {/* LEFT: dropdown button for rows-per-page */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setPageOptionsOpen((s) => !s); }}
              className="inline-flex items-center gap-2 px-3 py-1 border rounded-md bg-white text-sm text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              Showing <span className="font-semibold">{Math.min(totalHits, pageSize)}</span> rows of <span className="font-semibold">{totalHitsDisplay}</span>
              <svg className={`w-4 h-4 transition-transform ${pageOptionsOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06-.02L10 10.88l3.71-3.69a.75.75 0 111.06 1.06l-4.24 4.22a.75.75 0 01-1.06 0L5.25 8.25a.75.75 0 01-.02-1.06z" />
              </svg>
            </button>

            {pageOptionsOpen && (
      <div
        className="absolute left-0 w-44 bg-white border rounded-md shadow-lg z-50"
        onClick={(e) => e.stopPropagation()}
        style={{ minWidth: 160, top: "-265px" }}
      >
        <div className="p-2 text-xs text-slate-500">Rows per page</div>
        <div className="max-h-56 overflow-auto divide-y">
          {PAGE_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                setPageOptionsOpen(false);
                setPageSize(Number(opt));
                if (hasApplied && typeof fetchPage === "function") {
                  fetchPage(0, {});
                }
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${Number(pageSize) === Number(opt) ? "font-medium text-sky-700" : "text-slate-700"}`}
            >
              {opt} rows
              {Number(pageSize) === Number(opt) && <span className="ml-2 text-[10px] text-slate-400">✓</span>}
            </button>
          ))}
        </div>
      </div>
    )}

          </div>

          {/* RIGHT: pager controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPrev}
              disabled={page <= 0}
              className="px-3 py-1 rounded-md border disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <div className="text-sm text-slate-600 px-2">
              Page <span className="font-medium">{page + 1}</span> of <span className="font-medium">{totalPages}</span>
            </div>
            <button
              onClick={onNext}
              disabled={page + 1 >= totalPages}
              className="px-3 py-1 rounded-md border disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </main>
  </div>
);
}
