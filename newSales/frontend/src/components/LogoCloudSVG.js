// src/components/LogoCloudSVG.jsx
import React from "react";

export default function LogoCloudSVG({ className = "", title = "SalesDream" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 520 300"     // tight viewBox around the cloud
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }} // remove inline whitespace in some containers
    >
      <defs>
        <linearGradient id="g1" x1="0%" x2="100%" y1="10%" y2="90%">
          <stop offset="0%" stopColor="#8be6ff" />
          <stop offset="50%" stopColor="#4fd6ff" />
          <stop offset="100%" stopColor="#06a8ff" />
        </linearGradient>

        <filter id="drop" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* Cloud shape (no extra background rectangle) */}
      <g filter="url(#drop)">
        <path
          d="M55 190
             C20 190, 20 140, 70 128
             C95 75, 170 50, 240 90
             C320 30, 420 70, 420 120
             C470 120, 500 160, 470 190
             Z"
          fill="url(#g1)"
        />
        {/* front wave to match layered cloud look */}
        <path
          d="M70 190
             C95 170, 140 170, 180 190
             C220 210, 320 210, 420 190
             L420 220 C380 240, 120 240, 70 220 Z"
          fill="url(#g1)"
          opacity="0.98"
        />
      </g>

      {/* Text - white, rounded friendly font. Use system fallback */}
      <text
        x="50%"
        y="62%"
        textAnchor="middle"
        alignmentBaseline="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
        fontSize="56"
        fill="#ffffff"
        style={{ letterSpacing: "-1px" }}
      >
        salesdream
      </text>
    </svg>
  );
}
