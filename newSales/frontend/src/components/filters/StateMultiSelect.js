// src/components/filters/StateMultiSelect.jsx
import React, { useMemo, useState, useRef, useEffect } from "react";
import { Check } from "lucide-react";
import { US_STATES } from "./usStates";

/* ---------- styles (theme-aware) ---------- */
const labelCls =
  "block text-[10px] font-semibold text-[color:var(--text-muted)] tracking-wide";
const inputCls =
  "mt-1 h-9 w-full rounded-md border border-[color:var(--border-color)] px-3 text-[11px] flex items-center justify-between bg-[color:var(--surface)] text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]";

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

  const displayValue = value.length === 0 ? "Any" : value.join(", ");

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
            value.length === 0
              ? "text-[color:var(--text-muted)]"
              : "text-[color:var(--text-primary)]"
          }`}
        >
          {displayValue}
        </span>
        <span className="text-[color:var(--text-muted)]">v</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-[color:var(--surface)] border border-[color:var(--border-color)] rounded-md shadow-lg text-[color:var(--text-primary)]">
          {/* Search box */}
          <div className="p-2 border-b border-[color:var(--border-color)] bg-[color:var(--surface-muted)]">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search options..."
              className="w-full h-8 px-2 text-[11px] rounded border border-[color:var(--border-color)] bg-[color:var(--surface)] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
            />
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-auto py-1">
            {filteredStates.map((s) => {
              const checked = value.includes(s);
              return (
                <label
                  key={s}
                  className="flex items-center gap-2 px-3 py-1 text-[11px] cursor-pointer hover:bg-[color:var(--surface-muted)]"
                >
                  <span
                    onClick={() => toggle(s)}
                    className={`w-4 h-4 border rounded grid place-items-center ${
                      checked
                        ? "bg-[color:var(--accent)] border-[color:var(--accent)] text-white"
                        : "border-[color:var(--border-color)] text-[color:var(--text-primary)]"
                    }`}
                  >
                    {checked && <Check className="w-3 h-3 text-white" />}
                  </span>
                  <span onClick={() => toggle(s)}>{s}</span>
                </label>
              );
            })}

            {filteredStates.length === 0 && (
              <div className="px-3 py-2 text-[11px] text-[color:var(--text-muted)]">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
