import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Sun, Palette } from "lucide-react";
import { logout } from "../useAuth";
import AppLogo from "../components/AppLogoHeader";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("appTheme") || "dark");
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

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("appTheme", theme);
  }, [theme]);

  const saveTheme = () => {
    localStorage.setItem("appSidebarFrom", fromColor);
    localStorage.setItem("appSidebarTo", toColor);
    setThemeOpen(false);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
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
    <header className="h-20 md:h-20 flex items-center justify-between bg-[color:var(--surface)]/90 backdrop-blur border-b border-[color:var(--border-color)] px-4 lg:px-10 shadow-sm z-30 sticky top-0">
      <div
        className="flex items-center gap-5 cursor-pointer select-none ml-1"
        onClick={goToDashboard}
        role="button"
        aria-label="Go to dashboard"
        title="SalesDream · Dashboard"
        tabIndex={0}
        onKeyDown={onLogoKeyDown}
      >
        <AppLogo size={118} showText text="SalesDream" subtitle="Dashboard" />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="btn-soft inline-flex items-center gap-2 text-sm"
          title="Toggle light/dark theme"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === "dark" ? "Light" : "Dark"}
        </button>

        <button
          onClick={() => setThemeOpen((v) => !v)}
          className="btn-soft hidden sm:inline-flex items-center gap-2 text-sm"
          title="Theme and sidebar branding"
          aria-expanded={themeOpen}
        >
          <Palette className="w-4 h-4" />
          Theme
        </button>

        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="btn-soft inline-flex items-center gap-2 text-sm"
            aria-haspopup="true"
            aria-expanded={open}
          >
            Profile
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-44 bg-[color:var(--surface)] border border-[color:var(--border-color)] rounded-lg shadow-lg z-30">
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/profile");
                }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-[color:var(--surface-muted)] text-[color:var(--text-primary)]"
              >
                Profile
              </button>
              <button
                onClick={onLogout}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-[color:var(--surface-muted)]"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {themeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center top-48">
          <div className="absolute inset-0 bg-black/40" onClick={() => setThemeOpen(false)} />
          <div className="relative w-[380px] bg-[color:var(--surface)] rounded-lg border border-[color:var(--border-color)] shadow-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">Theme & sidebar</h3>
              <button
                onClick={toggleTheme}
                className="btn-ghost inline-flex items-center gap-2 text-xs"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { name: "Light", theme: "light", from: "#0E5A88", to: "#31A6F7" },
                { name: "Sky", theme: "light", from: "#0ea5e9", to: "#6366f1" },
                { name: "Midnight", theme: "dark", from: "#0b1325", to: "#111827" },
              ].map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setTheme(preset.theme);
                    setFromColor(preset.from);
                    setToColor(preset.to);
                  }}
                  className="h-16 rounded-lg border border-[color:var(--border-color)] overflow-hidden shadow-sm"
                  title={`${preset.name} preset`}
                >
                  <div
                    className="h-full w-full"
                    style={{ background: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }}
                  />
                  <div className="text-[11px] font-medium text-[color:var(--text-primary)] py-1">{preset.name}</div>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs text-[color:var(--text-muted)] w-20">From</label>
              <input
                type="color"
                value={fromColor}
                onChange={(e) => setFromColor(e.target.value)}
                className="h-10 w-14"
                title="Gradient start color"
              />
              <div className="flex-1 text-xs text-[color:var(--text-muted)]">Start color for the sidebar gradient</div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs text-[color:var(--text-muted)] w-20">To</label>
              <input
                type="color"
                value={toColor}
                onChange={(e) => setToColor(e.target.value)}
                className="h-10 w-14"
                title="Gradient end color"
              />
              <div className="flex-1 text-xs text-[color:var(--text-muted)]">End color for the sidebar gradient</div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setFromColor("#0E5A88");
                  setToColor("#31A6F7");
                  setTheme("light");
                }}
                className="btn-ghost text-sm"
              >
                Reset
              </button>
              <button
                onClick={saveTheme}
                className="btn-primary text-sm"
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
