// src/components/Header.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../useAuth";
import logo from "../assets/salesdream.png"; // keep your asset here (prefer a square/transparent PNG)

export default function Header() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    // Add left padding so header content clears the sidebar.
    // md:pl-16 assumes your collapsed sidebar is ~56-64px wide; increase if needed.
    <header className="h-14 flex items-center justify-between bg-white border-b px-4 md:px-6 md:pl-20 shadow-sm z-20">
      <div
        className="flex items-center gap-3 cursor-pointer select-none"
        onClick={() => navigate("/dashboard")}
        role="button"
        aria-label="Go to dashboard"
        title="SalesDream — Dashboard"
      >
        {/* Badge wrapper gives a consistent small area for the logo */}
        <div className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-400 p-1 shadow-sm transform transition-transform duration-150 hover:scale-105">
          <img
            src={logo}
            alt="SalesDream"
            className="w-8 h-8 md:w-9 md:h-9 object-contain"
            draggable={false}
          />
        </div>

        {/* brand text hidden on very small screens */}
        <div className="hidden sm:flex flex-col leading-tight">
          <div className="text-sm md:text-base font-semibold text-sky-700">SalesDream</div>
          <div className="text-xs text-gray-400 -mt-0.5">Dashboard</div>
        </div>
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-sm font-medium text-gray-700 hover:text-blue-600 px-3 py-1 rounded"
          aria-haspopup="true"
          aria-expanded={open}
        >
          Profile ▾
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg z-30">
            <button
              onClick={() => {
                setOpen(false);
                navigate("/profile");
              }}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            >
              Profile
            </button>
            <button
              onClick={onLogout}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
