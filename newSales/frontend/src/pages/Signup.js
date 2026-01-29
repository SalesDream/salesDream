// src/pages/Signup.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import { setAuth } from "../useAuth";

import banner from "../assets/Logo.png";
import AppLogo from "../components/AppLogo";

export default function Signup() {
  // phase: 1 => initial (request OTP), 2 => verify OTP, 3 => success message (fallback)
  const [phase, setPhase] = useState(1);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Step 1: request OTP
  const requestOtp = async (e) => {
    e?.preventDefault?.();
    setError("");
    setInfo("");

    if (!name?.trim()) return setError("Please enter your full name.");
    if (!email?.trim()) return setError("Please enter your email.");
    if (!password || password.length < 6)
      return setError("Password must be at least 6 characters.");

    try {
      setLoading(true);
      const { data } = await api.post("/api/auth/register-request", { email });
      setInfo(data?.message || "OTP sent to your email.");
      setPhase(2);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: verify OTP and create account — auto-login on success
  const verifyAndCreate = async (e) => {
    e?.preventDefault?.();
    setError("");
    setInfo("");

    if (!otp?.trim()) return setError("Please enter the OTP sent to your email.");

    try {
      setLoading(true);
      const { data } = await api.post("/api/auth/register-verify", {
        email,
        otp,
        password,
        name,
      });

      // If backend returned token & user — sign them in automatically
      if (data?.token) {
        try {
          setAuth(data.token, data.user?.role);
        } catch (err) {
          // ignore setAuth failure but continue navigation
        }
        navigate("/dashboard");
        return;
      }

      // Fallback: if no token, show success phase (keeps backward compatibility)
      setPhase(3);
      setInfo("Registration successful. You may now log in.");
    } catch (err) {
      setError(err?.response?.data?.message || "OTP verification or registration failed");
    } finally {
      setLoading(false);
    }
  };

  const backToStep1 = () => {
    setPhase(1);
    setOtp("");
    setInfo("");
    setError("");
  };

  const resendOtp = async () => {
    setError("");
    setInfo("");
    try {
      setLoading(true);
      const { data } = await api.post("/api/auth/register-request", { email });
      setInfo(data?.message || "OTP resent to your email.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-sky-100 to-indigo-50 p-6">
      <div className="w-full max-w-4xl rounded-2xl shadow-lg overflow-hidden grid grid-cols-1 md:grid-cols-2 bg-[color:var(--surface)] text-[color:var(--text-primary)]">
        {/* Left banner */}
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
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(180deg, rgba(2,6,23,0.04), rgba(2,6,23,0.04))",
            }}
          />
          <div
            className="absolute left-0 bottom-4 w-full z-10 text-center px-6"
            style={{ bottom: 10 }}
          >
            <h2 className="text-gray text-lg font-semibold mb-1  drop-shadow-lg">
              welcome to salesdream
            </h2>
            <p className="text-gray/90 text-sm mb-3 leading-relaxed drop-shadow-sm">
              Create your account to start discovering targeted B2B leads,
              enrich contacts, and collaborate with your team to convert
              prospects faster.
            </p>
            <div className="flex items-center justify-center gap-3 mt-2">
              <span className="px-3 py-1 rounded-full font-semibold text-gray-100 text-xs bg-gray-600">
                Prospector
              </span>
              <span className="px-3 py-1 rounded-full font-semibold text-gray-100 text-xs bg-gray-600">
                Enrichment
              </span>
              <span className="px-3 py-1 rounded-full font-semibold text-gray-100 text-xs bg-gray-600">
                Export
              </span>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="p-6 md:p-10 bg-[color:var(--surface)] max-h-screen overflow-auto flex items-center">
          <div className="w-full max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <AppLogo size={40} text="SalesDream" subtitle="Sign in to manage your B2B Leads" />
            </div>

            {/* STEP 1: Request OTP */}
            {phase === 1 && (
              <form onSubmit={requestOtp} className="space-y-4">
                {error && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-100 p-2 rounded">
                    {error}
                  </div>
                )}
                {info && (
                  <div className="text-sm text-sky-700 bg-sky-50 border border-sky-100 p-2 rounded">
                    {info}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    required
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium shadow-sm transition disabled:opacity-60"
                >
                  {loading ? "Please wait..." : "Sign up"}
                </button>
                <div className="mt-2 text-center">
                  <p className="text-sm text-gray-600">
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      className="text-indigo-600 font-medium hover:underline"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </form>
            )}

            {/* STEP 2: Verify OTP */}
            {phase === 2 && (
              <form onSubmit={verifyAndCreate} className="space-y-4">
                {error && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-100 p-2 rounded">
                    {error}
                  </div>
                )}
                {info && (
                  <div className="text-sm text-sky-700 bg-sky-50 border border-sky-100 p-2 rounded">
                    {info}
                  </div>
                )}
                <div>
                  <div className="text-sm text-slate-600 mb-2">
                    We sent an OTP to <b>{email}</b>. Enter it below to finish
                    creating your account.
                  </div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    OTP
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit code"
                    required
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium shadow-sm transition disabled:opacity-60"
                  >
                    {loading ? "Verifying..." : "Verify & Create"}
                  </button>
                  <button
                    type="button"
                    onClick={backToStep1}
                    className="flex-1 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50 transition"
                  >
                    Back
                  </button>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div>Didn't receive the code?</div>
                  <button
                    type="button"
                    onClick={resendOtp}
                    className="text-indigo-600 hover:underline"
                  >
                    Resend
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Success Message (fallback) */}
            {phase === 3 && (
              <div className="text-center space-y-4">
                <div className="text-green-700 bg-green-50 border border-green-100 p-3 rounded">
                  Registration successful! 🎉 <br />
                  Check your email for your login credentials.
                </div>
                <button
                  onClick={() => navigate("/login")}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium shadow-sm transition"
                >
                  Go to Login
                </button>
              </div>
            )}

            <div className="mt-6 text-center text-sm text-gray-400">
              © {new Date().getFullYear()} SalesDream. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
