import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../useAuth"; // if file is in /components, change to "../useAuth"

export default function Header() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="h-14 flex items-center justify-between bg-white border-b px-6 shadow-sm relative">
      <div className="text-xl font-bold text-blue-600 cursor-pointer ml-10" onClick={() => navigate("/dashboard")}>
        SalesDream
      </div>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-sm font-medium text-gray-700 hover:text-blue-600"
        >
          Profile ▾
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg z-20">
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
