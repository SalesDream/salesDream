// src/pages/ChangePassword.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import banner from "../assets/Logo.png";
import AppLogo from "../components/AppLogo";
import { useAuthToken } from "../useAuth";

export default function ChangePassword() {
  const token = useAuthToken();
  const navigate = useNavigate();

  // guard redirect using effect to avoid render-time navigation warning
  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const submitChange = async (e) => {
    e?.preventDefault?.();
    setError("");
    setInfo("");

    if (!currentPassword) return setError("Please enter your current password.");
    if (!newPassword || !confirmPassword) return setError("Please enter and confirm your new password.");
    if (newPassword !== confirmPassword) return setError("New passwords do not match.");
    if (newPassword.length < 6) return setError("New password must be at least 6 characters.");

    try {
      setLoading(true);
      await api.post("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });

      setInfo("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };


  return (
      <div className=" flex items-center justify-center">
        <div className="w-full max-w-4xl rounded-2xl shadow-lg overflow-hidden grid grid-cols-1 md:grid-cols-2 bg-white">
          <div
            className="hidden md:flex items-end justify-center relative"
            style={{
              backgroundImage: `url(${banner})`,
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              // minHeight: 480,
              padding: "2.5rem",
            }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(2,6,23,0.04), rgba(2,6,23,0.04))" }} />
            <div  className="absolute left-0 bottom-4 w-full z-10 text-center px-6"
            style={{ bottom: 10 }} >
            <h2 className="text-md font-semibold mb-1 drop-shadow-sm">Secure your account</h2>
            <p className="text-gray-700 text-xs mb-1 leading-tight drop-shadow-sm">
              Change your password to keep your account secure. Choose a strong password you haven't used elsewhere.
            </p>
          </div>
          </div>
  
          <div className="p-4 md:p-6 bg-white flex items-center">
          <div className="w-full max-w-sm mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <AppLogo size={34} text="Change password" subtitle="Update your account password" />
            </div>

            {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 p-2 rounded mb-3">{error}</div>}
            {info && <div className="text-sm text-sky-700 bg-sky-50 border border-sky-100 p-2 rounded mb-3">{info}</div>}

            <form onSubmit={submitChange} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  required
                  className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  required
                  className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md py-2 text-sm font-medium shadow-sm transition disabled:opacity-60"
                >
                  {loading ? "Please wait…" : "Change password"}
                </button>

                <Link to="/dashboard" className="inline-flex items-center px-3 py-1.5 text-sm border rounded hover:bg-gray-50">Cancel</Link>
              </div>

              {/* <div className="text-sm text-gray-500 text-center">
                <Link to="/forgot" className="text-indigo-600 hover:underline">Forgot password?</Link>
              </div> */}
            </form>

            <div className="mt-4 text-center text-xs text-gray-400">© {new Date().getFullYear()} SalesDream</div>
          </div>
        </div>
        </div>
      </div>
    );
}
