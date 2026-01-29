// src/pages/SearchByEmail.jsx
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
  Search as SearchIcon,
  Mail,
  Phone,
  Globe2,
  Linkedin,
  Facebook,
  Twitter,
  MapPin as MapPinIcon,
} from "lucide-react";

/* ---------- Small helpers ---------- */
const toHeader = (s) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

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

/* ---------- Link / Date Cells ---------- */
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

/* ======================
   MAIN SearchByEmail
   ====================== */
export default function SearchByEmail() {
  const gridRef = useRef(null);
  const chipBarRef = useRef(null);

  const [rowData, setRowData] = useState([]);
  const [viewRows, setViewRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);

  const [pageSize, setPageSize] = useState(100);
  const [page, setPage] = useState(0);
  const [totalHits, setTotalHits] = useState(0);

  const location = useLocation();
  const pathname = location.pathname || "/search-email";

  const PAGE_OPTIONS = [100, 200, 500, 1000];
  const [pageOptionsOpen, setPageOptionsOpen] = useState(false);

  // top header email input (quick search)
  const [emailInput, setEmailInput] = useState("");

  // Auth guard
  const token = useAuthToken();
  if (!token) return <Navigate to="/login" replace />;

  // Filters rail open by default (same behavior as Dashboard)
  const [filtersOpen, setFiltersOpen] = useState(() => {
    const v = localStorage.getItem("leadFiltersCollapsed");
    return v === "0" || v === null;
  });
  useEffect(() => {
    localStorage.setItem("leadFiltersCollapsed", filtersOpen ? "0" : "1");
  }, [filtersOpen]);

  // close rows dropdown when clicking outside
  useEffect(() => {
    if (!pageOptionsOpen) return;
    const onDocClick = () => setPageOptionsOpen(false);
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [pageOptionsOpen]);

  /* ====== Filters state (MATCH Dashboard) ====== */
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

  // selection
  const onSelectionChanged = useCallback(() => {
    const count = gridRef.current?.api?.getSelectedNodes()?.length || 0;
    setSelectedCount(count);
  }, []);

  /* ---------- Build query (same as Dashboard) ---------- */
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
      filters.company_name && filters.company_name.join
        ? filters.company_name.join(",")
        : filters.company_name
    );
    set(
      "city",
      filters.city && filters.city.join ? filters.city.join(",") : filters.city
    );
    set("zip_code", filters.zip_code);
    set(
      "website",
      filters.website && filters.website.join
        ? filters.website.join(",")
        : filters.website
    );
    set("contact_full_name", filters.contact_full_name);

    set(
      "state_code",
      filters.state_code && filters.state_code.join
        ? filters.state_code.join(",")
        : filters.state_code
    );
    set(
      "company_location_country",
      filters.company_location_country && filters.company_location_country.join
        ? filters.company_location_country.join(",")
        : filters.company_location_country
    );
    set(
      "industry",
      filters.industry && filters.industry.join
        ? filters.industry.join(",")
        : filters.industry
    );
    set("industry_source", filters.industry_source || "");
    set(
      "job_title",
      filters.job_title && filters.job_title.join
        ? filters.job_title.join(",")
        : filters.job_title
    );
    set(
      "contact_gender",
      filters.contact_gender && filters.contact_gender.join
        ? filters.contact_gender.join(",")
        : filters.contact_gender
    );
    set(
      "skills",
      filters.skills_tokens && filters.skills_tokens.join
        ? filters.skills_tokens.join(",")
        : filters.skills_tokens
    );

    if (filters.public_company !== "any") set("public_company", filters.public_company);
    if (filters.franchise_flag !== "any") set("franchise_flag", filters.franchise_flag);

    set(
      "employees",
      filters.employees && filters.employees.join
        ? filters.employees.join(",")
        : filters.employees
    );
    set(
      "sales_volume",
      filters.sales_volume && filters.sales_volume.join
        ? filters.sales_volume.join(",")
        : filters.sales_volume
    );

    set("phone", filters.phone);
    set("normalized_email", filters.normalized_email);
    set(
      "domain",
      filters.domain && filters.domain.join ? filters.domain.join(",") : filters.domain
    );

    return q;
  };

  /* ---------- normalize row (same mapping style) ---------- */
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
      raw.employees || pick("merged.NumEmployees") || merged.NumEmployees || "";

    const min_revenue =
      raw.min_revenue || pick("merged.SalesVolume") || merged.SalesVolume || "";

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
      facebook: raw.facebook || raw.facebook_url || "",
      twitter: raw.twitter || raw.twitter_url || "",
      sales_volume: raw.sales_volume || "",
      __raw: raw,
    };
  };

  /* ---------- columns ---------- */
  const peopleCellRenderer = useCallback((params) => {
    const r = params.data || {};
    const name = (r.contact_name || r.name || "").trim();
    return (
      <div className="flex items-center gap-2 py-1 min-w-0 leading-4">
        <div className="min-w-0">
          <div className="font-semibold text-[13px] text-slate-900 truncate" title={name || "--"}>
            {name || "--"}
          </div>
        </div>
      </div>
    );
  }, []);

  const phoneOnlyRenderer = useCallback((params) => {
    const r = params.data || {};
    let phoneVal = r.phone || "";
    if (Array.isArray(phoneVal)) phoneVal = phoneVal.join(", ");
    if (typeof phoneVal === "string" && phoneVal.includes(",")) phoneVal = phoneVal.split(",")[0].trim();
    if (!phoneVal) return <span className="text-slate-400">--</span>;
    return (
      <div className="flex items-center gap-2 text-[12px] text-slate-700">
        <Phone className="w-3 h-3 text-slate-500" />
        <span className="truncate">{phoneVal}</span>
      </div>
    );
  }, []);

  const emailOnlyRenderer = useCallback((params) => {
    const r = params.data || {};
    const emailVal = r.email || "";
    if (!emailVal) return <span className="text-slate-400">--</span>;
    return (
      <div className="flex items-center gap-2 text-[12px] text-slate-700">
        <Mail className="w-3 h-3 text-slate-500" />
        <span className="truncate">{emailVal}</span>
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
        headerName: "Full Name",
        field: "name",
        flex: 1.4,
        minWidth: 240,
        cellRenderer: peopleCellRenderer,
        sortable: true,
      },
    ],
    [peopleCellRenderer]
  );

  const ALL_FIELDS = [
    "name",
    "first_name",
    "last_name",
    "phone",
    "address",
    "city",
    "state",
    "zip",
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
    "sales_volume",
    "min_revenue",
    "max_revenue",
    "zip",
  ]);

  const excludeFromExtras = useMemo(() => {
    try {
      return new Set((baseColumns || []).map((c) => c.field).filter(Boolean));
    } catch {
      return new Set();
    }
  }, [baseColumns]);

  const extraColumns = useMemo(() => {
    return ALL_FIELDS.filter((f) => !excludeFromExtras.has(f)).reduce((acc, field) => {
      const def = {
        headerName: field === "name" ? "Full Name" : toHeader(field),
        field,
        minWidth: 140,
        sortable: true,
        cellRenderer: undefined,
        type: numericRight.has(field) ? "rightAligned" : undefined,
        valueFormatter: (params) => {
          const v = params.value;
          if (v === undefined || v === null || (typeof v === "string" && v.trim() === ""))
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
      if (field === "phone") {
        def.cellRenderer = phoneOnlyRenderer;
        def.minWidth = 150;
      }
      if (field === "email") {
        def.cellRenderer = emailOnlyRenderer;
        def.minWidth = 220;
      }

      acc[field] = def;
      return acc;
    }, {});
  }, [excludeFromExtras, phoneOnlyRenderer, emailOnlyRenderer]);

  const ORDERED_FIELDS = [
    "name",
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
    "max_revenue",
  ];

  const columnDefs = useMemo(() => {
    const map = { ...(extraColumns || {}) };
    const result = [...baseColumns];
    const added = new Set(result.map((c) => c.field).filter(Boolean));

    for (const fName of ORDERED_FIELDS) {
      if (added.has(fName)) continue;
      if (map[fName]) {
        result.push(map[fName]);
        added.add(fName);
        delete map[fName];
      }
    }

    for (const f of ALL_FIELDS) {
      if (added.has(f)) continue;
      if (map[f]) {
        result.push(map[f]);
        added.add(f);
      }
    }

    return result;
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

  /* ---------- server fetch ---------- */
  const fetchPage = async (pageNumber = 0, overrides = {}) => {
    setHasApplied(true);
    setLoading(true);

    try {
      const mergedFilters = { ...f, ...overrides };

      // Apply email input as normalized_email
      const ev = String(emailInput || "").trim().toLowerCase();
      if (ev) {
        mergedFilters.normalized_email = ev;
        setF((s) => ({ ...s, normalized_email: ev }));
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
    await fetchPage(0);
  };

  const clearFilters = () => {
    setF(initialFilters);
    setEmailInput("");
    setRowData([]);
    setViewRows([]);
    setHasApplied(false);
    setSelectedCount(0);
    setTotalHits(0);
    setPage(0);
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

  // refetch when pageSize changes
  useEffect(() => {
    if (!hasApplied) return;
    fetchPage(0);
    
  }, [pageSize]);

  const totalHitsDisplay = useMemo(() => {
    if (!totalHits) return "0";
    if (totalHits >= 10000) return `${Number(totalHits).toLocaleString()}+`;
    return Number(totalHits).toLocaleString();
  }, [totalHits]);

  /* ---------- Render ---------- */
  return (
    <div className="h-[calc(96vh-0px)] flex">
      {/* ✅ SAME FILTERS AS DASHBOARD */}
      <CommonFilters
        open={filtersOpen}
        setOpen={setFiltersOpen}
        f={f}
        setF={setF}
        onSearch={runSearch}
        onClear={clearFilters}
      />

      <main className="flex-1 px-2 pt-0 pb-6 -mt-3 flex flex-col">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">Search by Email</h1>
          </div>

          {/* Header Email Search (quick) */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch();
                }}
                placeholder="Enter email or partial (e.g. alice@, @gmail.com)"
                className="h-9 w-[320px] rounded-md border px-3 text-sm focus:ring-2 focus:ring-sky-200"
              />
              <button
                onClick={runSearch}
                className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1 text-sm bg-sky-600 text-white rounded hover:bg-sky-700"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Grid */}
        {!hasApplied ? (
          <div className="bg-white border rounded-xl shadow-sm p-6 h-[560px] flex flex-col items-center justify-center text-slate-600">
            Type an email above, or use filters on the left, then click <b>Search</b>.
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
              pagination={false}
              animateRows
              enableCellTextSelection
              suppressDragLeaveHidesColumns
              onSelectionChanged={onSelectionChanged}
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

        {/* Footer pagination (same as Dashboard style) */}
        {hasApplied && totalHits > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPageOptionsOpen((s) => !s);
                }}
                className="inline-flex items-center gap-2 px-3 py-1 border rounded-md bg-white text-sm text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                Showing <span className="font-semibold">{Math.min(totalHits, pageSize)}</span> rows of{" "}
                <span className="font-semibold">{totalHitsDisplay}</span>
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
                disabled={page <= 0}
                className="px-3 py-1 rounded-md border disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <div className="text-sm text-slate-600 px-2">
                Page <span className="font-medium">{page + 1}</span> of{" "}
                <span className="font-medium">{totalPages}</span>
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
