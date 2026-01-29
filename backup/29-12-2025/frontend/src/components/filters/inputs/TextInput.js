// src/components/filters/inputs/TextInput.jsx
import { labelCls, inputCls } from "../constants";

export default function TextInput({ label, value, onChange, placeholder = "Any" }) {
  return (
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
}
