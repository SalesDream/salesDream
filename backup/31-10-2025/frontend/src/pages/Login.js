// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import { setAuth } from "../useAuth";

// Banner and small logo assets
import banner from "../assets/banner.png"; // ensure this exists
import logo2 from "../assets/cloud5.png"; // small header/cloud icon

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
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed");
    }
  };

  const googleLogin = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-sky-100 to-indigo-50 p-6">
      <div className="w-full max-w-4xl rounded-2xl shadow-lg overflow-hidden grid grid-cols-1 md:grid-cols-2 bg-white">
        {/* Left: banner shown fully (no crop) with content pinned 40px from bottom */}
        <div
          className="hidden md:flex items-end justify-center relative"
          style={{
            backgroundImage: `url(${banner})`,
            backgroundSize: "cover",       // show entire image without cropping
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            minHeight: 480,
            padding: "2.5rem",
            backgroundColor: "transparent",
          }}
        >
          {/* light overlay for contrast */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(180deg, rgba(2,6,23,0.04), rgba(2,6,23,0.04))",
            }}
            aria-hidden="true"
          />

          {/* Pinned content: absolute and centered horizontally, 40px from bottom */}
          <div
            className="absolute left-0 bottom-4 w-full z-10 text-center px-6"
            style={{ bottom: 10 }}
          >
            

            <h2 className="text-white text-lg font-semibold mb-2 drop-shadow-lg">welcome to salesdream</h2>

            <p className="text-white/90 text-sm mb-3 leading-relaxed drop-shadow-sm">
              Discover and manage B2B leads faster — enriched company & contact data, intelligent filters,
              and CSV exports to accelerate outreach.
            </p>

            <div className="flex items-center justify-center gap-3 mt-2">
              <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs">Prospector</span>
              <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs">Enrichment</span>
              <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs">Export</span>
            </div>
          </div>
        </div>

        {/* Right: form area */}
        <div className="p-6 md:p-10 bg-white max-h-screen overflow-auto flex items-center">
          <div className="w-full max-w-md mx-auto">
            {/* Header (brand) */}
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                style={{ background: "transparent" }}
              >
                <img
                  src={logo2}
                  alt="salesdream"
                  className="w-8 h-8 object-contain"
                  style={{ display: "block", background: "transparent" }}
                  draggable={false}
                />
              </div>

              <div>
                <h1 className="text-lg font-semibold text-gray-800">salesdream</h1>
                <div className="text-xs text-gray-400">Sign in to manage your B2b Leads</div>
              </div>
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

            <div className="mt-6 text-center text-sm text-gray-400">© {new Date().getFullYear()} salesdream. All rights reserved.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
