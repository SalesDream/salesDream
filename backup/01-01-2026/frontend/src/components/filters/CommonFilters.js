// src/components/filters/CommonFilters.jsx
import React, { useState } from "react";
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

import StateMultiSelect from "./StateMultiSelect";

/* ---------- shared styles ---------- */
const labelCls =
  "block text-[10px] font-semibold text-slate-600 tracking-wide";
const inputCls =
  "mt-1 h-7 w-full rounded-md border border-slate-300 px-2 text-[11px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200";

/* ---------- text input ---------- */
const TextInput = ({ label, value, onChange, placeholder = "Any" }) => (
  <label className="block">
    <span className={labelCls}>{label}</span>
    <input
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
      placeholder={placeholder}
    />
  </label>
);

/* ---------- accordion section ---------- */
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

/* =====================================================
   COMMON FILTERS (INITIAL UI RESTORED)
   ===================================================== */
export default function CommonFilters({
  open,
  setOpen,
  f,
  setF,
  onSearch,
  onClear,
}) {
  return (
    <div
      className={`relative z-20 shrink-0 transition-all duration-200 ${
        open ? "w-[200px]" : "w-0"
      }`}
    >
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="absolute -left-3 top-[5px] z-30 w-6 h-6 grid place-items-center rounded-full border bg-white shadow"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {open && (
        <aside className="relative h-full bg-white border rounded-xl shadow-md">
          <button
            onClick={() => setOpen(false)}
            className="absolute -right-3 top-[5px] z-30 w-6 h-6 grid place-items-center rounded-full border bg-white shadow"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="h-10 px-3 border-b flex items-center gap-2 text-[12px] font-semibold text-slate-700">
            <FilterIcon className="w-4 h-4 text-slate-600" />
            Filter
          </div>

          {/* Body */}
          <div className="px-3 py-3 space-y-2 overflow-y-auto h-[calc(100%-40px)]">

            {/* CONTACT */}
            <FilterSection icon={User} label="Contact">
              <TextInput
                label="Contact Name"
                value={f.contact_full_name}
                onChange={(v) =>
                  setF((s) => ({ ...s, contact_full_name: v }))
                }
              />
            </FilterSection>

            {/* LOCATION */}
            <FilterSection icon={MapPin} label="Location">
              <StateMultiSelect
                value={f.state_code}
                onChange={(v) =>
                  setF((s) => ({ ...s, state_code: v }))
                }
              />

              <TextInput
                label="City"
                value={f.city?.[0] || ""}
                onChange={(v) =>
                  setF((s) => ({ ...s, city: v ? [v] : [] }))
                }
              />

              <TextInput
                label="ZIP Code"
                value={f.zip_code}
                onChange={(v) =>
                  setF((s) => ({ ...s, zip_code: v }))
                }
              />
            </FilterSection>

            {/* ROLE */}
            <FilterSection icon={Briefcase} label="Role">
              <TextInput
                label="Job Title"
                value={f.job_title?.[0] || ""}
                onChange={(v) =>
                  setF((s) => ({ ...s, job_title: v ? [v] : [] }))
                }
              />
            </FilterSection>

            {/* SKILLS */}
            <FilterSection icon={Tags} label="Skills">
              <TextInput
                label="Skills (comma separated)"
                value={(f.skills_tokens || []).join(", ")}
                onChange={(v) =>
                  setF((s) => ({
                    ...s,
                    skills_tokens: v
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </FilterSection>

            {/* COMPANY */}
            <FilterSection icon={Building2} label="Company">
              <TextInput
                label="Company Name"
                value={f.company_name?.[0] || ""}
                onChange={(v) =>
                  setF((s) => ({ ...s, company_name: v ? [v] : [] }))
                }
              />

              <TextInput
                label="Website / Domain"
                value={f.website?.[0] || ""}
                onChange={(v) =>
                  setF((s) => ({ ...s, website: v ? [v] : [] }))
                }
              />
            </FilterSection>

            {/* ACTIONS */}
            <div className="pt-2">
              <button
                onClick={onSearch}
                className="w-full h-8 rounded-md bg-sky-600 text-white text-[12px] shadow-sm hover:bg-sky-700 inline-flex items-center justify-center gap-2"
              >
                <SearchIcon className="w-4 h-4" />
                Search
              </button>

              <div className="mt-2 text-center">
                <button
                  onClick={onClear}
                  className="text-[11px] text-slate-600 hover:text-slate-900"
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
