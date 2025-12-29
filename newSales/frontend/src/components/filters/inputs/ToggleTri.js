// src/components/filters/inputs/ToggleTri.jsx
export default function ToggleTri({ value, onChange }) {
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
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
