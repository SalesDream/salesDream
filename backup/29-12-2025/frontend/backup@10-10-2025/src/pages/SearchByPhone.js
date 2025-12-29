// src/pages/SearchByPhone.jsx
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
  Calendar,
  Building2,
  Users,
  Plus,
  Minus,
} from "lucide-react";

/**
 * SearchByPhone page
 *
 * - All selected filters are sent to backend on every search (arrays -> comma separated)
 * - A checkbox "Exact match" sets exact=1 when checked
 * - Top input is phone (not email). It syncs to filters.phone when used.
 */

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
    if (values.includes(val)) onChange(values.filter((v) => v !== val));
    else onChange([...values, val]);
  };
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="mt-1 relative">
        <button type="button" onClick={() => setOpen((v) => !v)} className={inputCls + " text-left"}>
          {values.length ? `${values.length} selected` : "Any"}
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
                    <input className="accent-sky-600" type="checkbox" checked={values.includes(opt)} onChange={() => toggle(opt)} />
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
      {values.length > 0 && (
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
  if (!v) return <span>-</span>;
  const href = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  const label = String(v).replace(/^https?:\/\//i, "");
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline truncate">
      {label}
    </a>
  );
};
const DateCell = (p) => {
  const v = p.value ?? p.data?.[p.colDef.field];
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toLocaleDateString();
};
const normalizeUrl = (v) => {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s === "-") return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

/* ======================
   MAIN SearchByPhone Component
   ====================== */
export default function SearchByPhone() {
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

  // phone input (top right)
  const [phoneInput, setPhoneInput] = useState("");

  // exact match checkbox
  const [exactMatch, setExactMatch] = useState(false);

  // Filters shape (same as Dashboard)
  const initialFilters = {
    state_code: [],
    city: "",
    zip_code: "",
    company_location_country: [],
    company_name: "",
    industry: [],
    website: "",
    public_company: "any",
    franchise_flag: "any",
    employees_min: "",
    employees_max: "",
    revenue_min: "",
    revenue_max: "",
    contact_full_name: "",
    job_title: [],
    contact_gender: [],
    skills_tokens: [],
    has_company_linkedin: "any",
    has_contact_linkedin: "any",
    job_start_from: "",
    job_start_to: "",
    years_min: "",
    years_max: "",
    phone: "",
    normalized_email: "",
    domain: "",
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

  // Auth guard
  const token = useAuthToken();
  if (!token) return <Navigate to="/login" replace />;

  // Facets from current page results (lightweight)
  const facets = useMemo(() => {
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
    return {
      state_code: uniq(rowData.map((r) => r.state)),
      country: uniq(rowData.map((r) => r.country || r.company_location_country)),
      industry: uniq(rowData.map((r) => r.industry)),
      job_title: uniq(rowData.map((r) => r.job_title)),
      skills: [],
    };
  }, [rowData]);

  // Compact renderers (reused)
  const peopleCellRenderer = useCallback((params) => {
    const r = params.data || {};
    const name = (r.contact_name || r.name || "").trim();
    const title = (r.job_title || "").trim();
    const company = (r.company || r.domain || "").trim();
    const loc = [r.city, r.state].filter(Boolean).join(", ");
    const lk = normalizeUrl(r.linkedin_url);
    const fb = normalizeUrl(r.facebook || r.facebook_url);
    const tw = normalizeUrl(r.twitter || r.twitter_url);
    const socials = [
      lk && { Icon: Linkedin, href: lk },
      fb && { Icon: Facebook, href: fb },
      tw && { Icon: Twitter, href: tw },
    ].filter(Boolean);

    return (
      <div className="flex items-center gap-2 py-1 min-w-0 leading-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="font-semibold text-[13px] text-slate-900 truncate" title={name || "—"}>
              {name || "—"}
            </div>
            {socials.length > 0 && (
              <div className="inline-flex items-center gap-1 text-slate-500">
                {socials.map(({ Icon, href }, i) => (
                  <a key={i} href={href} target="_blank" rel="noreferrer" className="hover:text-slate-700">
                    <Icon className="w-3 h-3" />
                  </a>
                ))}
              </div>
            )}
          </div>
          {(title || company) && (
            <div className="text-[11.5px] text-slate-600 truncate" title={`${title}${title && company ? " · " : ""}${company}`}>
              {title}
              {title && company ? " · " : ""}
              {company}
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

  const contactCellRenderer = useCallback((params) => {
    const r = params.data || {};
    const maskEmail = (v) => {
      if (!v) return "••••••••";
      const [u, d] = String(v).split("@");
      if (!d) return "••••••••";
      return `${u.slice(0, 1)}••••@${d}`;
    };
    const maskPhone = (v) => {
      if (!v) return "••••••••";
      const s = String(v).replace(/\D/g, "");
      return s.length >= 3 ? `${s.slice(0, 3)}•••••••` : "••••••••";
    };
    return (
      <div className="flex flex-col gap-0.5 py-1 leading-4">
        <div className="flex items-center gap-1 text-[12px] text-slate-700">
          <Phone className="w-3 h-3 text-slate-500" />
          <span>{maskPhone(r.phone)}</span>
        </div>
        <div className="flex items-center gap-1 text-[12px] text-slate-700">
          <Mail className="w-3 h-3 text-slate-500" />
          <span>{maskEmail(r.email)}</span>
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
          const company = r.company || "-";
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
                  <span>-</span>
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
    ],
    [peopleCellRenderer, contactCellRenderer]
  );

  const ALL_FIELDS = [
    "id",
    "contact_name",
    "name",
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
  const numericRight = new Set(["id", "employees", "median_income_census_area", "sales_volume", "min_revenue", "max_revenue", "zip", "sic"]);

  const extraColumns = useMemo(() => {
    return ALL_FIELDS.map((field) => {
      const def = { headerName: toHeader(field), field, minWidth: 140, sortable: true, type: numericRight.has(field) ? "rightAligned" : undefined };
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
  }, []);

  const columnDefs = useMemo(() => [...baseColumns, ...extraColumns], [baseColumns, extraColumns]);
  const defaultColDef = useMemo(() => ({ sortable: true, resizable: true, suppressHeaderMenuButton: true }), []);

  /* ---------- normalize a backend row to UI row ---------- */
  const pick = (raw, ...keys) => {
    for (const k of keys) {
      if (!k) continue;
      const v = raw[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return "";
  };

  const normalizeRow = (raw = {}) => {
    const email = pick(raw, "linked_normalized_email", "merged_normalized_email", "linked_Emails", "merged_Email", "email");
    const contact_name = pick(raw, "linked_Full_name", "merged_ContactName", "merged_normalized_full_name", "linked_normalized_full_name", "contact_name", "name");
    const company = pick(raw, "merged_Company", "linked_Company_Name", "merged_normalized_company_name", "company");
    const job_title = pick(raw, "linked_Job_title", "merged_Title_Full", "job_title");
    const website = pick(raw, "linked_Company_Website", "merged_normalized_website", "merged_Web_Address", "website", "domain");
    const domain = pick(raw, "merged_normalized_website", "linked_Company_Website", "domain", website);
    const phone = pick(raw, "merged_Phone", "merged_Telephone_Number", "merged_normalized_phone", "linked_Mobile", "linked_Phone_numbers", "phone");
    const city = pick(raw, "merged_City", "linked_Locality", "city");
    const state = pick(raw, "merged_State", "linked_normalized_state", "state");
    const country = pick(raw, "linked_Countries", "merged_Country", "country");
    const employees = pick(raw, "merged_NumEmployees", "employees");
    const min_revenue = pick(raw, "merged_SalesVolume", "min_revenue");
    const max_revenue = pick(raw, "merged_SalesVolume", "max_revenue");
    const created_at = pick(raw, "linked_Last_Updated", "linked_Birth_Date", "created_at", "createdAt", "@timestamp");
    const id = pick(raw, "merged_id", "linked_id", "es_id", "id") || raw._id || "";
    const linkedin_url = pick(raw, "linked_LinkedIn_URL", "linkedin_url");
    const facebook = pick(raw, "linked_Facebook_URL", "facebook", "facebook_url");
    const twitter = pick(raw, "linked_Twitter_URL", "twitter", "twitter_url");
    const normWebsite = website ? String(website).replace(/^https?:\/\//i, "") : "";

    return {
      _id: raw._id || id,
      id,
      es_id: raw.es_id || "",
      contact_name: contact_name || "",
      name: contact_name || "",
      company: company || "",
      job_title: job_title || "",
      phone: phone || "",
      email: email || "",
      website: website || normWebsite || "",
      domain: domain || normWebsite || "",
      city: city || "",
      state: state || "",
      country: country || "",
      employees: employees || "",
      min_revenue: min_revenue || "",
      max_revenue: max_revenue || "",
      created_at: created_at || "",
      linkedin_url: linkedin_url || "",
      facebook: facebook || "",
      twitter: twitter || "",
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
        // send arrays as comma-separated
        params[key] = v.join(",");
      } else if (typeof v === "string") {
        if (v.trim() === "") continue;
        params[key] = v.trim();
      } else {
        // numbers/booleans
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
      // merge filters: base filters `f` plus `overrides`
      const mergedFilters = { ...f, ...overrides };

      // If user typed phone in top box, prefer that (sync f too so chips / filters reflect it)
      if (phoneInput && phoneInput.trim() !== "") {
        mergedFilters.phone = phoneInput.trim();
        setF((s) => ({ ...s, phone: phoneInput.trim() }));
      }

      // include exact flag if checked
      if (exactMatch) mergedFilters.exact = "1";
      else delete mergedFilters.exact;

      // Build params from mergedFilters (arrays -> csv)
      const params = buildParamsFromFilters(mergedFilters);
      // Add pagination
      params.limit = pageSize;
      params.offset = Math.max(0, pageNumber * pageSize);

      // call backend
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

      // normalize and update state
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
  const handlePhoneSearch = async () => {
    const v = (phoneInput || "").trim();
    if (!v) {
      // Nothing to search
      return;
    }
    // call backend with override so fetchPage uses the override immediately
    await fetchPage(0, { phone: v });
  };

  // selection
  const onSelectionChanged = useCallback(() => {
    const count = gridRef.current?.api?.getSelectedNodes()?.length || 0;
    setSelectedCount(count);
  }, []);

  const onGridReady = useCallback(() => {}, []);

  // Active chips (phone/domain + others)
  const activeChips = useMemo(() => {
    const chips = [];
    const push = (label, onRemove) => chips.push({ label, onRemove });
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
    if (f.company_name) push(`Company ~ ${f.company_name}`, () => setF((s) => ({ ...s, company_name: "" })));
    if (f.city) push(`City ~ ${f.city}`, () => setF((s) => ({ ...s, city: "" })));
    if (f.zip_code) push(`ZIP ~ ${f.zip_code}`, () => setF((s) => ({ ...s, zip_code: "" })));
    if (f.website) push(`Website ~ ${f.website}`, () => setF((s) => ({ ...s, website: "" })));
    if (f.contact_full_name) push(`Contact ~ ${f.contact_full_name}`, () => setF((s) => ({ ...s, contact_full_name: "" })));
    if (f.job_title && f.job_title.length)
      f.job_title.forEach((v) => push(`Title: ${v}`, () => setF((s) => ({ ...s, job_title: s.job_title.filter((x) => x !== v) }))));
    if (f.phone) push(`Phone: ${f.phone}`, () => setF((s) => ({ ...s, phone: "" })));
    if (f.normalized_email) push(`Email: ${f.normalized_email}`, () => setF((s) => ({ ...s, normalized_email: "" })));
    if (f.domain) push(`Domain: ${f.domain}`, () => setF((s) => ({ ...s, domain: "" })));
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
              <TextInput label="Contact Name" value={f.contact_full_name} onChange={(v) => setF((s) => ({ ...s, contact_full_name: v }))} />
            </FilterSection>

            <FilterSection icon={MapPin} label="Location">
              <MultiSelect label="State" options={facets.state_code} values={f.state_code} onChange={(v) => setF((s) => ({ ...s, state_code: v }))} />
              <TextInput label="City" value={f.city} onChange={(v) => setF((s) => ({ ...s, city: v }))} />
              <TextInput label="ZIP" value={f.zip_code} onChange={(v) => setF((s) => ({ ...s, zip_code: v }))} />
              <MultiSelect label="Country" options={facets.country} values={f.company_location_country} onChange={(v) => setF((s) => ({ ...s, company_location_country: v }))} />
            </FilterSection>

            <FilterSection icon={Briefcase} label="Role & Department">
              <MultiSelect label="Job Title" options={facets.job_title} values={f.job_title} onChange={(v) => setF((s) => ({ ...s, job_title: v }))} />
            </FilterSection>

            <FilterSection icon={Tags} label="Skills">
              <MultiSelect label="Skills" options={facets.skills} values={f.skills_tokens} onChange={(v) => setF((s) => ({ ...s, skills_tokens: v }))} />
            </FilterSection>

            <FilterSection icon={Calendar} label="Years Of Experience">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className={labelCls}>Years</span>
                  <div className="mt-1 flex items-center gap-2">
                    <input value={f.years_min} onChange={(e) => setF((s) => ({ ...s, years_min: e.target.value }))} className={inputCls + " w-24"} placeholder="Min" />
                    <span className="text-slate-400 text-[10px]">—</span>
                    <input value={f.years_max} onChange={(e) => setF((s) => ({ ...s, years_max: e.target.value }))} className={inputCls + " w-24"} placeholder="Max" />
                  </div>
                </div>
                <div>
                  <span className={labelCls}>Job Start Date</span>
                  <div className="mt-1 flex items-center gap-2">
                    <input type="date" value={f.job_start_from} onChange={(e) => setF((s) => ({ ...s, job_start_from: e.target.value }))} className={inputCls + " w-[130px]"} />
                    <span className="text-slate-400 text-[10px]">→</span>
                    <input type="date" value={f.job_start_to} onChange={(e) => setF((s) => ({ ...s, job_start_to: e.target.value }))} className={inputCls + " w-[130px]"} />
                  </div>
                </div>
              </div>
            </FilterSection>

            <FilterSection icon={Building2} label="Company / Domain">
              <TextInput label="Company Name" value={f.company_name} onChange={(v) => setF((s) => ({ ...s, company_name: v }))} />
              <TextInput label="Website / Domain" value={f.website} onChange={(v) => setF((s) => ({ ...s, website: v }))} />
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
              <div>
                <span className={labelCls}>Employee Count</span>
                <div className="mt-1 flex items-center gap-2">
                  <input value={f.employees_min} onChange={(e) => setF((s) => ({ ...s, employees_min: e.target.value }))} className={inputCls + " w-24"} placeholder="Min" />
                  <span className="text-slate-400 text-[10px]">—</span>
                  <input value={f.employees_max} onChange={(e) => setF((s) => ({ ...s, employees_max: e.target.value }))} className={inputCls + " w-24"} placeholder="Max" />
                </div>
              </div>
              <div>
                <span className={labelCls}>Total Revenue (Corp)</span>
                <div className="mt-1 flex items-center gap-2">
                  <input value={f.revenue_min} onChange={(e) => setF((s) => ({ ...s, revenue_min: e.target.value }))} className={inputCls + " w-24"} placeholder="Min" />
                  <span className="text-slate-400 text-[10px]">—</span>
                  <input value={f.revenue_max} onChange={(e) => setF((s) => ({ ...s, revenue_max: e.target.value }))} className={inputCls + " w-24"} placeholder="Max" />
                </div>
              </div>
            </FilterSection>

            <div className="pt-1">
              <button
                onClick={() => fetchPage(0)}
                className="w-full h-8 rounded-md bg-sky-600 text-white text-[12px] shadow-sm hover:bg-sky-700 inline-flex items-center justify-center gap-2"
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
                    setPhoneInput("");
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
          <h1 className="text-xl font-semibold">Search by Phone</h1>
          <div className="flex items-center gap-2">
            <label className="text-[12px] text-slate-600 mr-1">Rows:</label>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="h-8 border rounded-md text-[12px] px-2">
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>

            {/* phone input + exact checkbox + Search button */}
            <div className="ml-3 flex items-center gap-2">
              <input
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePhoneSearch();
                }}
                className="h-8 rounded-md border px-2 text-[12px] placeholder:text-slate-400"
                placeholder="Enter phone or partial (e.g. 907, 555-1234)"
                aria-label="Search by phone"
              />
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={exactMatch} onChange={(e) => setExactMatch(e.target.checked)} className="h-4 w-4" />
                <span className="text-[13px]">Exact match</span>
              </label>
              <button onClick={handlePhoneSearch} className="h-8 px-3 rounded-md bg-sky-600 text-white text-[12px] hover:bg-sky-700">
                Search
              </button>
            </div>
          </div>
        </div>

        {/* active chips */}
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

        {/* Grid */}
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
            <div className="text-sm text-slate-600">
              Showing <span className="font-medium">{Math.min(totalHits, pageSize)}</span> rows of <span className="font-medium">{totalHitsDisplay}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onPrev} disabled={page <= 0} className="px-3 py-1 rounded-md border disabled:opacity-50">Prev</button>
              <div className="text-sm text-slate-600 px-2">Page <span className="font-medium">{page + 1}</span> of <span className="font-medium">{totalPages}</span></div>
              <button onClick={onNext} disabled={page + 1 >= totalPages} className="px-3 py-1 rounded-md border disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
