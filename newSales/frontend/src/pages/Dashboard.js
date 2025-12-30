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
import CommonFilters from "../components/filters/CommonFilters";
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
  File,
} from "lucide-react";

/**
 * Dashboard.jsx (Rebuilt)
 * - Keeps existing UI/filters/grid/pagination/export-page features
 * - Fixes Export All (backend job) flow:
 *   - start job with current filters
 *   - persist job across refresh (localStorage)
 *   - poll status until done/error
 *   - download CSV as blob
 * - ✅ Adds full-page loader overlay for CSV/Excel page export until process completes
 */

/* ---------- Small helpers ---------- */
const toHeader = (s) =>
  String(s || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

/* ---------- Static US state codes ---------- */
const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
];

/* ---------- Small chip ---------- */
const Chip = ({ children, onRemove }) => (
  <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full mr-1 mb-1">
    {children}
    <button
      onClick={onRemove}
      className="text-blue-500 hover:text-blue-700"
      aria-label="Remove"
      type="button"
    >
      ×
    </button>
  </span>
);

/* ---------- Compact sidebar typography ---------- */
const labelCls =
  "block text-[10px] font-semibold text-slate-600 tracking-wide";
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
          className={`px-2 h-7 ${
            value === o.key
              ? "bg-sky-600 text-white"
              : "bg-white hover:bg-slate-50"
          }`}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
};

/* ---------- MultiSelect (lightweight) ---------- */
function MultiSelect({
  label,
  options = [],
  values = [],
  onChange,
  searchable = true,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
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
                type="button"
              >
                Clear
              </button>
              <button
                className="text-[10px] text-sky-600 hover:text-sky-800"
                onClick={() => setOpen(false)}
                type="button"
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
      <svg
        className="animate-spin h-8 w-8"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a 8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
        />
      </svg>
      <span className="text-xs text-slate-600">{label}</span>
    </div>
  );
}

/* ---------- Cell helpers ---------- */
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

function getNested(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
    else return undefined;
  }
  return cur;
}

/* ======================
   MAIN Dashboard View
   ====================== */
