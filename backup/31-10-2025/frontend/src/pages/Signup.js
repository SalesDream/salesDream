// src/pages/Signup.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";

// Banner and small logo assets (same as Login)
import banner from "../assets/banner.png"; // ensure this exists
import logo2 from "../assets/cloud5.png"; // small header/cloud icon

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/api/auth/register", { email, password, name });
      navigate("/login");
    } catch (err) {
      setError(err?.response?.data?.message || "Signup failed");
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-sky-100 to-indigo-50 p-6">
      <div className="w-full max-w-4xl rounded-2xl shadow-lg overflow-hidden grid grid-cols-1 md:grid-cols-2 bg-white">
        {/* Left: banner shown fully (cover/contain as desired) with content pinned near bottom */}
        <div
          className="hidden md:flex items-end justify-center relative"
          style={{
            backgroundImage: `url(${banner})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            minHeight: 480,
            padding: "2.5rem",
            backgroundColor: "transparent",
          }}
        >
          {/* subtle overlay for legibility */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(180deg, rgba(2,6,23,0.04), rgba(2,6,23,0.04))",
            }}
            aria-hidden="true"
          />

          {/* Full-width bottom pinned content (10px from bottom) */}
          <div
            className="absolute left-0 bottom-4 w-full z-10 text-center px-6"
            style={{ bottom: 10 }}
          >
            

            <h2 className="text-white text-lg font-semibold mb-2 drop-shadow-lg">welcome to salesdream</h2>

            <p className="text-white/90 text-sm mb-3 leading-relaxed drop-shadow-sm">
              Create your account to start discovering targeted B2B leads, enrich contacts,
              and collaborate with your team to convert prospects faster.
            </p>

            <div className="flex items-center justify-center gap-3 mt-2">
              <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs">Prospector</span>
              <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs">Enrichment</span>
              <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs">Export</span>
            </div>
          </div>
        </div>

        {/* Right: signup form */}
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
                <h1 className="text-lg font-semibold text-gray-800">Create an account</h1>
                <div className="text-xs text-gray-400">Start your SalesDream trial</div>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-100 p-2 rounded">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                />
              </div>

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
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium shadow-sm transition"
              >
                Sign up
              </button>

              <div className="mt-2 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <Link to="/login" className="text-indigo-600 font-medium hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>

              <div className="text-xs text-gray-500 text-center mt-2">
                By creating an account you agree to our{" "}
                <Link to="/terms" className="text-indigo-600">Terms</Link> and{" "}
                <Link to="/privacy" className="text-indigo-600">Privacy Policy</Link>.
              </div>
            </form>

            <div className="mt-6 text-center text-sm text-gray-400">© {new Date().getFullYear()} SalesDream. All rights reserved.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
