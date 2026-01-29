// src/components/AppLogo.jsx
import React from "react";
import logo from "../assets/Logo.png";

export default function AppLogo({
  size = 60, // make default bigger
  showText = true,
  text = "SalesDream",
  subtitle = "Dashboard",
  className = "",
}) {
  const imgStyle = {
    height: `${size}px`,
    width: "auto",
    objectFit: "contain",
    display: "block",
  };

  return (
    <div
      className={`flex items-center gap-4 select-none ${className}`}
      aria-label={text}
      role="img"
    >
      {/* Logo image */}
      <div className="flex items-center justify-center h-full">
        <img
          src={logo}
          alt={text}
          draggable={false}
          style={imgStyle}
          className="drop-shadow-sm"
        />
      </div>

      {/* Text (Wordmark) */}
      {showText && (
        <div className="flex flex-col leading-tight justify-center">
          <div className="text-2xl font-semibold text-sky-700 tracking-tight">
            {text}
          </div>
          {subtitle && (
            <div className="text-sm text-gray-400 -mt-0.5">{subtitle}</div>
          )}
        </div>
      )}
    </div>
  );
}