export default function Dashboard() {
  const gridRef = useRef(null);
  const chipBarRef = useRef(null);
  const exportPollRef = useRef(null);

  const [chipBarH, setChipBarH] = useState(0);

  const [rowData, setRowData] = useState([]);
  const [viewRows, setViewRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);

  // server pagination
  const [pageSize, setPageSize] = useState(100);
  const [page, setPage] = useState(0);
  const [totalHits, setTotalHits] = useState(0);

  const location = useLocation();
  const pathname = location.pathname || "/dashboard";
  const PAGE_OPTIONS = [100, 500, 1000,2000];
  const [pageOptionsOpen, setPageOptionsOpen] = useState(false);

  // Top global search
  const [globalSearch, setGlobalSearch] = useState("");

  // Top email input (kept from your file)
  const [emailInput, setEmailInput] = useState("");

  // export page (client-side) states
  const [pageExporting, setPageExporting] = useState(false);
  const [pageExportProgress, setPageExportProgress] = useState(0);
  const [pageExportStatus, setPageExportStatus] = useState("");
  const [activeExportBtn, setActiveExportBtn] = useState(null);

  // backend Export All job states
  const EXPORT_JOB_LS_KEY = "exportJobId";
  const [exportJob, setExportJob] = useState(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  // quick pages (kept)
  const [quickInput, setQuickInput] = useState("");

  // Auth
  const token = useAuthToken();
  if (!token) return <Navigate to="/login" replace />;

  // Filters rail open/close (kept)
  const [filtersOpen, setFiltersOpen] = useState(() => {
    const v = localStorage.getItem("leadFiltersCollapsed");
    return v === "0" || v === null;
  });
  useEffect(() => {
    localStorage.setItem("leadFiltersCollapsed", filtersOpen ? "0" : "1");
  }, [filtersOpen]);

  // close dropdown on click outside
  useEffect(() => {
    if (!pageOptionsOpen) return;
    const onDocClick = () => setPageOptionsOpen(false);
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [pageOptionsOpen]);

  /* ====== Filters state ====== */
  const initialFilters = {
    state_code: [],
    city: [],
    zip_code: "",
    company_location_country: [],
    company_name: [],
    industry: [],
    industry_source: "",
    skills_tokens: [],
    website: [],
    public_company: "any",
    franchise_flag: "any",
    employees: [],
    sales_volume: [],
    contact_full_name: "",
    job_title: [],
    contact_gender: [],
    has_company_linkedin: "any",
    has_contact_linkedin: "any",
    phone: "",
    normalized_email: "",
    domain: [],
  };

  const [f, setF] = useState(initialFilters);
  const [hasApplied, setHasApplied] = useState(false);

  // measure chip bar height
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

  // Admin check helper (kept)
  const getUserRole = () => {
    try {
      const candidates = ["user", "profile", "authUser", "appUser", "currentUser"];
      for (const key of candidates) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (!parsed) continue;
          if (parsed.role) return String(parsed.role).toLowerCase();
          if (parsed.user && parsed.user.role) return String(parsed.user.role).toLowerCase();
          if (parsed.data && parsed.data.role) return String(parsed.data.role).toLowerCase();
        } catch {}
      }

      if (token && typeof token === "string") {
        try {
          const parts = token.split(".");
          if (parts.length >= 2) {
            const payload = JSON.parse(
              atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
            );
            if (payload.role) return String(payload.role).toLowerCase();
            if (payload.roles && Array.isArray(payload.roles) && payload.roles.length) {
              return String(payload.roles[0]).toLowerCase();
            }
            if (payload.user && payload.user.role) {
              return String(payload.user.role).toLowerCase();
            }
          }
        } catch {}
      }
    } catch {}
    return null;
  };

  const role = getUserRole();
  const isAdmin =
    role &&
    ["admin", "super_admin", "super-admin", "super admin", "superadmin"].includes(role);

  /* ---------- Build query (for backend) ---------- */
  const buildQuery = (filters) => {
    const q = {};
    const set = (k, v) => {
      if (v === undefined || v === null) return;
      if (typeof v === "string" && v.trim() === "") return;
      if (Array.isArray(v) && v.length === 0) return;
      q[k] = v;
    };

    set(
      "company_name",
      filters.company_name?.join ? filters.company_name.join(",") : filters.company_name
    );
    set("city", filters.city?.join ? filters.city.join(",") : filters.city);
    set("zip_code", filters.zip_code);
    set("website", filters.website?.join ? filters.website.join(",") : filters.website);
    set("contact_full_name", filters.contact_full_name);

    set(
      "state_code",
      filters.state_code?.join ? filters.state_code.join(",") : filters.state_code
    );
    set(
      "company_location_country",
      filters.company_location_country?.join
        ? filters.company_location_country.join(",")
        : filters.company_location_country
    );
    set("industry", filters.industry?.join ? filters.industry.join(",") : filters.industry);
    set("industry_source", filters.industry_source || "");
    set("job_title", filters.job_title?.join ? filters.job_title.join(",") : filters.job_title);
    set(
      "contact_gender",
      filters.contact_gender?.join ? filters.contact_gender.join(",") : filters.contact_gender
    );
    set("skills", filters.skills_tokens?.join ? filters.skills_tokens.join(",") : filters.skills_tokens);

    if (filters.public_company !== "any") set("public_company", filters.public_company);
    if (filters.franchise_flag !== "any") set("franchise_flag", filters.franchise_flag);

    set("employees", filters.employees?.join ? filters.employees.join(",") : filters.employees);
    set("sales_volume", filters.sales_volume?.join ? filters.sales_volume.join(",") : filters.sales_volume);

    set("phone", filters.phone);
    set("normalized_email", filters.normalized_email);
    set("domain", filters.domain?.join ? filters.domain.join(",") : filters.domain);

    // global search
    set("q", filters.q);

    return q;
  };

  /* ---------- Normalize server row -> grid row ---------- */
  const normalizeRow = (raw = {}) => {
    const merged = raw.merged || {};
    const linked = raw.linked || {};

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

    const skill = raw.Skills || pick("linked.Skills") || linked.Skills || "";

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

    const employees = raw.employees || pick("merged.NumEmployees") || merged.NumEmployees || "";

    const min_revenue = raw.min_revenue || pick("merged.SalesVolume") || merged.SalesVolume || "";
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
      skill,
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

  /* ---------- Facets (kept) ---------- */
  const facets = useMemo(() => {
    const uniq = (arr) =>
      Array.from(new Set(arr.filter(Boolean))).sort((a, b) =>
        String(a).localeCompare(String(b))
      );

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

      const st =
        get(merged, "normalized_state") ||
        get(merged, "State") ||
        get(linked, "normalized_state") ||
        row.state;
      if (st) states.push(String(st).trim());

      const ct = get(linked, "Locality") || get(merged, "City") || row.city;
      if (ct) cities.push(String(ct).trim());

      const co =
        get(merged, "Country") ||
        get(linked, "Countries") ||
        get(linked, "Location_Country") ||
        row.country;
      if (co) countries.push(String(co).trim());

      const jt = get(linked, "Job_title") || row.job_title;
      if (jt) job_titles.push(String(jt).trim());

      const sk = get(linked, "Skills");
      if (sk) {
        const toks = String(sk)
          .split(/[;,]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const t of toks) skills.push(t);
      }

      const comp = get(merged, "Company") || get(linked, "Company_Name") || row.company;
      if (comp) companies.push(String(comp).trim());

      const site =
        get(linked, "Company_Website") ||
        get(merged, "normalized_website") ||
        get(merged, "Web_Address") ||
        row.website ||
        row.domain;
      if (site) websites.push(String(site).trim());

      const emp = get(merged, "NumEmployees") || row.employees;
      if (emp) employees_options.push(String(emp).trim());

      const rev = get(merged, "SalesVolume") || row.min_revenue || row.max_revenue;
      if (rev) revenue_options.push(String(rev).trim());

      const indCandidates = [];
      const li = get(linked, "Industry");
      const li2 = get(linked, "Industry_2");
      if (li) indCandidates.push(li);
      if (li2) indCandidates.push(li2);
      if (row.industry) indCandidates.push(row.industry);

      for (const ii of indCandidates) {
        if (String(ii).includes(",")) {
          String(ii)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach((t) => industries.push(t));
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

  /* ---------- People/Company/Contact renderers ---------- */
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
        <div
          className="font-medium text-[13px] text-slate-800 truncate"
          title={company || "--"}
        >
          {company || "--"}
        </div>
        {loc && (
          <div
            className="mt-0 flex items-center gap-1 text-[11.5px] text-slate-600 truncate"
            title={loc}
          >
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

  const contactCellRenderer = useCallback((params) => {
    const r = params.data || {};
    const phoneVal = r.phone || "";
    const emailVal = r.email || "";

    return (
      <div className="flex flex-col gap-1 py-1 leading-4">
        <div className="flex items-center gap-2 text-[12px] text-slate-700">
          <Phone className="w-3 h-3 text-slate-500" />
          {phoneVal ? (
            <span className="truncate">{phoneVal}</span>
          ) : (
            <span className="text-slate-400">--</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[12px] text-slate-700">
          <Mail className="w-3 h-3 text-slate-500" />
          {emailVal ? (
            <span className="truncate">{emailVal}</span>
          ) : (
            <span className="text-slate-400">--</span>
          )}
        </div>
      </div>
    );
  }, []);

  /* ---------- Columns ---------- */
  const baseColumns = useMemo(
    () => [
     
      { headerName: "Employees", field: "employees", flex: 0.6, minWidth: 110, sortable: true },
      {
        headerName: "Revenue (Min–Max)",
        field: "min_revenue",
        flex: 0.8,
        minWidth: 160,
        valueGetter: (p) => {
          const a = p.data?.min_revenue;
          const b = p.data?.max_revenue;
          return a || b ? `${a || "–"} – ${b || "–"}` : "";
        },
        sortable: true,
      },
    ],
    []
  );

  const ALL_FIELDS = [
    "name",
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
    "skill",
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

  const excludeFromExtras = useMemo(() => {
    try {
      return new Set((baseColumns || []).map((c) => c.field).filter(Boolean));
    } catch {
      return new Set();
    }
  }, [baseColumns]);

  const extraColumns = useMemo(() => {
    return ALL_FIELDS.filter((ff) => !excludeFromExtras.has(ff)).map((field) => {
      const def = {
        headerName: field === "name" ? "Full name" : toHeader(field),
        field,
        minWidth: 140,
        sortable: true,
        cellRenderer: undefined,
        type: numericRight.has(field) ? "rightAligned" : undefined,
        valueFormatter: (params) => {
          const v = params.value;
          if (
            v === undefined ||
            v === null ||
            (typeof v === "string" && v.trim() === "")
          )
            return "--";
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

      return def;
    });
  }, [excludeFromExtras]);

  const columnDefs = useMemo(() => {
    const allDefs = [...baseColumns, ...extraColumns];
    const defMap = new Map();
    for (const d of allDefs) {
      if (d && d.field) defMap.set(d.field, d);
    }

    const selCol = defMap.get("__sel__") || null;

    const desiredOrder = [
      "name",
      "first_name",
      "last_name",
      "phone",
      "email",
      "city",
      "state",
      "company",
      "job_title",
      "skill",
      "website",
      "domain",
      "employees",
      "linkedin_url",
      "facebook",
      "twitter",
      "sales_volume",
      "max_revenue",
    ];

    const used = new Set();
    const finalCols = [];

    if (selCol) {
      finalCols.push(selCol);
      used.add(selCol.field);
    }

    for (const f2 of desiredOrder) {
      const d = defMap.get(f2);
      if (d) {
        finalCols.push(d);
        used.add(f2);
      }
    }

    for (const d of allDefs) {
      if (!d || !d.field) continue;
      if (!used.has(d.field)) {
        finalCols.push(d);
        used.add(d.field);
      }
    }

    return finalCols;
  }, [baseColumns, extraColumns]);

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      resizable: true,
      suppressHeaderMenuButton: true,
      valueFormatter: (params) => {
        if (
          params &&
          (params.value === undefined ||
            params.value === null ||
            (typeof params.value === "string" && params.value.trim() === ""))
        )
          return "--";
        return params && params.value !== undefined ? params.value : "";
      },
    }),
    []
  );

  /* ---------- Hidden columns controls ---------- */
  const [hiddenCols, setHiddenCols] = useState(() => {
    try {
      const v = localStorage.getItem("dashboard_hidden_columns");
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  });
  const [colsOpen, setColsOpen] = useState(false);

  const allColumnItems = useMemo(() => {
    const map = new Map();
    (columnDefs || []).forEach((c) => {
      if (!c || !c.field) return;
      if (!map.has(c.field)) {
        map.set(c.field, {
          field: c.field,
          headerName: c.headerName || toHeader(c.field),
        });
      }
    });
    return Array.from(map.values());
  }, [columnDefs]);

  useEffect(() => {
    try {
      localStorage.setItem("dashboard_hidden_columns", JSON.stringify(hiddenCols || []));
    } catch {}

    if (!gridRef.current?.columnApi) return;
    const allFields = allColumnItems.map((c) => c.field);
    allFields.forEach((field) => {
      try {
        const visible = !(hiddenCols || []).includes(field);
        gridRef.current.columnApi.setColumnVisible(field, visible);
      } catch {}
    });
  }, [hiddenCols, allColumnItems]);

  const toggleColumn = (field) => {
    setHiddenCols((prev) => {
      const isHidden = (prev || []).includes(field);
      if (isHidden) return (prev || []).filter((f3) => f3 !== field);
      return [...(prev || []), field];
    });
  };

  const selectAllColumns = () => setHiddenCols([]);
  const clearAllColumns = () => setHiddenCols(allColumnItems.map((c) => c.field));
  const resetColumns = () => {
    setHiddenCols([]);
    try {
      localStorage.removeItem("dashboard_hidden_columns");
    } catch {}
  };

  const isColumnVisible = (field) => !(hiddenCols || []).includes(field);

  /* ---------- Grid selection ---------- */
  const onSelectionChanged = useCallback(() => {
    const count = gridRef.current?.api?.getSelectedNodes()?.length || 0;
    setSelectedCount(count);
  }, []);

  const onGridReady = useCallback(() => {
    try {
      const stored = localStorage.getItem("dashboard_hidden_columns");
      const hidden = stored ? JSON.parse(stored) : [];
      if (Array.isArray(hidden) && hidden.length && gridRef.current?.columnApi) {
        hidden.forEach((field) => {
          try {
            gridRef.current.columnApi.setColumnVisible(field, false);
          } catch {}
        });
      }
    } catch {}
  }, []);

  /* ---------- Active chips ---------- */
  const activeChips = useMemo(() => {
    const chips = [];
    const seen = new Set();
    const push = (label, onRemove) => {
      if (seen.has(label)) return;
      seen.add(label);
      chips.push({ label, onRemove });
    };

    if (f.state_code?.length) {
      f.state_code.forEach((v) =>
        push(`State: ${v}`, () =>
          setF((s) => ({ ...s, state_code: s.state_code.filter((x) => x !== v) }))
        )
      );
    }

    if (f.company_location_country?.length) {
      f.company_location_country.forEach((v) =>
        push(`Country: ${v}`, () =>
          setF((s) => ({
            ...s,
            company_location_country: s.company_location_country.filter((x) => x !== v),
          }))
        )
      );
    }

    if (f.industry?.length) {
      f.industry.forEach((v) =>
        push(`Industry: ${v}`, () =>
          setF((s) => ({ ...s, industry: s.industry.filter((x) => x !== v) }))
        )
      );
    }

    if (f.industry_source) {
      push(`Industry Source: ${f.industry_source}`, () =>
        setF((s) => ({ ...s, industry_source: "" }))
      );
    }

    if (f.contact_full_name) {
      push(`Contact ~ ${f.contact_full_name}`, () =>
        setF((s) => ({ ...s, contact_full_name: "" }))
      );
    }

    if (f.skills_tokens?.length) {
      f.skills_tokens.forEach((v) =>
        push(`Skill: ${v}`, () =>
          setF((s) => ({ ...s, skills_tokens: s.skills_tokens.filter((x) => x !== v) }))
        )
      );
    }

    if (f.employees?.length) {
      f.employees.forEach((v) =>
        push(`Employees: ${v}`, () =>
          setF((s) => ({ ...s, employees: s.employees.filter((x) => x !== v) }))
        )
      );
    }

    if (f.sales_volume?.length) {
      f.sales_volume.forEach((v) =>
        push(`Revenue: ${v}`, () =>
          setF((s) => ({ ...s, sales_volume: s.sales_volume.filter((x) => x !== v) }))
        )
      );
    }

    if (f.phone) push(`Phone: ${f.phone}`, () => setF((s) => ({ ...s, phone: "" })));
    if (f.normalized_email)
      push(`Email: ${f.normalized_email}`, () =>
        setF((s) => ({ ...s, normalized_email: "" }))
      );

    if (f.domain?.length) {
      f.domain.forEach((v) =>
        push(`Domain: ${v}`, () =>
          setF((s) => ({ ...s, domain: s.domain.filter((x) => x !== v) }))
        )
      );
    }

    if (globalSearch?.trim()) {
      push(`Q: ${globalSearch.trim()}`, () => setGlobalSearch(""));
    }

    return chips;
  }, [f, globalSearch]);

  /* ---------- Quick-search pages (kept) ---------- */
  const quickMap = {
    "/search-phone": {
      key: "phone",
      placeholder: "Enter phone (e.g. +1 415 555 0123 or 4155550123)",
    },
    "/search-area-code": { key: "phone", placeholder: "Enter area code (e.g. 415)" },
    "/search-email": { key: "normalized_email", placeholder: "Enter email or partial (e.g. alice@, @gmail.com)" },
    "/search-domain": { key: "domain", placeholder: "Enter domain or website (e.g. example.com)" },
    "/search-name": { key: "contact_full_name", placeholder: "Enter full or partial name (e.g. John Smith)" },
  };
  const isQuickPage = pathname !== "/dashboard" && quickMap[pathname];

  /* ---------- Server-paginated fetch ---------- */
  const fetchPage = async (pageNumber = 0, overrides = {}) => {
    setHasApplied(true);
    setLoading(true);

    try {
      const mergedFilters = { ...f, ...overrides, q: globalSearch };

      // If user typed email in top box, sync to filter + use it
      if (emailInput && emailInput.trim() !== "") {
        mergedFilters.normalized_email = emailInput.trim();
        setF((s) => ({ ...s, normalized_email: emailInput.trim() }));
      }

      const params = buildQuery(mergedFilters);
      params.limit = pageSize;
      params.offset = Math.max(0, pageNumber * pageSize);

      const res = await api.get("/api/data/leads", { params });
      const payload = res?.data ?? {};

      let hits = [];
      let total = 0;

      if (Array.isArray(payload)) {
        hits = payload;
        total = payload.length;
      } else {
        hits = Array.isArray(payload.data) ? payload.data : [];
        const metaTotal = payload.meta && (payload.meta.total || payload.meta.count);
        total = metaTotal !== undefined && metaTotal !== null ? metaTotal : hits.length;
      }

      const normalized = hits.map((h) => normalizeRow(h));
      setRowData(normalized);
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

  const runSearch = async () => {
    await fetchPage(0, { q: globalSearch });
  };

  const runSearchWithOverrides = async (overrides, pageNumber = 0) => {
    setF((s) => ({ ...s, ...overrides }));
    await fetchPage(pageNumber, overrides);
  };

  const clearFilters = () => {
    setF(initialFilters);
    setGlobalSearch("");
    setRowData([]);
    setViewRows([]);
    setHasApplied(false);
    setSelectedCount(0);
    setTotalHits(0);
    setPage(0);
    setEmailInput("");
  };

  const handleQuickSearch = () => {
    if (!isQuickPage) return;
    const { key } = quickMap[pathname];
    const overrides = {};
    if (key === "domain") overrides[key] = [quickInput];
    else overrides[key] = quickInput;
    runSearchWithOverrides(overrides);
  };

  // pagination controls
  const totalPages = Math.max(1, Math.ceil((totalHits || 0) / pageSize));
  const onPrev = () => {
    if (page <= 0) return;
    fetchPage(page - 1);
  };
  const onNext = () => {
    if (page + 1 >= totalPages) return;
    fetchPage(page + 1);
  };

  useEffect(() => {
    if (!hasApplied) return;
    fetchPage(0);
  }, [pageSize]);

  const totalHitsDisplay = useMemo(() => {
    if (!totalHits) return "0";
    if (totalHits >= 10000) return `${Number(totalHits).toLocaleString()}+`;
    return Number(totalHits).toLocaleString();
  }, [totalHits]);

  /* =======================
     EXPORT HELPERS (page CSV/Excel)
     ======================= */

  const downloadFile = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const fetchVisiblePageRows = async (onProgress) => {
    const MAX = 1000; // safe chunk size
    const needed = pageSize;
    const baseOffset = page * pageSize;

    const totalBatches = Math.ceil(needed / MAX);
    const all = [];

    for (let i = 0; i < totalBatches; i++) {
      const limit = Math.min(MAX, needed - i * MAX);

      const mergedFilters = { ...f, q: globalSearch };
      const params = buildQuery(mergedFilters);
      params.limit = limit;
      params.offset = baseOffset + i * MAX;

      onProgress?.({
        batch: i + 1,
        total: totalBatches,
        percent: Math.round(((i + 1) / totalBatches) * 100),
      });

      const res = await api.get("/api/data/leads", { params });
      const rows = (res?.data?.data || []).map(normalizeRow);

      all.push(...rows);

      if (rows.length < limit) break;
    }

    return all;
  };

  const getVisibleColumnsOrdered = () => {
    try {
      const colApi = gridRef.current?.columnApi;
      if (colApi && typeof colApi.getAllDisplayedColumns === "function") {
        const displayed = colApi.getAllDisplayedColumns();
        return displayed
          .map((c) => {
            const def = c.getColDef ? c.getColDef() : c.colDef;
            return {
              field: def?.field || def?.colId || "",
              headerName:
                def?.headerName || toHeader(def?.field || def?.colId || ""),
            };
          })
          .filter((x) => x.field);
      }
    } catch {}

    return (columnDefs || [])
      .filter((c) => c && c.field && !(hiddenCols || []).includes(c.field))
      .map((c) => ({
        field: c.field,
        headerName: c.headerName || toHeader(c.field),
      }));
  };

  const BtnSpinner = () => (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
    </svg>
  );

  const exportCSV = async () => {
    try {
      setActiveExportBtn("csv");
      setPageExporting(true);
      setPageExportProgress(0);
      setPageExportStatus("Starting export…");

      const rows = await fetchVisiblePageRows((p) => {
        setPageExportProgress(p.percent);
        setPageExportStatus(`Fetching ${p.batch} / ${p.total} batches…`);
      });

      setPageExportProgress(100);
      setPageExportStatus("Generating CSV…");

      const cols = getVisibleColumnsOrdered();
      const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

      const csv = [
        cols.map((c) => escape(c.headerName)).join(","),
        ...rows.map((r) => cols.map((c) => escape(r[c.field])).join(",")),
      ].join("\r\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      downloadFile(blob, `leads_page_${page + 1}.csv`);
    } finally {
      // ✅ keep loader until the process truly ends
      setActiveExportBtn(null);
      setPageExporting(false);
      setPageExportProgress(0);
      setPageExportStatus("");
    }
  };

  const exportExcel = async () => {
    try {
      setActiveExportBtn("excel");
      setPageExporting(true);
      setPageExportProgress(0);
      setPageExportStatus("Starting export…");

      const rows = await fetchVisiblePageRows((p) => {
        setPageExportProgress(p.percent);
        setPageExportStatus(`Fetching ${p.batch} / ${p.total} batches…`);
      });

      setPageExportProgress(100);
      setPageExportStatus("Generating Excel…");

      const cols = getVisibleColumnsOrdered();

      let html = `<table border="1"><tr>`;
      html += cols.map((c) => `<th>${c.headerName}</th>`).join("");
      html += `</tr>`;

      rows.forEach((r) => {
        html += `<tr>`;
        cols.forEach((c) => {
          const val = r[c.field] ?? "";
          html += `<td>${String(val)
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</td>`;
        });
        html += `</tr>`;
      });

      html += `</table>`;

      const blob = new Blob([html], { type: "application/vnd.ms-excel" });
      downloadFile(blob, `leads_page_${page + 1}.xls`);
    } finally {
      // ✅ keep loader until the process truly ends
      setActiveExportBtn(null);
      setPageExporting(false);
      setPageExportProgress(0);
      setPageExportStatus("");
    }
  };

  /* =======================
     ✅ BACKEND EXPORT ALL (job)
     ======================= */

  const stopExportPolling = () => {
    if (exportPollRef.current) {
      clearInterval(exportPollRef.current);
      exportPollRef.current = null;
    }
  };

  const pollExportStatus = async (jobId) => {
    stopExportPolling();

    exportPollRef.current = setInterval(async () => {
      try {
        const resp = await api.get(`/api/export/status/${jobId}`);
        const data = resp?.data || {};

        setExportJob(data);
        setExportProgress(Number(data.progress || 0));
        setExporting(data.status === "running");

        if (data.status === "done") {
          setExporting(false);
          stopExportPolling();
        }

        if (data.status === "error") {
          setExporting(false);
          setExportError(data.error || "Export failed");
          stopExportPolling();
          localStorage.removeItem(EXPORT_JOB_LS_KEY);
        }
      } catch (e) {
        setExporting(false);
        setExportError(
          e?.response?.data?.message || e?.message || "Failed to fetch export status"
        );
        stopExportPolling();
        localStorage.removeItem(EXPORT_JOB_LS_KEY);
      }
    }, 1500);
  };

  const startExportAllCSV = async () => {
    try {
      setExportError(null);
      setExportProgress(0);
      setExportJob(null);

      const mergedFilters = { ...f, q: globalSearch };
      const filtersPayload = buildQuery(mergedFilters);

      setExporting(true);

      const tokenVal = token || localStorage.getItem("token") || "";
      const headers = tokenVal ? { Authorization: `Bearer ${tokenVal}` } : {};

      const resp = await api.post(
        "/api/export/start",
        { filters: filtersPayload },
        { headers }
      );

      const jobId = resp?.data?.jobId;
      if (!jobId) throw new Error("jobId missing from export start response");

      localStorage.setItem(EXPORT_JOB_LS_KEY, jobId);

      await pollExportStatus(jobId);
    } catch (e) {
      setExportError(
        e?.response?.data?.message || e?.message || "Failed to start export"
      );
      setExporting(false);
      setExportJob(null);
      setExportProgress(0);
      localStorage.removeItem(EXPORT_JOB_LS_KEY);
    }
  };

  const downloadExportByJobId = async (jobId) => {
    if (!jobId) return;
    try {
      const tokenVal = token || localStorage.getItem("token") || "";
      const headers = tokenVal ? { Authorization: `Bearer ${tokenVal}` } : {};

      const resp = await api.get(`/api/export/download/${jobId}`, {
        responseType: "blob",
        headers,
      });

      const cd =
        resp?.headers?.["content-disposition"] ||
        resp?.headers?.["Content-Disposition"] ||
        "";

      let filename = "leads_export.csv";
      const match = /filename\*?=(?:UTF-8'')?["']?([^;"']+)/i.exec(cd);
      if (match && match[1]) filename = decodeURIComponent(match[1]);

      downloadFile(resp.data, filename);

      localStorage.removeItem(EXPORT_JOB_LS_KEY);
      setExportJob(null);
      setExportProgress(0);
      setExporting(false);
      setExportError(null);
    } catch (e) {
      setExportError(
        e?.response?.data?.message || e?.message || "Download failed"
      );
    }
  };

  // restore export job after refresh
  useEffect(() => {
    const saved = localStorage.getItem(EXPORT_JOB_LS_KEY);
    if (saved) {
      setExporting(true);
      pollExportStatus(saved);
    }
    return () => stopExportPolling();
  }, []);

  // cleanup polling on unmount
  useEffect(() => {
    return () => stopExportPolling();
  }, []);

  /* ---------- Page options dropdown safety ---------- */
  useEffect(() => {
    if (!colsOpen) return;
    const onDoc = () => setColsOpen(false);
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [colsOpen]);

  /* ---------- Render ---------- */
  return (
    <div className="h-[calc(96vh-0px)] flex">
      {/* Left filters (your shared UI) */}
      <CommonFilters
        open={filtersOpen}
        setOpen={setFiltersOpen}
        f={f}
        setF={setF}
        onSearch={runSearch}
        onClear={clearFilters}
      />

      <main className="flex-1 px-2 pt-0 pb-6 -mt-3 flex flex-col">
        {/* header */}
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">Lead Finder</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* global search */}
            <div className="relative">
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch();
                }}
                placeholder="Search name, email, city, industry, domain, website, skill, job title…"
                className="h-9 w-[320px] rounded-md border px-3 text-sm focus:ring-2 focus:ring-sky-200"
                disabled={pageExporting}
              />
              <button
                onClick={runSearch}
                className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1 text-sm bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed"
                type="button"
                disabled={pageExporting}
              >
                Search
              </button>
            </div>

            {/* Columns dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setColsOpen((s) => !s);
                }}
                className="inline-flex items-center gap-2 px-3 py-1 border rounded-md bg-white text-sm text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                title="Columns"
                disabled={pageExporting}
              >
                <Users className="w-4 h-4" />
                Columns
              </button>

              {colsOpen && (
                <div
                  className="absolute right-0 mt-2 w-[260px] bg-white border rounded-md shadow-lg z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-2 border-b flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-700">
                      Toggle columns
                    </div>
                    <button
                      className="text-xs text-slate-500 hover:text-slate-800"
                      onClick={() => setColsOpen(false)}
                      type="button"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-2 flex items-center gap-2">
                    <button
                      className="text-xs px-2 py-1 border rounded hover:bg-slate-50"
                      onClick={selectAllColumns}
                      type="button"
                    >
                      Show all
                    </button>
                    <button
                      className="text-xs px-2 py-1 border rounded hover:bg-slate-50"
                      onClick={clearAllColumns}
                      type="button"
                    >
                      Hide all
                    </button>
                    <button
                      className="text-xs px-2 py-1 border rounded hover:bg-slate-50"
                      onClick={resetColumns}
                      type="button"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="max-h-[320px] overflow-auto p-2 space-y-1">
                    {allColumnItems.map((c) => (
                      <label
                        key={c.field}
                        className="flex items-center gap-2 text-xs text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={isColumnVisible(c.field)}
                          onChange={() => toggleColumn(c.field)}
                        />
                        <span className="truncate">{c.headerName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Export buttons */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={exportCSV}
                disabled={pageExporting}
                className={`inline-flex items-center gap-2 px-3 py-1 border rounded-md ${
                  pageExporting ? "opacity-50 cursor-not-allowed" : ""
                }`}
                type="button"
              >
                {activeExportBtn === "csv" ? (
                  <>
                    <BtnSpinner />
                    Exporting CSV…
                  </>
                ) : (
                  "CSV"
                )}
              </button>

              <button
                onClick={exportExcel}
                disabled={pageExporting}
                className={`inline-flex items-center gap-2 px-3 py-1 border rounded-md ${
                  pageExporting ? "opacity-50 cursor-not-allowed" : ""
                }`}
                type="button"
              >
                {activeExportBtn === "excel" ? (
                  <>
                    <BtnSpinner />
                    Exporting Excel…
                  </>
                ) : (
                  "Excel"
                )}
              </button>

              {/* Export All (admin only) */}
              {/* {isAdmin ? (
                <button
                  onClick={startExportAllCSV}
                  disabled={exporting || pageExporting}
                  title="Export all records (server job)"
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-md border transition ${
                    exporting || pageExporting
                      ? "bg-slate-200 text-slate-600 cursor-not-allowed"
                      : "bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                  type="button"
                >
                  {exporting ? (
                    <>
                      <svg
                        className="animate-spin w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                      <span>Exporting…</span>
                    </>
                  ) : (
                    <>
                      <File className="w-4 h-4" />
                      <span>Export All (CSV)</span>
                    </>
                  )}
                </button>
              ) : null} */}
            </div>

            {/* Mobile export icons */}
            <div className="sm:hidden inline-flex items-center gap-1">
              <button
                onClick={exportCSV}
                disabled={pageExporting}
                className={`p-2 border rounded-md ${
                  pageExporting ? "opacity-50 cursor-not-allowed" : ""
                }`}
                title="CSV"
                type="button"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={exportExcel}
                disabled={pageExporting}
                className={`p-2 border rounded-md ${
                  pageExporting ? "opacity-50 cursor-not-allowed" : ""
                }`}
                title="Excel"
                type="button"
              >
                <FileText className="w-4 h-4" />
              </button>

              {/* {isAdmin ? (
                <button
                  onClick={startExportAllCSV}
                  disabled={exporting || pageExporting}
                  className={`p-2 border rounded-md ${
                    exporting || pageExporting ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  title="Export All (CSV)"
                  type="button"
                >
                  <File className="w-4 h-4" />
                </button>
              ) : null} */}
            </div>
          </div>
        </div>

        {/* ✅ FULL-PAGE OVERLAY LOADER FOR PAGE CSV/EXCEL */}
        {pageExporting && (
          <div className="fixed inset-0 z-[9999] bg-black/30 backdrop-blur-[1px] flex items-center justify-center">
            <div className="bg-white w-[420px] max-w-[92vw] border rounded-xl shadow-xl p-5">
              <div className="flex items-center gap-3">
                <svg
                  className="animate-spin h-6 w-6 text-sky-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>

                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-800">
                    Export in progress
                  </div>
                  <div className="text-xs text-slate-600">
                    {pageExportStatus || "Preparing file…"}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-sky-600 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, pageExportProgress || 0)
                      )}%`,
                    }}
                  />
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {pageExportProgress ? `${pageExportProgress}%` : "0%"} — Please
                  wait, do not refresh
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Backend export job status */}
        {isAdmin && (exportJob || exporting || exportError) && (
          <div className="mb-2">
            <div className="bg-white border rounded-xl shadow-sm px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <strong>Export job:</strong>
                    <span className="text-sm text-slate-600">
                      {exportJob?.jobId ||
                        localStorage.getItem(EXPORT_JOB_LS_KEY) ||
                        (exporting ? "starting..." : "—")}
                    </span>
                    {exportJob?.status && (
                      <span
                        className="ml-2 text-xs px-2 py-0.5 rounded text-white"
                        style={{
                          background:
                            exportJob.status === "done"
                              ? "#16a34a"
                              : exportJob.status === "error"
                              ? "#dc2626"
                              : "#0ea5e9",
                        }}
                      >
                        {exportJob.status}
                      </span>
                    )}
                  </div>

                  <div className="mt-2">
                    <div className="w-full bg-slate-100 rounded h-2">
                      <div
                        className="h-2 rounded"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, exportProgress || 0)
                          )}%`,
                          background: "#06b6d4",
                        }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {exporting
                        ? `Exporting... ${exportProgress || 0}%`
                        : exportJob?.status
                        ? `Status: ${exportJob.status} ${
                            exportProgress ? ` - ${exportProgress}%` : ""
                          }`
                        : ""}
                      {exportError && (
                        <span className="text-red-600 ml-2">
                          Error: {exportError}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {exportJob?.status === "done" && (
                    <button
                      onClick={() =>
                        downloadExportByJobId(
                          exportJob?.jobId ||
                            localStorage.getItem(EXPORT_JOB_LS_KEY)
                        )
                      }
                      className="inline-flex items-center gap-2 px-3 py-1 border rounded-md bg-white text-sm text-slate-700 hover:bg-slate-50"
                      type="button"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* chips */}
        {hasApplied && activeChips.length > 0 && (
          <div ref={chipBarRef} className="mb-2">
            <div className="bg-white border rounded-xl shadow-sm px-3 py-2 flex flex-wrap items-center gap-1">
              <span className="text-[11px] font-medium text-slate-600 mr-1">
                Filters:
              </span>
              {activeChips.map((c, i) => (
                <Chip key={i} onRemove={c.onRemove}>
                  {c.label}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* quick page input if needed */}
        {isQuickPage && !hasApplied ? (
          <div className="mb-4">
            <div className="w-full max-w-3xl">
              <div className="relative">
                <input
                  className="w-full h-11 pl-3 pr-24 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder={quickMap[pathname].placeholder}
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleQuickSearch();
                  }}
                  disabled={pageExporting}
                />
                <button
                  type="button"
                  onClick={handleQuickSearch}
                  disabled={pageExporting}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 border rounded-md px-3 py-1 text-sm text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <SearchIcon className="w-4 h-4 text-white" />
                  Search
                </button>
              </div>
              <div className="mt-3 text-sm text-slate-500">
                Search specific to{" "}
                <strong>{quickMap[pathname].placeholder.split(" ")[0]}</strong>.
                You can still expand the filters on the left and refine results
                after searching.
              </div>
            </div>
          </div>
        ) : null}

        {/* hero vs grid */}
        {!hasApplied && !isQuickPage ? (
          <Hero />
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
              pagination={false}
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

        {/* pagination footer */}
        {hasApplied && totalHits > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPageOptionsOpen((s) => !s);
                }}
                disabled={pageExporting}
                className="inline-flex items-center gap-2 px-3 py-1 border rounded-md bg-white text-sm text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Showing{" "}
                <span className="font-semibold">{Math.min(totalHits, pageSize)}</span>{" "}
                rows of <span className="font-semibold">{totalHitsDisplay}</span>
                <svg
                  className={`w-4 h-4 transition-transform ${
                    pageOptionsOpen ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06-.02L10 10.88l3.71-3.69a.75.75 0 111.06 1.06l-4.24 4.22a.75.75 0 01-1.06 0L5.25 8.25a.75.75 0 01-.02-1.06z"
                  />
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
                          if (hasApplied) fetchPage(0, {});
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                          Number(pageSize) === Number(opt)
                            ? "font-medium text-sky-700"
                            : "text-slate-700"
                        }`}
                        type="button"
                      >
                        {opt} rows
                        {Number(pageSize) === Number(opt) && (
                          <span className="ml-2 text-[10px] text-slate-400">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onPrev}
                disabled={page <= 0 || pageExporting}
                className="px-3 py-1 rounded-md border disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                Prev
              </button>
              <div className="text-sm text-slate-600 px-2">
                Page <span className="font-medium">{page + 1}</span> of{" "}
                <span className="font-medium">{totalPages}</span>
              </div>
              <button
                onClick={onNext}
                disabled={page + 1 >= totalPages || pageExporting}
                className="px-3 py-1 rounded-md border disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
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
