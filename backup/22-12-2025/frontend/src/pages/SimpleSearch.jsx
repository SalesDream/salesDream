// src/pages/SimpleSearch.jsx
import React, { useMemo, useCallback, useRef, useState } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { AgGridReact } from "ag-grid-react";
import { useAuthToken } from "../useAuth";
import {
  MapPin as MapPinIcon,
  Linkedin,
  Facebook,
  Twitter,
  Phone,
  Mail,
  Globe2,
} from "lucide-react";

/*
 A lightweight page that shows:
 - page header (title + rows selector),
 - one input above the table whose placeholder depends on the sidebar route,
 - an empty AG Grid with same base columns as Dashboard (no filters).
*/

const DUMMY_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="%23E5E7EB"/><circle cx="64" cy="48" r="24" fill="%23CBD5E1"/><path d="M16 112c8-24 32-32 48-32s40 8 48 32" fill="%23CBD5E1"/></svg>';

const maskEmail = (v) => {
  if (!v) return "••••••••";
  const [u, d] = String(v).split("@");
  if (!d) return "••••••••";
  return `${u.slice(0, 1)}••••@${d}`;
};
const maskPhone = (v) => {
  if (!v) return "••••••••";
  const s = String(v).replace(/\D/g, "");
  return s.length >= 3 ? `${s.slice(0, 3)}•••••••` : "••••••••";
};
const normalizeUrl = (v) => {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s === "-") return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

const LinkCell = (p) => {
  const v = p.value ?? p.data?.[p.colDef.field];
  if (!v) return <span>-</span>;
  const href = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  const label = String(v).replace(/^https?:\/\//i, "");
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-sky-700 hover:underline truncate"
    >
      {label}
    </a>
  );
};

const DateCell = (p) => {
  const v = p.value ?? p.data?.[p.colDef.field];
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toLocaleDateString();
};

