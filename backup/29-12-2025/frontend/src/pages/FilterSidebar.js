import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Filter as FilterIcon,
  Search as SearchIcon,
  User,
  MapPin,
  Briefcase,
  Tags,
  Building2,
  Plus,
  Minus,
} from "lucide-react";

/* ---------- Constants & Styling ---------- */
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC"
];

const labelCls = "block text-[10px] font-semibold text-slate-600 tracking-wide";
const inputCls =
  "mt-1 h-7 w-full rounded-md border border-slate-300 px-2 text-[11px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400";

/* ---------- UI Sub-components ---------- */
const Chip = ({ children, onRemove }) => (
  <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full mr-1 mb-1">
    {children}
    <button onClick={onRemove} className="text-blue-500 hover:text-blue-700" aria-label="Remove">×</button>
  </span>
);

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

function MultiSelect({ label, options = [], values = [], onChange, searchable = true }) {
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
    const next = existing.includes(val) ? existing.filter((v) => v !== val) : [...existing, val];
    onChange(Array.from(new Set(next)));
  };

  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="mt-1 relative">
        <button type="button" onClick={() => setOpen((v) => !v)} className={inputCls + " text-left"}>
          {curValues.length ? `${curValues.length} selected` : "Any"}
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
                    <input className="accent-sky-600" type="checkbox" checked={curValues.includes(opt)} onChange={() => toggle(opt)} />
                    <span>{opt}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="border-t p-2 flex justify-between">
              <button className="text-[10px] text-slate-600 hover:text-slate-900" onClick={() => onChange([])}>Clear</button>
              <button className="text-[10px] text-sky-600 hover:text-sky-800" onClick={() => setOpen(false)}>Done</button>
            </div>
          </div>
        )}
      </div>
      {curValues.length > 0 && (
        <div className="mt-1">
          {curValues.map((v) => (
            <Chip key={v} onRemove={() => onChange(curValues.filter((x) => x !== v))}>{v}</Chip>
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

/* ---------- Main Component Export ---------- */
export default function FilterSidebar({ open, setOpen, f, setF, facets, onSearch, onClear }) {
  return (
    <div className={`relative z-20 shrink-0 overflow-visible transition-all duration-200 ${open ? "w-[200px]" : "w-0"}`}>
      {!open && (
        <button onClick={() => setOpen(true)} className="absolute -left-3 top-[5px] z-30 w-6 h-6 grid place-items-center rounded-full border bg-white shadow">
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {open && (
        <aside className="relative h-full bg-white border rounded-xl shadow-md overflow-visible">
          <button onClick={() => setOpen(false)} className="absolute -right-3 top-[5px] z-30 w-6 h-6 grid place-items-center rounded-full border bg-white shadow">
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="h-10 px-3 border-b flex items-center gap-2 text-[12px] font-semibold text-slate-700">
            <FilterIcon className="w-4 h-4 text-slate-600" /> Filter
          </div>

          <div className="px-3 pb-3 pt-3 overflow-y-auto overflow-x-hidden h-[calc(100%-40px)] space-y-2">
            <FilterSection icon={User} label="Contact">
              <TextInput label="Contact Name" value={f.contact_full_name} onChange={(v) => setF((s) => ({ ...s, contact_full_name: v }))} />
            </FilterSection>

            <FilterSection icon={MapPin} label="Location">
              <MultiSelect label="State" options={US_STATES} values={f.state_code || []} onChange={(v) => setF((s) => ({ ...s, state_code: v }))} />
              <MultiSelect label="City" options={facets.city || []} values={f.city || []} onChange={(v) => setF((s) => ({ ...s, city: v }))} />
              <TextInput label="ZIP Code" value={f.zip_code || ""} onChange={(v) => setF((s) => ({ ...s, zip_code: v }))} />
            </FilterSection>

            <FilterSection icon={Briefcase} label="Role & Department">
              <MultiSelect label="Job Title" options={facets.job_title || []} values={f.job_title || []} onChange={(v) => setF((s) => ({ ...s, job_title: v }))} />
            </FilterSection>

            <FilterSection icon={Tags} label="Skills">
              <MultiSelect label="Skills" options={facets.skills || []} values={f.skills_tokens || []} onChange={(v) => setF((s) => ({ ...s, skills_tokens: v }))} />
            </FilterSection>

            <FilterSection icon={Building2} label="Company / Domain">
              <MultiSelect label="Company Name" options={facets.company || []} values={f.company_name || []} onChange={(v) => setF((s) => ({ ...s, company_name: v }))} />
              <MultiSelect label="Website / Domain" options={facets.website || []} values={f.website || []} onChange={(v) => setF((s) => ({ ...s, website: v }))} />
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={labelCls}>Public Company</span>
                  <ToggleTri value={f.public_company} onChange={(v) => setF((s) => ({ ...s, public_company: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <span className={labelCls}>Franchise</span>
                  <ToggleTri value={f.franchise_flag} onChange={(v) => setF((s) => ({ ...s, franchise_flag: v }))} />
                </div>
              </div>
            </FilterSection>

            <FilterSection icon={Briefcase} label="Industry">
              <MultiSelect label="Industry" options={facets.industry || []} values={f.industry || []} onChange={(v) => setF((s) => ({ ...s, industry: v }))} />
            </FilterSection>

            <div className="pt-1">
              <button onClick={onSearch} className="w-full h-8 rounded-md bg-sky-600 text-white text-[12px] shadow hover:bg-sky-700 flex items-center justify-center gap-2">
                <SearchIcon className="w-4 h-4" /> Search
              </button>
              <button onClick={onClear} className="mt-2 text-[11px] text-slate-700 hover:text-slate-900 w-full text-center">Clear</button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}