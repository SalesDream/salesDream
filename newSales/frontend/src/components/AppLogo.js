// src/components/AppLogo.jsx
import React from "react";
import logo from "../assets/Logo.png";

/**
 * AppLogo
 * Props:
 *  - size: number (pixel height for the image; width auto) — default 40
 *  - showText: boolean — show the wordmark text next to the image (default true)
 *  - text: string — wordmark text (default "SalesDream")
 *  - subtitle: string|null — small subtitle under the wordmark (optional)
 *  - className: string — extra wrapper classes
 *
 * Use showText={false} when your logo image already contains the wordmark
 * (so you don't duplicate the name).
 */
export default function AppLogo({
  size = 40,
  showText = true,
  text = "SalesDream",
  subtitle = null,
  className = "",
}) {
  const imgStyle = {
    height: size,
    width: "auto",
    maxHeight: size,
    display: "block",
    objectFit: "contain",
  };

  return (
    <div
      className={`flex items-center gap-3 select-none ${className}`}
      aria-label={text}
      role="img"
    >
      <img
        src={logo}
        alt={text}
        draggable={false}
        style={imgStyle}
        className="block"
      />

      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="text-sm md:text-lg font-semibold text-slate-800">
            {text}
          </div>
          {subtitle && (
            <div className="text-xs text-gray-400 -mt-0.5">{subtitle}</div>
          )}
        </div>
      )}
    </div>
  );
}
