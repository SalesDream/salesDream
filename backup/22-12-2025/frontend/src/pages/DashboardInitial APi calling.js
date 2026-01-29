// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api";
import { AgGridReact } from "ag-grid-react";
import { useAuthToken } from "../useAuth";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Command
} from "lucide-react";

/* ====== Columns from backend (ID hidden) ====== */
const ALL_COLUMNS = [
  "state_code","normalized_phone","normalized_email","company_name","address","address2","city",
  "zip_code","zip4","zip9","county","latitude","longitude","sic_code","naics_1","naics_2","naics_3","naics_4",
  "industry","website","fax_number","toll_free_phone","num_employees","total_employees_corp_wide","sales_volume",
  "total_revenue_corp_wide","median_income_census_area","mean_housing_census_area","company_founded",
  "public_company","headquarters_branch","franchise_flag","individual_firm_code",
  "sic8_1","sic8_1_2","sic8_1_4","sic8_1_6","minority_owned","small_business","large_business","home_business",
  "credit_score","ad_size","female_owned_operated","city_population","residential_business_code",
  "company_linkedin_url","company_facebook_url","company_twitter_url",
  "company_location_name","company_location_locality","company_location_metro","company_location_region",
  "company_location_geo","company_location_street_address","company_location_address_line_2",
  "company_location_postal_code","company_location_country","company_location_continent",
  "business_record_type",
  "contact_full_name","contact_first_name","contact_middle_initial","contact_middle_name","contact_last_name",
  "contact_gender","job_title","sub_role","skills","birth_year","birth_date",
  "linkedin_url","linkedin_username","facebook_url","facebook_username","twitter_url","twitter_username",
  "github_url","github_username",
  "contact_location","contact_locality","contact_metro","contact_region","contact_location_country",
  "contact_location_continent","contact_street_address","contact_address_line_2",
  "contact_postal_code","contact_location_geo",
  "last_updated_person","job_start_date","job_summary","linkedin_connections","inferred_salary","years_experience",
  "contact_summary","contact_countries","contact_interests","title_code_1","title_code_2","title_full",
  "ethnic_code","ethnic_group","language_code","religion_code","phone_contact",
  "created_at","updated_at"
];

/* ====== Filter state ====== */
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
  job_start_to: ""
};

const toHeader = (s) => s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

/* ---------- Small chips ---------- */
const Chip = ({ children, onRemove }) => (
  <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full mr-1 mb-1">
    {children}
    <button onClick={onRemove} className="text-blue-500 hover:text-blue-700" aria-label="Remove">×</button>
  </span>
);

