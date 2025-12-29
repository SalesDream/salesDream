// src/components/Header.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../useAuth";
import logo from "../assets/logo_cloud.png"; // transparent cloud PNG / SVG (tight crop)
import AppLogo from "../components/AppLogoHeader";
export default function Header() {
  const [open, setOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const navigate = useNavigate();

  const [fromColor, setFromColor] = useState(
    () => localStorage.getItem("appSidebarFrom") || "#0E5A88"
  );
  const [toColor, setToColor] = useState(
    () => localStorage.getItem("appSidebarTo") || "#31A6F7"
  );

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-from", fromColor);
    document.documentElement.style.setProperty("--sidebar-to", toColor);
  }, [fromColor, toColor]);

  const saveTheme = () => {
    localStorage.setItem("appSidebarFrom", fromColor);
    localStorage.setItem("appSidebarTo", toColor);
    setThemeOpen(false);
  };

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  const goToDashboard = () => navigate("/dashboard");
  const onLogoKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goToDashboard();
    }
  };

  return (
    <header className="h-20 md:h-20 flex items-center justify-between bg-white border-b px-4 lg:px-10 shadow-sm z-20">
  {/* LEFT: Logo Section */}
  <div
    className="flex items-center gap-5 cursor-pointer select-none ml-3"
    onClick={goToDashboard}
    role="button"
    aria-label="Go to dashboard"
    title="SalesDream — Dashboard"
    tabIndex={0}
    onKeyDown={onLogoKeyDown}
  >
    {/* Accent Line */}
    

    {/* Logo */}
    <AppLogo
      size={126} // fills header height nicely
      showText={true}
      text="SalesDream"
      subtitle="Dashboard"
    />
  
      </div>

      {/* RIGHT: controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setThemeOpen((v) => !v)}
          className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 px-3 py-1.5 rounded"
          title="Theme"
          aria-expanded={themeOpen}
        >
          Theme
        </button>

        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 px-3 py-1.5 rounded"
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
      </div>

      {/* Theme modal */}
      {themeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setThemeOpen(false)} />
          <div className="relative z-60 w-[360px] bg-white rounded-lg border shadow-2xl p-4">
            <h3 className="text-sm font-semibold mb-2">Customize Sidebar Gradient</h3>

            <div className="flex items-center gap-3 mb-3">
              <label className="text-xs text-slate-600 w-24">From</label>
              <input
                type="color"
                value={fromColor}
                onChange={(e) => setFromColor(e.target.value)}
                className="h-10 w-14"
                title="Gradient start color"
              />
              <div className="flex-1 text-xs text-slate-500">Start color for the sidebar gradient</div>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <label className="text-xs text-slate-600 w-24">To</label>
              <input
                type="color"
                value={toColor}
                onChange={(e) => setToColor(e.target.value)}
                className="h-10 w-14"
                title="Gradient end color"
              />
              <div className="flex-1 text-xs text-slate-500">End color for the sidebar gradient</div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setFromColor("#0E5A88");
                  setToColor("#31A6F7");
                }}
                className="px-3 py-1 rounded border text-sm text-slate-600 hover:bg-slate-50"
              >
                Reset
              </button>
              <button
                onClick={saveTheme}
                className="px-3 py-1 rounded bg-sky-600 text-white text-sm hover:bg-sky-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
