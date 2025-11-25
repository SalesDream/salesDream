import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import { setAuth } from "../useAuth";
import logo from "../assets/salesdream.png"; // ensure path is correct

const API_URL = process.env.REACT_APP_API_URL || "https://28c4e5633a2c.ngrok-free.app";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      setAuth(data.token, data.user.role);
      navigate("/dashboard");
    } catch (e) {
      setError(e?.response?.data?.message || "Login failed");
    }
  };

  const googleLogin = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  return (
    <div className="h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-cyan-50 via-sky-100 to-indigo-50 p-6">
      <div className="w-full max-w-3xl rounded-2xl shadow-lg overflow-hidden grid grid-cols-1 md:grid-cols-2 bg-white">
        {/* Left visual area */}
        <div className="hidden md:flex flex-col items-center justify-center p-8 bg-gradient-to-tr from-indigo-600 via-cyan-500 to-emerald-400 relative text-white">
          <div className="bg-white/80 rounded-md p-6 drop-shadow-md">
            <img src={logo} alt="SalesDream" className="w-36 h-auto object-contain" />
          </div>
          <h2 className="text-white text-xl font-semibold mt-6">Welcome back to SalesDream</h2>
          <p className="text-white/90 max-w-xs text-center mt-2 text-sm">
            Streamline case tracking, automated drops, and collaboration — all from one modern dashboard.
          </p>

          <div className="mt-6 flex gap-3">
            <div className="px-3 py-1 bg-white/20 rounded-full text-white text-sm">Secure</div>
            <div className="px-3 py-1 bg-white/20 rounded-full text-white text-sm">Fast</div>
            <div className="px-3 py-1 bg-white/20 rounded-full text-white text-sm">Reliable</div>
          </div>
        </div>

        {/* Right: form area */}
        <div className="p-6 md:p-8 bg-white overflow-auto">
          <div className="max-w-md mx-auto">
            {/* Header (brand) */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-pink-500 text-white flex items-center justify-center font-semibold shadow-sm">
                  SD
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-800">SalesDream</h1>
                  <div className="text-xs text-gray-400">Sign in to manage your workspace</div>
                </div>
              </div>
              {/* Top-right link removed on purpose */}
              <div className="hidden sm:block" aria-hidden="true" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-100 p-2 rounded">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <Link to="/forgot" className="text-sm text-indigo-600">Forgot?</Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium shadow-sm transition"
              >
                Sign in
              </button>

              <div className="flex items-center gap-3 my-1">
                <div className="h-px bg-gray-200 flex-1" />
                <div className="text-xs text-gray-400">or</div>
                <div className="h-px bg-gray-200 flex-1" />
              </div>

              <button
                type="button"
                onClick={googleLogin}
                className="w-full border border-gray-200 rounded-lg py-2 flex items-center justify-center gap-3 text-sm hover:bg-gray-50 transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M21.805 10.023h-9.78v3.951h5.59c-.244 1.411-1.26 3.372-5.59 3.372-3.358 0-6.095-2.773-6.095-6.188s2.737-6.188 6.095-6.188c1.914 0 3.193.817 3.924 1.521l2.684-2.6C18.03 3.2 16.02 2.1 13.1 2.1 7.648 2.1 3.293 6.403 3.293 11.6s4.355 9.5 9.806 9.5c5.657 0 9.49-3.975 9.49-9.668 0-.66-.073-1.156-.784-1.409z" fill="#4285F4" />
                </svg>
                Continue with Google
              </button>

              {/* Footer: moved the "Create an account" link here */}
              <div className="mt-2 text-center">
                <p className="text-sm text-gray-600">
                  New here?{" "}
                  <Link to="/signup" className="text-indigo-600 font-medium hover:underline">
                    Create an account
                  </Link>
                </p>
              </div>

              <p className="text-xs text-gray-500 text-center mt-3">
                By signing in you agree to our{" "}
                <Link to="/terms" className="text-indigo-600">Terms</Link> and{" "}
                <Link to="/privacy" className="text-indigo-600">Privacy Policy</Link>.
              </p>
            </form>

            <div className="mt-6 text-center text-sm text-gray-400">© {new Date().getFullYear()} SalesDream. All rights reserved.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
