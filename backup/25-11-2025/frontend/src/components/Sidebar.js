// src/components/Sidebar.jsx
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Search, Phone, Mail, Globe, User, Settings, Key,
  ChevronsLeft, ChevronsRight, Wrench,
  MailPlus, Bell
} from "lucide-react";
import AppLogo from "../components/AppLogo";

const ACTIVE_BG = "bg-[#31A6F7]";
const HOVER_BG  = "hover:bg-white/10";

// Menu config (unchanged)
const sections = [
  {
    title: "MAIN",
    items: [
      { to: "/dashboard",        label: "Search B2B Leads",      icon: Search  },
      { to: "/search-phone",     label: "Search Phone",           icon: Phone   },
      { to: "/search-email",     label: "Search Email",           icon: Mail    },
      { to: "/search-domain",    label: "Search Domain",          icon: Globe   },
      { to: "/search-name",      label: "Search Name",            icon: User    },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { to: "/settings",        label: "Setting",         icon: Settings },
      { to: "/change-password", label: "Change Password", icon: Key      },
    ],
  },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  // Hard visibility (arrow click) — persisted
  const [visible, setVisible] = useState(() => {
    const v = localStorage.getItem("sidebarVisible");
    return v === null ? true : v === "1";
  });
  useEffect(() => {
    localStorage.setItem("sidebarVisible", visible ? "1" : "0");
  }, [visible]);

  // Hover expansion (not persisted)
  const [hovered, setHovered] = useState(false);

  // Provide a compact comeback when fully hidden
  if (!visible) {
  return (
    <button
      onClick={() => setVisible(true)}
      title="Show sidebar"
      aria-label="Show sidebar"
      className="fixed z-40 grid place-items-center rounded-md text-white shadow-lg"
      style={{
        background: "linear-gradient(90deg, var(--sidebar-from, #0E5A88), var(--sidebar-to, #31A6F7))",
        top: "100px",
        left: "inherit",
        width: "1.5rem",
        height: "1.5rem",
        // keep a small padding so the icon doesn't touch edges
        padding: 2,
      }}
    >
      <ChevronsRight className="w-3 h-3" />
    </button>
  );
}


  // Widths
  const railW = 56;   // collapsed visual rail
  const openW = 224;  // expanded on hover

  // inline style uses CSS vars so admin can change them from Header control
  const sidebarStyle = {
    width: hovered ? openW : railW,
    background: "linear-gradient(180deg, var(--sidebar-from, #0E5A88), var(--sidebar-to, #31A6F7))",
  };

  return (
    <>
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`fixed left-0 top-0 bottom-0 z-40 text-white transition-all duration-200 overflow-visible`}
        style={sidebarStyle}
      >
        <div className="h-full flex flex-col">
          {/* Top: logo + hard hide arrow */}
          <div className="flex items-center justify-between px-0 py-3">
            <div className="flex items-center select-none">
  {/* clean transparent logo, slightly larger */}
{/* <div className="flex items-center select-none">
  <div className={hovered ? "w-14 h-14 flex items-center justify-center" : "w-12 h-12 flex items-center justify-center"} style={{ paddingLeft: 4 }}>
    
    <AppLogo size={hovered ? 48 : 40} text="" />
  </div>
</div> */}

</div>

            <button
              onClick={() => setVisible(false)}
              className={`p-1.5 rounded-md text-white/90 ${HOVER_BG}`}
              title="Hide sidebar"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Sections */}
          <div className="pb-4">
            {sections.map((section) => (
              <div key={section.title} className="mt-2">
                {hovered && (
                  <div className="px-4 text-[11px] text-white/80 font-semibold uppercase tracking-wide">
                    {section.title}
                  </div>
                )}

                <nav className="mt-1 space-y-1">
                  {section.items.map((item, idx) => {
                    // ----- TOOLS ROW (submenu on hover) -----
                    if (item.tools) {
                      const Icon = item.icon || Wrench;
                      return (
                        <div key={`tools-${idx}`} className="relative group/tool">
                          <button
                            type="button"
                            onClick={(e) => e.preventDefault()}
                            className={[
                              "relative flex items-center transition text-white/90",
                              hovered
                                ? `mx-2 my-0.5 h-10 rounded-lg px-3 gap-3 w-[calc(100%-1rem)] ${HOVER_BG}`
                                : `justify-center mx-2 my-0.5 h-10 w-10 rounded-full ${HOVER_BG}`
                            ].join(" ")}
                            title="Tools"
                            aria-haspopup="menu"
                          >
                            <Icon className="w-5 h-5 shrink-0" />
                            {hovered && <span className="truncate">Tools</span>}
                          </button>

                          {/* Tooltip when collapsed */}
                          {!hovered && (
                            <span
                              className="pointer-events-none absolute left-14 top-1/2 -translate-y-1/2
                                         z-[60] px-2 py-1 text-xs text-white bg-black/70 rounded shadow-lg
                                         opacity-0 group-hover/tool:opacity-100 whitespace-nowrap"
                            >
                              Tools
                            </span>
                          )}

                          {/* Submenu */}
                          <div
                            className={[
                              "pointer-events-auto absolute z-[80]",
                              "left-full ml-2 top-1/2 -translate-y-1/2",
                              "min-w-[220px] rounded-xl border border-black/10 bg-white text-gray-800 shadow-2xl",
                              "opacity-0 invisible",
                              "group-hover/tool:opacity-100 group-hover/tool:visible",
                              "transition-opacity duration-150"
                            ].join(" ")}
                            role="menu"
                          >
                            <div className="py-1">
                              <Link to="/tools/send-email" className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50" role="menuitem">
                                <Mail className="w-4 h-4 text-blue-700" />
                                <span className="text-sm">Send Email</span>
                              </Link>
                              <Link to="/tools/send-bulk-email" className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50" role="menuitem">
                                <MailPlus className="w-4 h-4 text-blue-700" />
                                <span className="text-sm">Send Bulk Email</span>
                              </Link>
                              <Link to="/tools/notifications" className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50" role="menuitem">
                                <Bell className="w-4 h-4 text-blue-700" />
                                <span className="text-sm">Notification</span>
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // ----- Regular nav items -----
                    const { to, label, icon: Icon } = item;
                    const active = pathname === to;

                    return (
                      <div key={to} className="relative group">
                        <Link
                          to={to}
                          className={[
                            "relative flex items-center transition",
                            hovered
                              ? `mx-2 my-0.5 h-10 rounded-lg px-3 gap-3 w-[calc(100%-1rem)] ${HOVER_BG}`
                              : `justify-center mx-2 my-0.5 h-10 w-10 rounded-full ${HOVER_BG}`,
                            active ? "" : "text-white/90"
                          ].join(" ")}
                          title={hovered ? undefined : label}
                        >
                          <span
                            className={[
                              "grid place-items-center",
                              hovered ? "w-8 h-8 rounded-full" : "w-10 h-10 rounded-full",
                              active ? `${ACTIVE_BG} text-white` : "bg-transparent text-white"
                            ].join(" ")}
                          >
                            <Icon className="w-5 h-5" />
                          </span>
                          {hovered && <span className="truncate text-white">{label}</span>}
                        </Link>
                      </div>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Spacer keeps base content alignment while the rail overlaps on expand */}
      <div aria-hidden className="shrink-0" style={{ width: railW }} />
    </>
  );
}