export default function SimpleSearch() {
  const token = useAuthToken();
  if (!token) return <Navigate to="/login" replace />;

  const location = useLocation();
  const pathname = location.pathname || "/dashboard";

  // mapping from path -> title + placeholder
  const mapping = {
    "/dashboard": {
      title: "Lead Finder",
      placeholder: "Search leads (company, person, domain) — try 'HR startups 50-200'",
    },
    "/search-phone": {
      title: "Search Phone",
      placeholder: "Enter phone number (e.g. +1 415 555 0123 or 4155550123)",
    },
    "/search-area-code": {
      title: "Search Phone Area Code",
      placeholder: "Enter area code (e.g. 415)",
    },
    "/search-email": {
      title: "Search Email",
      placeholder: "Enter email address or partial (e.g. alice@, sales@, @gmail.com)",
    },
    "/search-domain": {
      title: "Search Domain",
      placeholder: "Enter domain or website (e.g. example.com)",
    },
    "/search-name": {
      title: "Search Name",
      placeholder: "Enter full or partial name (e.g. 'John Smith' or 'John')",
    },
  };

  const info = mapping[pathname] || { title: "Search", placeholder: "Search…" };

  const [query, setQuery] = useState("");

  // minimal column defs — matches Dashboard base columns visually
  const peopleCellRenderer = useCallback((params) => {
    const r = params.data || {};
    const name = (r.contact_name || r.name || "").trim();
    const title = (r.job_title || "").trim();
    const company = (r.company || r.domain || "").trim();
    const hasSub = !!(title || company);
    const loc = [r.city, r.state].filter(Boolean).join(", ");

    const lk = normalizeUrl(r.linkedin_url);
    const fb = normalizeUrl(r.facebook || r.facebook_url);
    const tw = normalizeUrl(r.twitter || r.twitter_url);

    const socials = [
      lk && { Icon: Linkedin, href: lk, title: "LinkedIn" },
      fb && { Icon: Facebook, href: fb, title: "Facebook" },
      tw && { Icon: Twitter, href: tw, title: "Twitter" },
    ].filter(Boolean);

    return (
      <div className="flex items-center gap-2 py-1 min-w-0 leading-4">
        <img
          src={DUMMY_AVATAR}
          alt=""
          className="w-8 h-8 rounded-full border bg-slate-100 object-cover shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="font-semibold text-[13px] text-slate-900 truncate" title={name || "—"}>
              {name || "—"}
            </div>
            {socials.length > 0 && (
              <div className="inline-flex items-center gap-1 text-slate-500">
                {socials.map(({ Icon, href, title }, i) => (
                  <a key={i} href={href} target="_blank" rel="noreferrer" title={title} className="hover:text-slate-700">
                    <Icon className="w-3 h-3" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {hasSub && (
            <div className="text-[11.5px] text-slate-600 truncate" title={`${title}${title && company ? " · " : ""}${company}`}>
              {title}
              {title && company ? " · " : ""}
              {company}
            </div>
          )}

          {loc && (
            <div className="flex items-center gap-1 text-[11.5px] text-slate-500 truncate" title={loc}>
              <MapPinIcon className="w-3 h-3" />
              <span className="truncate">{loc}</span>
            </div>
          )}
        </div>
      </div>
    );
  }, []);

  const contactCellRenderer = useCallback((params) => {
    const r = params.data || {};
    return (
      <div className="flex flex-col gap-0.5 py-1 leading-4">
        <div className="flex items-center gap-1 text-[12px] text-slate-700">
          <Phone className="w-3 h-3 text-slate-500" />
          <span>{maskPhone(r.phone)}</span>
        </div>
        <div className="flex items-center gap-1 text-[12px] text-slate-700">
          <Mail className="w-3 h-3 text-slate-500" />
          <span>{maskEmail(r.email)}</span>
        </div>
      </div>
    );
  }, []);

  const baseColumns = useMemo(() => [
    {
      headerName: "",
      field: "__sel__",
      checkboxSelection: true,
      headerCheckboxSelection: true,
      maxWidth: 44,
      suppressMenu: true,
      pinned: "left",
      resizable: false,
    },
    {
      headerName: "People",
      field: "contact_name",
      flex: 2,
      minWidth: 360,
      cellRenderer: peopleCellRenderer,
      sortable: true,
    },
    {
      headerName: "Company / Domain",
      field: "company",
      flex: 1.4,
      minWidth: 240,
      cellRenderer: (p) => {
        const r = p.data || {};
        const company = r.company || "-";
        const website = r.website || r.domain || "";
        const loc = [r.city, r.state, r.country].filter(Boolean).join(", ");
        return (
          <div className="py-1 min-w-0 leading-4">
            <div className="font-medium text-[13px] text-slate-800 truncate" title={company}>
              {company}
            </div>
            {loc && (
              <div className="mt-0 flex items-center gap-1 text-[11.5px] text-slate-600 truncate" title={loc}>
                <MapPinIcon className="w-3 h-3" />
                <span className="truncate">{loc}</span>
              </div>
            )}
            <div className="mt-0 flex items-center gap-1 text-[11.5px] text-slate-600 truncate">
              <Globe2 className="w-3 h-3" />
              {website ? (
                <a href={/^https?:\/\//.test(website) ? website : `https://${website}`} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline truncate">
                  {website}
                </a>
              ) : (
                <span>-</span>
              )}
            </div>
          </div>
        );
      },
      sortable: true,
    },
    { headerName: "Contact", field: "email", flex: 1.2, minWidth: 220, cellRenderer: contactCellRenderer, sortable: false },
    { headerName: "Employees", field: "employees", flex: 0.6, minWidth: 110, sortable: true },
    { headerName: "Revenue (Min–Max)", field: "min_revenue", flex: 0.8, minWidth: 160, valueGetter: (p) => {
      const a = p.data?.min_revenue, b = p.data?.max_revenue;
      return a || b ? `${a || "–"} – ${b || "–"}` : "";
    }, sortable: true },
  ], [peopleCellRenderer, contactCellRenderer]);

  const defaultColDef = useMemo(() => ({ sortable: true, resizable: true, suppressHeaderMenuButton: true }), []);

  // empty data initially as requested
  const [rowData] = useState([]);

  // rows selector for UI parity with Dashboard (not functional here)
  const [pageSize, setPageSize] = useState(25);

  return (
    <div className="h-[calc(96vh-0px)] flex">
      {/* no filters rail here — as requested */}
      <main className="flex-1 px-2 pt-0 pb-6 -mt-3">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-xl font-semibold">{info.title}</h1>
          <div className="flex items-center gap-2">
            <label className="text-[12px] text-slate-600 mr-1">Rows:</label>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="h-8 border rounded-md text-[12px] px-2">
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>

        {/* Input above table */}
        <div className="mb-3">
          <input
            className="w-full h-11 pl-3 pr-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200"
            placeholder={info.placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Table (empty initially) */}
        <div className="relative ag-theme-quartz bg-white border rounded-xl shadow-sm" style={{ height: 520, width: "100%" }}>
          <AgGridReact
            columnDefs={baseColumns}
            defaultColDef={defaultColDef}
            rowData={rowData}
            rowSelection="multiple"
            pagination
            paginationPageSize={pageSize}
            animateRows
            enableCellTextSelection
            suppressDragLeaveHidesColumns
            rowHeight={56}
          />
          {rowData.length === 0 && (
            <div className="absolute inset-0 grid place-items-center text-slate-500 pointer-events-none">
              <div className="text-sm">No data — perform a search above to populate results.</div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
