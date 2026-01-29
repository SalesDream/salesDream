// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import { setAuth } from "../useAuth";
// Banner and small logo assets
import banner from "../assets/Logo.png"; // ensure this exists
import AppLogo from "../components/AppLogo";


// prefer explicit env var, then axios baseURL, then fallback localhost
const API_URL =
  process.env.REACT_APP_API_URL ||
  (api && api.defaults && api.defaults.baseURL) ||
  "http://localhost:5000";

console.log("backend API",API_URL);

export default function Login() {
  // phase: 1 => credentials entry, 2 => OTP entry
  const [phase, setPhase] = useState(1);
const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const navigate = useNavigate();

  // Step 1: submit credentials to server
 // src/pages/Login.jsx (inside the component)
  const submit = async (e) => {
    e?.preventDefault?.();
    setError("");
    setInfo("");
    try {
      setLoading(true);
      // Call backend endpoint that validates email+password and returns token
      const { data } = await api.post("/api/auth/login-request", { email, password });

      // If server returns bypass or token, set auth and navigate
      if (data?.bypass || data?.token) {
        const token = data.token;
        setAuth(token, data.user?.role);
        navigate("/dashboard");
        return;
      }

      // Fallback: if server still returns OTP message (legacy), keep OTP phase
      setPhase(2);
      setInfo(data?.message || "OTP sent to your email. Check inbox (and spam).");
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };


  // Step 2: submit OTP to server
  const submitOtp = async (e) => {
    e?.preventDefault?.();
    setError("");
    setInfo("");
    try {
      setLoading(true);
      const { data } = await api.post("/api/auth/login-verify", { email, otp });
      // server returns token and user
      setAuth(data.token, data.user?.role);
      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.message || "OTP verification failed");
    }finally {
      setLoading(false);
    }
  };

  // Resend OTP (calls login-request again)
  const resendOtp = async () => {
    setError("");
    setInfo("");
    try {
      setLoading(true);
      const { data } = await api.post("/api/auth/login-request", { email, password });
      setInfo(data?.message || "OTP resent to your email.");
      setPhase(2);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to resend OTP");
    }finally {
      setLoading(false);
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
                      backgroundSize: "contain",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                      // minHeight: 480,
                      padding: "2.5rem",
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
            <h2 className="text-gray text-lg font-semibold mb-2 drop-shadow-lg">welcome to salesdream</h2>

            <p className="text-gray/90 text-sm mb-3 leading-relaxed drop-shadow-sm">
              Discover and manage B2B leads faster — enriched company & contact data, intelligent filters,
              and CSV exports to accelerate outreach.
            </p>

            <div className="flex items-center justify-center gap-3 mt-2">
              <span className="px-3 py-1 rounded-full font-semibold text-gray-100 text-xs bg-gray-600">Prospector</span>
              <span className="px-3 py-1 rounded-full font-semibold text-gray-100 text-xs bg-gray-600">Enrichment</span>
              <span className="px-3 py-1 rounded-full font-semibold text-gray-100 text-xs bg-gray-600">Export</span>
            </div>
          </div>
        </div>

        {/* Right: form area */}
        <div className="p-6 md:p-10 bg-white max-h-screen overflow-auto flex items-center">
          <div className="w-full max-w-md mx-auto">
            {/* Header (brand) */}
            <div className="flex items-center gap-3 mb-6">
              {/* <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                style={{ background: "transparent" }}
              > */}
                <AppLogo size={40} text="SalesDream" subtitle="Sign in to manage your B2B Leads" />
              {/* </div> */}

              {/* <div>
                <h1 className="text-lg font-semibold text-gray-800">Sales Dream</h1>
                <div className="text-xs text-gray-400">Sign in to manage your B2b Leads</div>
              </div> */}
            </div>

            {/* Phase 1: credentials */}
            {phase === 1 && (
              <form onSubmit={submit} className="space-y-4">
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
                disabled={loading}
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium shadow-sm transition"
                >
                   {loading ? "Please wait..." : "Sign in"}
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
  {/* Multi-colored Google "G" */}
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0"
  >
    <path d="M21.6 12.23c0-.68-.06-1.33-.17-1.96H12v3.71h5.84c-.25 1.36-1.01 2.51-2.15 3.29v2.73h3.47c2.03-1.87 3.06-4.63 3.06-7.77z" fill="#4285F4"/>
    <path d="M12 22c2.43 0 4.47-.8 5.96-2.16l-3.46-2.73c-.96.64-2.07.98-3.5.98-2.36 0-4.36-1.6-5.08-3.75H3.31v2.35C4.79 19.8 8.14 22 12 22z" fill="#34A853"/>
    <path d="M6.92 13.61A5.99 5.99 0 016.92 12c0-.6.1-1.18.27-1.71V7.94H3.31A9.99 9.99 0 002 12c0 1.61.39 3.13 1.31 4.46l3.61-2.85z" fill="#FBBC05"/>
    <path d="M12 6.4c1.32 0 2.5.45 3.43 1.34l2.57-2.58C16.45 3.82 14.43 3 12 3 8.14 3 4.79 5.2 3.31 7.7l3.88 2.59C7.64 8.01 9.64 6.4 12 6.4z" fill="#EA4335"/>
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
            )}

            {/* Phase 2: OTP */}
            {phase === 2 && (
              <form onSubmit={submitOtp} className="space-y-4">
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
                  <div className="text-sm text-slate-600 mb-2">OTP was sent to <b>{email}</b></div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit code"
                    required
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium shadow-sm transition"
                  >
                    Verify OTP
                  </button>

                  <button
                    type="button"
                    onClick={() => { setPhase(1); setOtp(""); setError(""); setInfo(""); }}
                    className="flex-1 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50 transition"
                  >
                    Back
                  </button>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div>Didn't receive the code?</div>
                  <button type="button" onClick={resendOtp} className="text-indigo-600 hover:underline">Resend</button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center text-sm text-gray-400">© {new Date().getFullYear()} salesdream. All rights reserved.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
