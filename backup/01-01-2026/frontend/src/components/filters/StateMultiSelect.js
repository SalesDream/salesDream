// src/components/filters/StateMultiSelect.jsx
import React, { useMemo, useState, useRef, useEffect } from "react";
import { Check } from "lucide-react";
import { US_STATES } from "./usStates";

/* ---------- styles (same as initial UI) ---------- */
const labelCls =
  "block text-[10px] font-semibold text-slate-600 tracking-wide";
const inputCls =
  "mt-1 h-7 w-full rounded-md border border-slate-300 px-2 text-[11px] flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-sky-200";

/* =====================================================
   STATE MULTI SELECT (Checkbox + Search)
   ===================================================== */
export default function StateMultiSelect({ value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  /* close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredStates = useMemo(() => {
    return US_STATES.filter((s) =>
      s.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  const toggle = (state) => {
    if (value.includes(state)) {
      onChange(value.filter((v) => v !== state));
    } else {
      onChange([...value, state]);
    }
  };

  const displayValue =
    value.length === 0 ? "Any" : value.join(", ");

  return (
    <div className="relative" ref={ref}>
      <span className={labelCls}>State</span>

      {/* Input */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={inputCls}
      >
        <span
          className={`truncate ${
            value.length === 0 ? "text-slate-400" : "text-slate-700"
          }`}
        >
          {displayValue}
        </span>
        <span className="text-slate-400">▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg">
          {/* Search box */}
          <div className="p-2 border-b">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search options..."
              className="w-full h-7 px-2 text-[11px] border rounded focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-auto py-1">
            {filteredStates.map((s) => {
              const checked = value.includes(s);
              return (
                <label
                  key={s}
                  className="flex items-center gap-2 px-3 py-1 text-[11px] cursor-pointer hover:bg-slate-50"
                >
                  <span
                    onClick={() => toggle(s)}
                    className={`w-4 h-4 border rounded grid place-items-center ${
                      checked
                        ? "bg-sky-600 border-sky-600"
                        : "border-slate-300"
                    }`}
                  >
                    {checked && <Check className="w-3 h-3 text-white" />}
                  </span>
                  <span onClick={() => toggle(s)}>{s}</span>
                </label>
              );
            })}

            {filteredStates.length === 0 && (
              <div className="px-3 py-2 text-[11px] text-slate-400">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
