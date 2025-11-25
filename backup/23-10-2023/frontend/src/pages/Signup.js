// src/pages/Signup.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";

import logo from "../assets/salesdream.png"; // adjust path if needed

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
    } catch (e) {
      setError(e?.response?.data?.message || "Signup failed");
    }
  };

  return (
    <div className="h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-cyan-50 via-sky-100 to-indigo-50 p-6">
      <div className="w-full max-w-3xl rounded-2xl shadow-lg overflow-hidden grid grid-cols-1 md:grid-cols-2 bg-white">
        {/* Left banner */}
        <div className="hidden md:flex flex-col items-center justify-center p-8 bg-gradient-to-tr from-indigo-600 via-cyan-500 to-emerald-400 relative text-white">
          <div className="bg-white/80 rounded-md p-6 drop-shadow-md">
            <img src={logo} alt="SalesDream" className="w-36 h-auto object-contain" />
          </div>

          <h2 className="text-white text-xl font-semibold mt-6">Welcome to SalesDream</h2>
          <p className="text-white/90 max-w-xs text-center mt-2 text-sm">
            Create your account to start tracking cases, automating drops and collaborating with your team.
          </p>

          <div className="mt-6 flex gap-3">
            <div className="px-3 py-1 bg-white/20 rounded-full text-white text-sm">Secure</div>
            <div className="px-3 py-1 bg-white/20 rounded-full text-white text-sm">Fast</div>
            <div className="px-3 py-1 bg-white/20 rounded-full text-white text-sm">Reliable</div>
          </div>

          <svg className="absolute -right-14 -bottom-10 opacity-30" width="200" height="200" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g>
              <circle cx="120" cy="120" r="100" fill="rgba(255,255,255,0.12)" />
              <circle cx="240" cy="220" r="80" fill="rgba(255,255,255,0.08)" />
              <circle cx="360" cy="120" r="60" fill="rgba(255,255,255,0.06)" />
            </g>
          </svg>
        </div>

        {/* Right: signup form */}
        <div className="p-6 md:p-8 bg-white max-h-screen overflow-auto">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-pink-500 text-white flex items-center justify-center font-semibold shadow-sm">
                  SD
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-800">Create an account</h1>
                  <div className="text-xs text-gray-400">Start your SalesDream trial</div>
                </div>
              </div>

              {/* top-right removed for clarity */}
              <div className="hidden sm:block" aria-hidden="true" />
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

              {/* footer link moved here (already have account) */}
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
