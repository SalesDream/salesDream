// src/pages/SearchByName.jsx (updated to match SearchByEmail columns)
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { Navigate } from "react-router-dom";
import api from "../api";
import { AgGridReact } from "ag-grid-react";
import { useAuthToken } from "../useAuth";
import {
  Sparkles,
  Filter as FilterIcon,
  Search as SearchIcon,
  Phone,
  Mail,
  Globe2,
  Linkedin,
  Facebook,
  Twitter,
  MapPin as MapPinIcon,
  User,
  MapPin,
  Briefcase,
  Tags,
  Building2,
  Users,
  Plus,
  Minus,
  // Copy,
} from "lucide-react";

/* ---------- Small UI building blocks (copied & trimmed) ---------- */
const toHeader = (s) => s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

const labelCls = "block text-[10px] font-semibold text-slate-600 tracking-wide";
const inputCls =
  "mt-1 h-7 w-full rounded-md border border-slate-300 px-2 text-[11px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400";

const Chip = ({ children, onRemove }) => (
  <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full mr-1 mb-1">
    {children}
    <button onClick={onRemove} className="text-blue-500 hover:text-blue-700" aria-label="Remove">
      ×
    </button>
  </span>
);

function MultiSelect({ label, options, values, onChange, searchable = true }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const list = (options || []).filter(Boolean).map(String);
    const uniq = Array.from(new Set(list));
    if (!q.trim()) return uniq.slice(0, 200);
    const qs = q.toLowerCase();
    return uniq.filter((x) => x.toLowerCase().includes(qs)).slice(0, 200);
  }, [options, q]);
  const toggle = (val) => {
    const cur = Array.isArray(values) ? values : [];
    if (cur.includes(val)) onChange(cur.filter((v) => v !== val));
    else onChange([...cur, val]);
  };
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="mt-1 relative">
        <button type="button" onClick={() => setOpen((v) => !v)} className={inputCls + " text-left"}>
          {Array.isArray(values) && values.length ? `${values.length} selected` : "Any"}
        </button>
        {open && (
          <div className="absolute z-[60] mt-1 w-full max-h-64 overflow-auto bg-white border rounded-md shadow-lg">
            {searchable && (
              <div className="p-2">
                <input value={q} onChange={(e) => setQ(e.target.value)} className={inputCls} placeholder="Search options…" />
              </div>
            )}
            <ul className="p-2 space-y-1 text-[11px]">
              {filtered.length === 0 && <li className="text-slate-400 px-1">No options</li>}
              {filtered.map((opt) => (
                <li key={opt}>
                  <label className="inline-flex items-center gap-2">
                    <input className="accent-sky-600" type="checkbox" checked={Array.isArray(values) && values.includes(opt)} onChange={() => toggle(opt)} />
                    <span>{opt}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="border-t p-2 flex justify-between">
              <button className="text-[10px] text-slate-600 hover:text-slate-900" onClick={() => onChange([])}>
                Clear
              </button>
              <button className="text-[10px] text-sky-600 hover:text-sky-800" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
      {Array.isArray(values) && values.length > 0 && (
        <div className="mt-1">
          {values.map((v) => (
            <Chip key={v} onRemove={() => onChange(values.filter((x) => x !== v))}>
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
    <input value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} placeholder={placeholder} />
  </label>
);

/* Accordion section used in filter rail */
function FilterSection({ icon: Icon, label, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-md">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full h-10 px-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-[12px] font-medium text-slate-700">
          <Icon className="w-4 h-4 text-slate-500" />
          {label}
        </span>
        {open ? <Minus className="w-4 h-4 text-slate-500" /> : <Plus className="w-4 h-4 text-slate-500" />}
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

/* ---------- small spinner ---------- */
function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3" role="status" aria-live="polite" aria-busy="true">
      <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a 8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
      </svg>
      <span className="text-xs text-slate-600">{label}</span>
    </div>
  );
}

/* ---------- Link / Date Cells ---------- */
const LinkCell = (p) => {
  const v = p.value ?? p.data?.[p.colDef.field];
  if (!v) return <span className="text-slate-400">--</span>;
  const href = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  const label = String(v).replace(/^https?:\/\//i, "");
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline truncate" title={label}>
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

/* ---------- Static US state codes (requested static values) ---------- */
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC"
];

const PAGE_OPTIONS = [10, 25, 50, 100, 200, 500, 1000];
/* ======================
   MAIN SearchByName Component (updated)
   ====================== */
export default function SearchByName() {
  const gridRef = useRef(null);
  const chipBarRef = useRef(null);
  const [chipBarH, setChipBarH] = useState(0);

  const [rowData, setRowData] = useState([]);
  const [viewRows, setViewRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [pageSize, setPageSize] = useState(100);

  const [page, setPage] = useState(0);
  const [totalHits, setTotalHits] = useState(0);

  // name input (top right)
  const [nameInput, setNameInput] = useState("");

  // exact match checkbox
  const [exactMatch, setExactMatch] = useState(false);

  // rows dropdown state
  const [pageOptionsOpen, setPageOptionsOpen] = useState(false);

  // Filters shape (matching SearchByEmail reference)
  const initialFilters = {
    state_code: [],
    city: [],
    zip_code: "",
    company_location_country: [],
    company_name: [],
    industry: [],
    website: [],
    public_company: "any",
    franchise_flag: "any",
    employees: [], // multi-select of merged.NumEmployees
    sales_volume: [], // multi-select of merged.SalesVolume
    contact_full_name: "",
    job_title: [],
    contact_gender: [],
    skills_tokens: [],
    has_company_linkedin: "any",
    has_contact_linkedin: "any",
    job_start_from: "",
    job_start_to: "",
    phone: "",
    normalized_email: "",
    domain: [],
  };
  const [f, setF] = useState(initialFilters);
  const [hasApplied, setHasApplied] = useState(false);

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

  // close rows dropdown when clicking outside
  useEffect(() => {
    if (!pageOptionsOpen) return;
    const onDocClick = () => setPageOptionsOpen(false);
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [pageOptionsOpen]);

  // Auth guard
  const token = useAuthToken();
  if (!token) return <Navigate to="/login" replace />;

  // Facets from current page results (lightweight, same logic as SearchByEmail)
  const facets = useMemo(() => {
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));

    const getNested = (obj, path) => {
      if (!obj || !path) return undefined;
      const parts = path.split('.');
      let cur = obj;
      for (const p of parts) {
        if (!cur) return undefined;
        cur = cur[p];
      }
      return cur;
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

    for (const r of rowData || []) {
      const raw = r.__raw || {};
      const merged = raw.merged || {};
      const linked = raw.linked || {};

      const st = getNested(merged, "normalized_state") || getNested(merged, "State") || getNested(linked, "normalized_state") || r.state;
      if (st) states.push(String(st).trim());

      const ct = getNested(linked, "Locality") || getNested(merged, "City") || r.city;
      if (ct) cities.push(String(ct).trim());

      const co = getNested(merged, "Country") || getNested(linked, "Countries") || getNested(linked, "Location_Country") || r.country;
      if (co) countries.push(String(co).trim());

      const jt = getNested(linked, "Job_title") || r.job_title;
      if (jt) job_titles.push(String(jt).trim());

      const sk = getNested(linked, "Skills");
      if (sk) {
        const toks = String(sk).split(/[;,]+/).map(s => s.trim()).filter(Boolean);
        for (const t of toks) skills.push(t);
      }

      const comp = getNested(merged, "Company") || getNested(linked, "Company_Name") || r.company;
      if (comp) companies.push(String(comp).trim());

      const site = getNested(linked, "Company_Website") || getNested(merged, "normalized_website") || getNested(merged, "Web_Address") || r.website || r.domain;
      if (site) websites.push(String(site).trim());

      const emp = getNested(merged, "NumEmployees") || r.employees;
      if (emp) employees_options.push(String(emp).trim());

      const rev = getNested(merged, "SalesVolume") || r.min_revenue || r.max_revenue;
      if (rev) revenue_options.push(String(rev).trim());
    }

    return {
      state_code: uniq(states),
      city: uniq(cities),
      country: uniq(countries),
      industry: uniq(rowData.map((r) => r.industry)),
      job_title: uniq(job_titles),
      skills: uniq(skills),
      company: uniq(companies),
      website: uniq(websites),
      employees_options: uniq(employees_options),
      revenue_options: uniq(revenue_options),
    };
  }, [rowData]);

  // PEOPLE renderer
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
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="font-semibold text-[13px] text-slate-900 truncate" title={name || "--"}>
              {name || "--"}
            </div>
            {socials.length > 0 && (
              <div className="inline-flex items-center gap-1 text-slate-500">
                {socials.map(({ Icon, href, title }, i) => (
                  <a key={i} href={href} target="_blank" rel="noreferrer" title={title} className="hover:text-slate-700">
                    <Icon className="w-3 h-3" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {hasSub && (
            <div className="text-[11.5px] text-slate-600 truncate" title={`${title}${title && company ? " · " : ""}${company}`}>
              {title || ""}
              {title && company ? " · " : ""}
              {company || ""}
            </div>
          )}

          {loc && (
            <div className="flex items-center gap-1 text-[11.5px] text-slate-500 truncate" title={loc}>
              <MapPinIcon className="w-3 h-3" />
              <span className="truncate">{loc}</span>
            </div>
          )}
        </div>
      </div>
    );
  }, []);

  // CONTACT: show full values and add copy buttons (phone + email) — matches reference
  const contactCellRenderer = useCallback((params) => {
    const r = params.data || {};

    const copyToClipboard = async (text, label) => {
      try {
        if (!text) return;
        await navigator.clipboard.writeText(String(text));
        // eslint-disable-next-line no-alert
        alert(`${label} copied to clipboard`);
      } catch (e) {
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
              {/* <button title="Copy Phone" onClick={() => copyToClipboard(phoneVal, "Phone") } className="ml-2 p-1 rounded hover:bg-slate-100">
                <Copy className="w-3.5 h-3.5 text-slate-500" />
              </button> */}
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
              {/* <button title="Copy Email" onClick={() => copyToClipboard(emailVal, "Email") } className="ml-2 p-1 rounded hover:bg-slate-100">
                <Copy className="w-3.5 h-3.5 text-slate-500" />
              </button> */}
            </>
          ) : (
            <span className="text-slate-400">--</span>
          )}
        </div>
      </div>
    );
  }, []);

  const baseColumns = useMemo(
    () => [
      {
        headerName: "",
        field: "__sel__",
        checkboxSelection: true,
        headerCheckboxSelection: true,
        maxWidth: 44,
        pinned: "left",
        resizable: false,
      },
      {
        headerName: "People",
        field: "contact_name",
        flex: 2,
        minWidth: 360,
        cellRenderer: peopleCellRenderer,
        sortable: true,
      },
      {
        headerName: "Company / Domain",
        field: "company",
        flex: 1.4,
        minWidth: 240,
        cellRenderer: (p) => {
          const r = p.data || {};
          const company = r.company || "--";
          const website = r.website || r.domain || "";
          const loc = [r.city, r.state, r.country].filter(Boolean).join(", ");
          return (
            <div className="py-1 min-w-0 leading-4">
              <div className="font-medium text-[13px] text-slate-800 truncate" title={company}>
                {company}
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
                  <a href={/^https?:\/\//.test(website) ? website : `https://${website}`} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline truncate">
                    {website}
                  </a>
                ) : (
                  <span className="text-slate-400">--</span>
                )}
              </div>
            </div>
          );
        },
        sortable: true,
      },
      {
        headerName: "Contact",
        field: "email",
        flex: 1.2,
        minWidth: 220,
        cellRenderer: contactCellRenderer,
        sortable: false,
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
          return a || b ? `${a || "–"} – ${b || "–"}` : "--";
        },
        sortable: true,
      },
    ],
    [peopleCellRenderer, contactCellRenderer]
  );

  // Extra fields: removed id, added first_name & last_name (match reference)
  const ALL_FIELDS = [
    "name", // full name
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
        headerName: field === "name" ? "Full Name" : toHeader(field),
        field,
        minWidth: 140,
        sortable: true,
        cellRenderer: undefined,
        type: numericRight.has(field) ? "rightAligned" : undefined,
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
      return def;
    });
  }, [excludeFromExtras]);

  const columnDefs = useMemo(() => [...baseColumns, ...extraColumns], [baseColumns, extraColumns]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    suppressHeaderMenuButton: true,
    valueFormatter: (params) => {
      if (params && (params.value === undefined || params.value === null || (typeof params.value === "string" && params.value.trim() === ""))) return "--";
      return params && params.value !== undefined ? params.value : "";
    },
  }), []);

  /* ---------- normalize a backend row to UI row (now includes first_name/last_name) ---------- */
  const normalizeRow = (raw = {}) => {
    const merged = raw.merged || {};
    const linked = raw.linked || {};

    const pick = (...keys) => {
      for (const k of keys) {
        if (!k) continue;
        const v = k.includes('.')
          ? k.split('.').reduce((o, p) => (o ? o[p] : undefined), raw)
          : raw[k];
        if (v !== undefined && v !== null && String(v).trim() !== "") return v;
      }
      return "";
    };

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
      _id: raw._id || "",
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

  /* ---------- Helper: build params from filters ---------- */
  const buildParamsFromFilters = (filters) => {
    const params = {};
    for (const key of Object.keys(filters || {})) {
      const v = filters[key];
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        if (v.length === 0) continue;
        params[key] = v.join(",");
      } else if (typeof v === "string") {
        if (v.trim() === "") continue;
        params[key] = v.trim();
      } else {
        params[key] = String(v);
      }
    }
    return params;
  };

  /* ---------- Server-paginated fetch for a specific page ---------- */
  const fetchPage = async (pageNumber = 0, overrides = {}) => {
    setHasApplied(true);
    setLoading(true);

    try {
      const mergedFilters = { ...f, ...overrides };

      if (nameInput && nameInput.trim() !== "") {
        mergedFilters.contact_full_name = nameInput.trim();
        setF((s) => ({ ...s, contact_full_name: nameInput.trim() }));
      }

      if (exactMatch) mergedFilters.exact = "1";
      else delete mergedFilters.exact;

      const params = buildParamsFromFilters(mergedFilters);
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
        total = (metaTotal !== undefined && metaTotal !== null) ? metaTotal : hits.length;
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

  /* ---------- Search handlers / guards ---------- */
  const handleNameSearch = async () => {
    const v = (nameInput || "").trim();
    if (!v) return;
    await fetchPage(0, { contact_full_name: v });
  };

  const areFiltersEmpty = useCallback(() => {
    for (const key of Object.keys(initialFilters)) {
      const def = initialFilters[key];
      const cur = f[key];
      if (Array.isArray(def)) {
        if ((cur || []).length > 0) return false;
      } else {
        const defStr = def ?? "";
        const curStr = cur ?? "";
        if (String(defStr) !== String(curStr)) return false;
      }
    }
    return true;
  }, [f]);

  const isFilterSearchDisabled = useMemo(() => areFiltersEmpty(), [areFiltersEmpty]);
  const isNameSearchDisabled = useMemo(() => String(nameInput || "").trim() === "", [nameInput]);

  const handleFilterSearch = async () => {
    if (isFilterSearchDisabled) return;
    await fetchPage(0);
  };

  // selection
  const onSelectionChanged = useCallback(() => {
    const count = gridRef.current?.api?.getSelectedNodes()?.length || 0;
    setSelectedCount(count);
  }, []);

  const onGridReady = useCallback(() => {}, []);

  // Active chips
  const activeChips = useMemo(() => {
    const chips = [];
    const push = (label, onRemove) => chips.push({ label, onRemove });
    if (f.state_code && f.state_code.length)
      f.state_code.forEach((v) => push(`State: ${v}`, () => setF((s) => ({ ...s, state_code: s.state_code.filter((x) => x !== v) }))));
    if (f.company_location_country && f.company_location_country.length)
      f.company_location_country.forEach((v) => push(`Country: ${v}`, () => setF((s) => ({ ...s, company_location_country: s.company_location_country.filter((x) => x !== v) }))));
    if (f.company_name && f.company_name.length)
      f.company_name.forEach((v) => push(`Company ~ ${v}`, () => setF((s) => ({ ...s, company_name: s.company_name.filter((x) => x !== v) }))));
    if (f.city && f.city.length)
      f.city.forEach((v) => push(`City ~ ${v}`, () => setF((s) => ({ ...s, city: s.city.filter((x) => x !== v) }))));
    if (f.zip_code) push(`ZIP ~ ${f.zip_code}`, () => setF((s) => ({ ...s, zip_code: "" })));
    if (f.website && f.website.length)
      f.website.forEach((v) => push(`Website ~ ${v}`, () => setF((s) => ({ ...s, website: s.website.filter((x) => x !== v) }))));
    if (f.contact_full_name) push(`Full Name: ${f.contact_full_name}`, () => setF((s) => ({ ...s, contact_full_name: "" })));
    if (f.job_title && f.job_title.length)
      f.job_title.forEach((v) => push(`Title: ${v}`, () => setF((s) => ({ ...s, job_title: s.job_title.filter((x) => x !== v) }))));
    if (f.skills_tokens && f.skills_tokens.length)
      f.skills_tokens.forEach((v) => push(`Skill: ${v}`, () => setF((s) => ({ ...s, skills_tokens: s.skills_tokens.filter((x) => x !== v) }))));

    if (f.employees && f.employees.length)
      f.employees.forEach((v) => push(`Employees: ${v}`, () => setF((s) => ({ ...s, employees: s.employees.filter((x) => x !== v) }))));

    if (f.sales_volume && f.sales_volume.length)
      f.sales_volume.forEach((v) => push(`Revenue: ${v}`, () => setF((s) => ({ ...s, sales_volume: s.sales_volume.filter((x) => x !== v) }))));

    if (f.phone) push(`Phone: ${f.phone}`, () => setF((s) => ({ ...s, phone: "" })));
    if (f.normalized_email) push(`Email: ${f.normalized_email}`, () => setF((s) => ({ ...s, normalized_email: "" })));
    if (f.domain && f.domain.length) f.domain.forEach((v) => push(`Domain: ${v}`, () => setF((s) => ({ ...s, domain: s.domain.filter(x => x !== v) }))));

    return chips;
  }, [f]);

  // grid height adjustment
  const GRID_BASE = 510;
  const gridHeight = Math.max(470, GRID_BASE - (hasApplied && activeChips.length ? chipBarH : 0));

  // pagination helpers
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

  /* ---------- Render layout (filters rail + main area) ---------- */
  return (
    <div className="h-[calc(96vh-0px)] flex">
      {/* Filters rail (same compact rail as Dashboard) */}
      <div className="relative z-20 shrink-0 w-[200px]">
        <aside className="relative h-full bg-white border rounded-xl shadow-md overflow-visible">
          <div className="h-10 px-3 border-b flex items-center gap-2 text-[12px] font-semibold text-slate-700">
            <FilterIcon className="w-4 h-4 text-slate-600" />
            Filter
          </div>

          <div className="px-3 pb-3 pt-3 overflow-y-auto overflow-x-hidden h-[calc(100%-40px)] space-y-2">
            <FilterSection icon={User} label="Contact">
              {/* Changed label to Full Name to match reference */}
              <TextInput label="Full Name" value={f.contact_full_name} onChange={(v) => setF((s) => ({ ...s, contact_full_name: v }))} />
            </FilterSection>

            <FilterSection icon={MapPin} label="Location">
              <MultiSelect label="State" options={US_STATES} values={f.state_code} onChange={(v) => setF((s) => ({ ...s, state_code: v }))} />
              <MultiSelect label="City" options={facets.city} values={f.city} onChange={(v) => setF((s) => ({ ...s, city: v }))} />
              <TextInput label="ZIP" value={f.zip_code} onChange={(v) => setF((s) => ({ ...s, zip_code: v }))} />
            </FilterSection>

            <FilterSection icon={Briefcase} label="Role & Department">
              <MultiSelect label="Job Title" options={facets.job_title} values={f.job_title} onChange={(v) => setF((s) => ({ ...s, job_title: v }))} />
            </FilterSection>

            <FilterSection icon={Tags} label="Skills">
              <MultiSelect label="Skills" options={facets.skills} values={f.skills_tokens} onChange={(v) => setF((s) => ({ ...s, skills_tokens: v }))} />
            </FilterSection>

            <FilterSection icon={Building2} label="Company / Domain">
              <MultiSelect label="Company Name" options={facets.company} values={f.company_name} onChange={(v) => setF((s) => ({ ...s, company_name: v }))} />
              <MultiSelect label="Website / Domain" options={facets.website} values={f.website} onChange={(v) => setF((s) => ({ ...s, website: v }))} />
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className={labelCls}>Public Company</span>
                  <div className="mt-1">
                    <div className="inline-flex rounded-md overflow-hidden border text-[10px]">
                      {["any", "Y", "N"].map((k) => (
                        <button key={k} onClick={() => setF((s) => ({ ...s, public_company: k }))} className={`px-2 h-7 ${f.public_company === k ? "bg-sky-600 text-white" : "bg-white hover:bg-slate-50"}`}>{k === "any" ? "Any" : k}</button>
                      ))}
                    </div>
                  </div>
                </label>
                <label className="block">
                  <span className={labelCls}>Franchise</span>
                  <div className="mt-1">
                    <div className="inline-flex rounded-md overflow-hidden border text-[10px]">
                      {["any", "Y", "N"].map((k) => (
                        <button key={k} onClick={() => setF((s) => ({ ...s, franchise_flag: k }))} className={`px-2 h-7 ${f.franchise_flag === k ? "bg-sky-600 text-white" : "bg-white hover:bg-slate-50"}`}>{k === "any" ? "Any" : k}</button>
                      ))}
                    </div>
                  </div>
                </label>
              </div>
            </FilterSection>

            <FilterSection icon={Users} label="Size & Revenue">
              <MultiSelect label="Employee Count" options={facets.employees_options} values={f.employees} onChange={(v) => setF((s) => ({ ...s, employees: v }))} />
              <MultiSelect label="Total Revenue (Corp)" options={facets.revenue_options} values={f.sales_volume} onChange={(v) => setF((s) => ({ ...s, sales_volume: v }))} />
            </FilterSection>

            <div className="pt-1">
              <button
                onClick={handleFilterSearch}
                disabled={isFilterSearchDisabled}
                className="w-full h-8 rounded-md bg-sky-600 text-white text-[12px] shadow-sm hover:bg-sky-700 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SearchIcon className="w-4 h-4" />
                Search
              </button>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <label className="text-slate-500 inline-flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  Saved Filters
                </label>
                <button
                  onClick={() => {
                    setF(initialFilters);
                    setRowData([]);
                    setViewRows([]);
                    setHasApplied(false);
                    setTotalHits(0);
                    setNameInput("");
                    setExactMatch(false);
                  }}
                  className="text-slate-700 hover:text-slate-900"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Main content */}
      <main className="flex-1 px-2 pt-0 pb-6 -mt-3">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Search by Name</h1>
          <div className="flex items-center gap-2">
            <div className="ml-3 flex items-center gap-2">
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleNameSearch(); }}
                className="h-8 rounded-md border px-2 text-[12px] placeholder:text-slate-400"
                placeholder="Enter name or partial (e.g. John, Smith)"
                aria-label="Search by name"
              />
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={exactMatch} onChange={(e) => setExactMatch(e.target.checked)} className="h-4 w-4" />
                <span className="text-[13px]">Exact match</span>
              </label>
              <button
                onClick={handleNameSearch}
                disabled={isNameSearchDisabled}
                className="h-8 px-3 rounded-md bg-sky-600 text-white text-[12px] hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {hasApplied && activeChips.length > 0 && (
          <div ref={chipBarRef} className="mb-2">
            <div className="bg-white border rounded-xl shadow-sm px-3 py-2 flex flex-wrap items-center gap-1">
              <span className="text-[11px] font-medium text-slate-600 mr-1">Filters:</span>
              {activeChips.map((c, i) => (
                <Chip key={i} onRemove={c.onRemove}>{c.label}</Chip>
              ))}
            </div>
          </div>
        )}

        <div className="relative ag-theme-quartz bg-white border rounded-xl shadow-sm" style={{ height: gridHeight, width: "100%", "--ag-header-background-color": "#deeff7ff" }}>
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

        {!loading && hasApplied && viewRows.length === 0 && <div className="mt-2 text-xs text-slate-500">No data found.</div>}

        {hasApplied && totalHits > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <div className="relative">
              <button type="button" onClick={(e) => { e.stopPropagation(); setPageOptionsOpen((s) => !s); }} className="inline-flex items-center gap-2 px-3 py-1 border rounded-md bg-white text-sm text-slate-700 hover:bg-slate-50 shadow-sm">
                Showing <span className="font-semibold">{Math.min(totalHits, pageSize)}</span> rows of <span className="font-semibold">{totalHitsDisplay}</span>
                <svg className={`w-4 h-4 transition-transform ${pageOptionsOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06-.02L10 10.88l3.71-3.69a.75.75 0 111.06 1.06l-4.24 4.22a.75.75 0 01-1.06 0L5.25 8.25a.75.75 0 01-.02-1.06z" /></svg>
              </button>

              {pageOptionsOpen && (
                <div className="absolute left-0 w-44 bg-white border rounded-md shadow-lg z-50" onClick={(e) => e.stopPropagation()} style={{ minWidth: 160, top: "-265px" }}>
                  <div className="p-2 text-xs text-slate-500">Rows per page</div>
                  <div className="max-h-56 overflow-auto divide-y">
                    {PAGE_OPTIONS.map((opt) => (
                      <button key={opt} onClick={() => { setPageOptionsOpen(false); setPageSize(Number(opt)); if (hasApplied && typeof fetchPage === "function") fetchPage(0, {}); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${Number(pageSize) === Number(opt) ? "font-medium text-sky-700" : "text-slate-700"}`}>
                        {opt} rows{Number(pageSize) === Number(opt) && <span className="ml-2 text-[10px] text-slate-400">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={onPrev} disabled={page <= 0} className="px-3 py-1 rounded-md border disabled:opacity-50 disabled:cursor-not-allowed">Prev</button>
              <div className="text-sm text-slate-600 px-2">Page <span className="font-medium">{page + 1}</span> of <span className="font-medium">{totalPages}</span></div>
              <button onClick={onNext} disabled={page + 1 >= totalPages} className="px-3 py-1 rounded-md border disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
