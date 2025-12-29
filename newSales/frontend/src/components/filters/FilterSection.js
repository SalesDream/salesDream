// src/components/filters/FilterSection.jsx
import { Plus, Minus } from "lucide-react";
import { useState } from "react";

export default function FilterSection({ icon: Icon, label, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-md">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-10 px-3 flex items-center justify-between"
      >
        <span className="inline-flex items-center gap-2 text-[12px] font-medium text-slate-700">
          <Icon className="w-4 h-4 text-slate-500" />
          {label}
        </span>
        {open ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
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