/* ---------- Controls ---------- */
const ToggleTri = ({ value, onChange }) => {
  const opts = [
    { key: "any", label: "Any" },
    { key: "Y",   label: "Yes" },
    { key: "N",   label: "No"  },
  ];
  return (
    <div className="inline-flex rounded-lg overflow-hidden border text-[11px]">
      {opts.map((o) => (
        <button key={o.key} onClick={() => onChange(o.key)}
          className={`px-2 py-1 ${value === o.key ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
};

const TogglePresence = ({ value, onChange }) => {
  const opts = [
    { key: "any",     label: "Any"     },
    { key: "has",     label: "Has"     },
    { key: "missing", label: "Missing" },
  ];
  return (
    <div className="inline-flex rounded-lg overflow-hidden border text-[11px]">
      {opts.map((o) => (
        <button key={o.key} onClick={() => onChange(o.key)}
          className={`px-2 py-1 ${value === o.key ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
};

const NumberRange = ({ label, min, max, onMin, onMax }) => (
  <label className="block text-[12px]">
    <span className="text-[11px] font-semibold text-gray-800">{label}</span>
    <div className="mt-1 flex items-center gap-2">
      <input value={min} onChange={(e)=>onMin(e.target.value)} className="border rounded px-2 py-1 h-7 w-28" placeholder="Min"/>
      <span className="text-gray-500">—</span>
      <input value={max} onChange={(e)=>onMax(e.target.value)} className="border rounded px-2 py-1 h-7 w-28" placeholder="Max"/>
    </div>
  </label>
);

const DateRange = ({ label, from, to, onFrom, onTo }) => (
  <label className="block text-[12px]">
    <span className="text-[11px] font-semibold text-gray-800">{label}</span>
    <div className="mt-1 flex items-center gap-2">
      <input type="date" value={from} onChange={(e)=>onFrom(e.target.value)} className="border rounded px-2 py-1 h-7"/>
      <span className="text-gray-500">→</span>
      <input type="date" value={to} onChange={(e)=>onTo(e.target.value)} className="border rounded px-2 py-1 h-7"/>
    </div>
  </label>
);

function MultiSelect({ label, options, values, onChange, searchable=true }) {
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
    if (values.includes(val)) onChange(values.filter((v)=>v!==val));
    else onChange([...values, val]);
  };
  return (
    <div className="text-[12px]">
      <span className="text-[11px] font-semibold text-gray-800">{label}</span>
      <div className="mt-1 relative">
        <button type="button" onClick={()=>setOpen(v=>!v)} className="w-full border rounded px-2 py-1 h-7 text-left">
          {values.length ? `${values.length} selected` : "Any"}
        </button>
        {open && (
          <div className="absolute z-[60] mt-1 w-full max-h-64 overflow-auto bg-white border rounded shadow-lg">
            {searchable && (
              <div className="p-2">
                <input value={q} onChange={(e)=>setQ(e.target.value)} className="w-full border rounded px-2 py-1 h-7" placeholder="Search options…"/>
              </div>
            )}
            <ul className="p-2 space-y-1">
              {filtered.length === 0 && <li className="text-[11px] text-gray-500 px-1">No options</li>}
              {filtered.map((opt) => (
                <li key={opt}>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={values.includes(opt)} onChange={()=>toggle(opt)} />
                    <span>{opt}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="border-t p-2 flex justify-between">
              <button className="text-[11px] text-gray-600 hover:text-gray-800" onClick={()=>onChange([])}>Clear</button>
              <button className="text-[11px] text-blue-600 hover:text-blue-800" onClick={()=>setOpen(false)}>Done</button>
            </div>
          </div>
        )}
      </div>
      <div className="mt-1">
        {values.map((v)=>(<Chip key={v} onRemove={()=>onChange(values.filter((x)=>x!==v))}>{v}</Chip>))}
      </div>
    </div>
  );
}

const TextInput = ({ label, value, onChange, placeholder="Any" }) => (
  <label className="block text-[12px]">
    <span className="text-[11px] font-semibold text-gray-800">{label}</span>
    <input value={value} onChange={(e)=>onChange(e.target.value)} className="mt-1 border rounded px-2 py-1 text-[12px] h-7 w-full" placeholder={placeholder}/>
  </label>
);

/* ====== Filters Rail (collapses to 0 width) ====== */
function FiltersRail({ open, setOpen, f, setF, facets, onApply, onClear }) {
  return (
    <div
      className={`relative z-20 shrink-0 overflow-visible transition-all duration-300 ${
        open ? "w-[300px]" : "w-0"
      }`}
    >
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="absolute -left-3 top-3 z-30 w-6 h-6 grid place-items-center rounded-full border bg-white shadow"
          title="Expand filters"
          aria-label="Expand filters"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {open && (
        <aside className="relative h-full bg-white border rounded-xl shadow-sm overflow-visible">
          <button
            onClick={() => setOpen(false)}
            className="absolute -right-3 top-3 z-30 w-6 h-6 grid place-items-center rounded-full border bg-white shadow"
            title="Collapse filters"
            aria-label="Collapse filters"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Body */}
          <div className="px-3 pb-3 overflow-y-auto overflow-x-hidden h-[calc(100%-0px)]">
            <div className="text-[11px] font-semibold text-gray-500 uppercase mb-2">
              Filter
            </div>

            {/* Filters (compact) */}
            <div className="space-y-3">
              <TextInput
                label="Name"
                value={f.company_name}
                onChange={(v) => setF((s) => ({ ...s, company_name: v }))}
              />
              <MultiSelect
                label="Location - State"
                options={facets.state_code}
                values={f.state_code}
                onChange={(v) => setF((s) => ({ ...s, state_code: v }))}
              />
              <TextInput
                label="City"
                value={f.city}
                onChange={(v) => setF((s) => ({ ...s, city: v }))}
              />
              <TextInput
                label="ZIP"
                value={f.zip_code}
                onChange={(v) => setF((s) => ({ ...s, zip_code: v }))}
              />
              <MultiSelect
                label="Country"
                options={facets.country}
                values={f.company_location_country}
                onChange={(v) =>
                  setF((s) => ({ ...s, company_location_country: v }))
                }
              />
              <MultiSelect
                label="Role & Department (Job Title)"
                options={facets.job_title}
                values={f.job_title}
                onChange={(v) => setF((s) => ({ ...s, job_title: v }))}
              />
              <MultiSelect
                label="Skills"
                options={(facets.skills || []).concat(f.skills_tokens)}
                values={f.skills_tokens}
                onChange={(v) => setF((s) => ({ ...s, skills_tokens: v }))}
              />
              <MultiSelect
                label="Industry"
                options={facets.industry}
                values={f.industry}
                onChange={(v) => setF((s) => ({ ...s, industry: v }))}
              />
              <NumberRange
                label="Employee Count"
                min={f.employees_min}
                max={f.employees_max}
                onMin={(v) => setF((s) => ({ ...s, employees_min: v }))}
                onMax={(v) => setF((s) => ({ ...s, employees_max: v }))}
              />
              <NumberRange
                label="Total Revenue (Corp)"
                min={f.revenue_min}
                max={f.revenue_max}
                onMin={(v) => setF((s) => ({ ...s, revenue_min: v }))}
                onMax={(v) => setF((s) => ({ ...s, revenue_max: v }))}
              />
              <DateRange
                label="Job Start Date"
                from={f.job_start_from}
                to={f.job_start_to}
                onFrom={(v) => setF((s) => ({ ...s, job_start_from: v }))}
                onTo={(v) => setF((s) => ({ ...s, job_start_to: v }))}
              />

              {/* --- 2 x 2 grid for toggles --- */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[11px] font-semibold text-gray-800 mb-1">
                    Public Company
                  </span>
                  <ToggleTri
                    value={f.public_company}
                    onChange={(v) => setF((s) => ({ ...s, public_company: v }))}
                  />
                </div>

                <div>
                  <span className="block text-[11px] font-semibold text-gray-800 mb-1">
                    Franchise
                  </span>
                  <ToggleTri
                    value={f.franchise_flag}
                    onChange={(v) => setF((s) => ({ ...s, franchise_flag: v }))}
                  />
                </div>

                <div>
                  <span className="block text-[11px] font-semibold text-gray-800 mb-1">
                    Company LinkedIn
                  </span>
                  <TogglePresence
                    value={f.has_company_linkedin}
                    onChange={(v) =>
                      setF((s) => ({ ...s, has_company_linkedin: v }))
                    }
                  />
                </div>

                <div>
                  <span className="block text-[11px] font-semibold text-gray-800 mb-1">
                    Contact LinkedIn
                  </span>
                  <TogglePresence
                    value={f.has_contact_linkedin}
                    onChange={(v) =>
                      setF((s) => ({ ...s, has_contact_linkedin: v }))
                    }
                  />
                </div>
              </div>
              {/* --- /toggles grid --- */}

              <MultiSelect
                label="Gender"
                options={facets.gender}
                values={f.contact_gender}
                onChange={(v) => setF((s) => ({ ...s, contact_gender: v }))}
              />
              <TextInput
                label="Contact Name"
                value={f.contact_full_name}
                onChange={(v) =>
                  setF((s) => ({ ...s, contact_full_name: v }))
                }
              />
            </div>

            {/* Actions */}
            <div className="mt-4">
              <button
                onClick={onApply}
                className="w-full h-9 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                Search
              </button>
              <div className="mt-2 flex items-center justify-between text-xs">
                <label className="text-gray-500">Saved Filters</label>
                <button
                  onClick={onClear}
                  className="text-gray-600 hover:text-gray-800"
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



/* ---------- Hero (initial) ---------- */
function Hero() {
  return (
    <div className="bg-white border rounded-xl shadow-sm p-6 h-[560px] flex flex-col items-center justify-center">
      <div className="flex items-center gap-2 text-blue-700 font-semibold">
        <Sparkles className="w-4 h-4" />
        <span>Accelerate Lead Discovery with AI Search</span>
        <span className="text-[10px] bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">Beta</span>
      </div>

      <div className="mt-4 w-full max-w-3xl">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            className="w-full h-11 pl-9 pr-24 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Find HR professionals working in startups under 200 employees."
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 border rounded-md px-2 py-1 text-xs text-gray-700"
            title="Command Palette"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-700" />
            <span className="inline-flex items-center gap-0.5 bg-gray-100 rounded px-1">
              <Command className="w-3 h-3" />
              <span>Ctrl+K</span>
            </span>
          </button>
        </div>
      </div>

      <div className="mt-6 text-center text-gray-600">
        <div className="text-sm">
          Use the filters on the left to find people and companies that match your criteria. When you’re ready, click{" "}
          <span className="font-semibold">Search</span>.
        </div>
      </div>
    </div>
  );
}

/* ---------- Spinner ---------- */
function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3" role="status" aria-live="polite" aria-busy="true">
      <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a 8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"/>
      </svg>
      <span className="text-xs text-gray-600">{label}</span>
    </div>
  );
}

/* ---------- Main component ---------- */
export default function Dashboard() {
  const gridRef = useRef(null);
  const [rowData, setRowData]   = useState([]);
  const [viewRows, setViewRows] = useState([]);
  const [loading, setLoading]   = useState(true);

  // Auth
  const token = useAuthToken();
  if (!token) return <Navigate to="/login" replace />;

  // Filters rail open by default; persist in localStorage
  const [filtersOpen, setFiltersOpen] = useState(() => {
    const v = localStorage.getItem("leadFiltersCollapsed");
    return v === "0" || v === null; // default open
  });
  useEffect(() => {
    localStorage.setItem("leadFiltersCollapsed", filtersOpen ? "0" : "1");
  }, [filtersOpen]);

  const [f, setF] = useState(initialFilters);
  const [hasApplied, setHasApplied] = useState(false); // show hero until Apply

  // Facets
  const facets = useMemo(() => {
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean))).sort((a,b)=>String(a).localeCompare(String(b)));
    return {
      state_code: uniq(rowData.map(r=>r.state_code)),
      country: uniq(rowData.map(r=>r.company_location_country)),
      industry: uniq(rowData.map(r=>r.industry)),
      job_title: uniq(rowData.map(r=>r.job_title)),
      gender: uniq(rowData.map(r=>r.contact_gender)),
      skills: uniq(
        rowData.flatMap(r => (r.skills ? String(r.skills).split(/[,\|]/).map(s=>s.trim()) : []))
      )
    };
  }, [rowData]);

  // Columns
  const columnDefs = useMemo(() => {
    return ALL_COLUMNS.map((key) => {
      const base = { field: key, headerName: toHeader(key), minWidth: 120 };
      if (/_geo$/.test(key) || /_url$/.test(key)) return { ...base, minWidth: 180 };
      if (/(summary|interests|skills)/.test(key)) return { ...base, minWidth: 220 };
      return base;
    });
  }, []);
  const defaultColDef = useMemo(() => ({ sortable:true, filter:true, resizable:true, suppressHeaderMenuButton:true }), []);

  // Load
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get("/api/data/leads?limit=1000");
        const data = res.data || [];
        setRowData(data);
        setViewRows(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const applyFilters = () => {
    setViewRows(filterRows(rowData, f));
    setHasApplied(true);
  };
  const clearFilters = () => {
    setF(initialFilters);
    setViewRows(rowData);
    setHasApplied(false);
  };

  // Active chips
  const activeChips = useMemo(() => {
    const chips = [];
    const push = (label, onRemove) => chips.push({label, onRemove});
    if (f.state_code.length) f.state_code.forEach(v => push(`State: ${v}`, ()=>setF(s=>({...s, state_code: s.state_code.filter(x=>x!==v)}))));
    if (f.company_location_country.length) f.company_location_country.forEach(v => push(`Country: ${v}`, ()=>setF(s=>({...s, company_location_country: s.company_location_country.filter(x=>x!==v)}))));
    if (f.industry.length) f.industry.forEach(v => push(`Industry: ${v}`, ()=>setF(s=>({...s, industry: s.industry.filter(x=>x!==v)}))));
    if (f.job_title.length) f.job_title.forEach(v => push(`Title: ${v}`, ()=>setF(s=>({...s, job_title: s.job_title.filter(x=>x!==v)}))));
    if (f.contact_gender.length) f.contact_gender.forEach(v => push(`Gender: ${v}`, ()=>setF(s=>({...s, contact_gender: s.contact_gender.filter(x=>x!==v)}))));
    if (f.company_name) push(`Company ~ ${f.company_name}`, ()=>setF(s=>({...s, company_name: ""})));
    if (f.city) push(`City ~ ${f.city}`, ()=>setF(s=>({...s, city: ""})));
    if (f.zip_code) push(`ZIP ~ ${f.zip_code}`, ()=>setF(s=>({...s, zip_code: ""})));
    if (f.website) push(`Website ~ ${f.website}`, ()=>setF(s=>({...s, website: ""})));
    if (f.contact_full_name) push(`Contact ~ ${f.contact_full_name}`, ()=>setF(s=>({...s, contact_full_name: ""})));
    if (f.skills_tokens.length) f.skills_tokens.forEach(v => push(`Skill: ${v}`, ()=>setF(s=>({...s, skills_tokens: s.skills_tokens.filter(x=>x!==v)}))));
    if (f.public_company !== "any") push(`Public: ${f.public_company==="Y"?"Yes":"No"}`, ()=>setF(s=>({...s, public_company:"any"})));
    if (f.franchise_flag !== "any") push(`Franchise: ${f.franchise_flag==="Y"?"Yes":"No"}`, ()=>setF(s=>({...s, franchise_flag:"any"})));
    if (f.has_company_linkedin !== "any") push(`Company LinkedIn: ${f.has_company_linkedin}`, ()=>setF(s=>({...s, has_company_linkedin:"any"})));
    if (f.has_contact_linkedin !== "any") push(`Contact LinkedIn: ${f.has_contact_linkedin}`, ()=>setF(s=>({...s, has_contact_linkedin:"any"})));
    if (f.employees_min || f.employees_max) push(`Employees ${f.employees_min||"…"}–${f.employees_max||"…"}`, ()=>setF(s=>({...s, employees_min:"", employees_max:""})));
    if (f.revenue_min || f.revenue_max) push(`Revenue ${f.revenue_min||"…"}–${f.revenue_max||"…"}`, ()=>setF(s=>({...s, revenue_min:"", revenue_max:""})));
    if (f.job_start_from || f.job_start_to) push(`Job Start ${f.job_start_from||"…"}→${f.job_start_to||"…"}`, ()=>setF(s=>({...s, job_start_from:"", job_start_to:""})));
    return chips;
  }, [f]);

  return (
    <div className="h-[calc(100vh-0px)] flex">
      {/* Filters rail */}
      <FiltersRail
        open={filtersOpen}
        setOpen={setFiltersOpen}
        f={f}
        setF={setF}
        facets={facets}
        onApply={applyFilters}
        onClear={clearFilters}
      />

      {/* Content */}
      <main className="flex-1 p-3">
        <div className="mb-2">
          <h1 className="text-xl font-semibold">Dashboard</h1>
        </div>

        {/* Hero before search; grid after */}
        {!hasApplied ? (
          <div className="relative">
            <Hero />
            {loading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-xl border">
                <Spinner label="Loading data…" />
              </div>
            )}
          </div>
        ) : (
          <div
            className="relative ag-theme-quartz bg-white border rounded-xl shadow-sm"
            style={{
              height: 560,
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
              pagination
              paginationPageSize={25}
              animateRows
              enableCellTextSelection
              suppressDragLeaveHidesColumns
            />
            {loading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
                <Spinner label="Loading data…" />
              </div>
            )}
          </div>
        )}

        {/* Active filter chips */}
        {hasApplied && activeChips.length > 0 && (
          <div className="bg-white border rounded-xl shadow-sm p-2 mt-3">
            <div className="flex flex-wrap">
              {activeChips.map((c, i) => (<Chip key={i} onRemove={c.onRemove}>{c.label}</Chip>))}
            </div>
          </div>
        )}

        {!loading && hasApplied && viewRows.length === 0 && (
          <div className="mt-2 text-xs text-gray-500">No data found.</div>
        )}
      </main>
    </div>
  );
}

/* ====== Filtering logic ====== */
function filterRows(rows, f) {
  const norm = (v) => String(v ?? "").toLowerCase();

  return rows.filter((r) => {
    if (f.state_code.length && !f.state_code.includes(r.state_code)) return false;
    if (f.company_location_country.length && !f.company_location_country.includes(r.company_location_country)) return false;
    if (f.industry.length && !f.industry.includes(r.industry)) return false;
    if (f.job_title.length && !f.job_title.includes(r.job_title)) return false;
    if (f.contact_gender.length && !f.contact_gender.includes(r.contact_gender)) return false;

    if (f.company_name && !norm(r.company_name).includes(norm(f.company_name))) return false;
    if (f.city && !norm(r.city).includes(norm(f.city))) return false;
    if (f.zip_code && !norm(r.zip_code).includes(norm(f.zip_code))) return false;
    if (f.website && !norm(r.website).includes(norm(f.website))) return false;
    if (f.contact_full_name && !norm(r.contact_full_name).includes(norm(f.contact_full_name))) return false;

    if (f.skills_tokens.length) {
      const hay = norm(r.skills);
      for (const t of f.skills_tokens) if (!hay.includes(norm(t))) return false;
    }

    if (f.public_company !== "any") {
      if (String(r.public_company || "").toUpperCase() !== f.public_company) return false;
    }
    if (f.franchise_flag !== "any") {
      if (String(r.franchise_flag || "").toUpperCase() !== f.franchise_flag) return false;
    }

    if (f.has_company_linkedin === "has" && !r.company_linkedin_url) return false;
    if (f.has_company_linkedin === "missing" && r.company_linkedin_url) return false;
    if (f.has_contact_linkedin === "has" && !r.linkedin_url) return false;
    if (f.has_contact_linkedin === "missing" && r.linkedin_url) return false;

    const emp = Number(r.num_employees ?? 0);
    const rev = Number(r.total_revenue_corp_wide ?? 0);
    const minE = Number(f.employees_min);
    const maxE = Number(f.employees_max);
    const minR = Number(f.revenue_min);
    const maxR = Number(f.revenue_max);
    if (!Number.isNaN(minE) && f.employees_min !== "" && emp < minE) return false;
    if (!Number.isNaN(maxE) && f.employees_max !== "" && emp > maxE) return false;
    if (!Number.isNaN(minR) && f.revenue_min !== "" && rev < minR) return false;
    if (!Number.isNaN(maxR) && f.revenue_max !== "" && rev > maxR) return false;

    if (f.job_start_from || f.job_start_to) {
      const d = r.job_start_date ? new Date(r.job_start_date) : null;
      if (!d) return false;
      if (f.job_start_from && d < new Date(f.job_start_from)) return false;
      if (f.job_start_to && d > new Date(f.job_start_to)) return false;
    }
    return true;
  });
}
