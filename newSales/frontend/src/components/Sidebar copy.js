import { Link, useLocation } from "react-router-dom";
import {
  Search,
  Phone,
  Mail,
  Globe,
  User,
  Settings,
  Key,
} from "lucide-react";

const sections = [
  {
    title: "MAIN",
    items: [
      { to: "/dashboard", label: "Search B2B Leads", icon: Search },
      { to: "/search-phone", label: "Search Phone", icon: Phone },
      { to: "/search-area-code", label: "Search Phone Area Code", icon: Phone },
      { to: "/search-email", label: "Search Email", icon: Mail },
      { to: "/search-domain", label: "Search Domain", icon: Globe },
      { to: "/search-name", label: "Search Name", icon: User },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { to: "/settings", label: "Setting", icon: Settings },
      { to: "/change-password", label: "Change Password", icon: Key },
    ],
  },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="w-16 shrink-0 h-full bg-white border-r shadow-sm flex flex-col items-center py-4 space-y-6">
      {/* Logo */}
      <div className="text-blue-600 font-bold text-lg">SD</div>

      {/* Sections */}
      {sections.map((section) => (
        <div key={section.title} className="flex flex-col items-center space-y-4">
          {section.items.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`relative group p-2 rounded-lg transition flex items-center justify-center
                ${pathname === to ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-blue-50"}`}
            >
              <Icon className="w-5 h-5" />
              {/* Tooltip */}
              <span className="absolute left-14 z-50 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                {label}
              </span>
            </Link>
          ))}
        </div>
      ))}
    </aside>
  );
}
