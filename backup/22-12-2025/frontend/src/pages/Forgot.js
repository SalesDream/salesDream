// src/pages/Forgot.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import banner from "../assets/Logo.png";
import AppLogo from "../components/AppLogo";

export default function Forgot() {
  const [phase, setPhase] = useState(1); // 1 = request OTP, 2 = verify OTP, 3 = set new password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Phase 1: request OTP
  const requestOtp = async (e) => {
    e?.preventDefault();
    setError(""); setInfo("");
    if (!email) return setError("Enter your email");
    setLoading(true);
    try {
      await api.post("/api/auth/forgot-request", { email });
      setInfo("OTP sent to your email. Check inbox (and spam).");
      setPhase(2);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // Phase 2: verify OTP only
  const verifyOtpOnly = async (e) => {
    e?.preventDefault();
    setError(""); setInfo("");
    if (!otp) return setError("Enter the OTP");
    setLoading(true);
    try {
      await api.post("/api/auth/forgot-verify-otp", { email, otp });
      setInfo("OTP verified. Please set your new password.");
      setPhase(3);
    } catch (err) {
      setError(err?.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  // Phase 3: submit new password (and confirm)
  const submitNewPassword = async (e) => {
    e?.preventDefault();
    setError(""); setInfo("");
    if (!newPassword || !confirmPassword) return setError("Enter and confirm new password");
    if (newPassword !== confirmPassword) return setError("Passwords do not match");
    if (newPassword.length < 6) return setError("Password must be at least 6 characters");

    setLoading(true);
    try {
      await api.post("/api/auth/forgot-reset", { email, otp, newPassword });
      setInfo("Password reset successfully. A confirmation email has been sent.");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err?.response?.data?.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP (calls requestOtp again)
  const resendOtp = async () => {
    setError(""); setInfo("");
    try {
      await api.post("/api/auth/forgot-request", { email });
      setInfo("OTP resent to your email.");
      setPhase(2);
    } catch (err) {
      setError(err?.response?.data?.message || "Resend failed");
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-sky-100 to-indigo-50 p-6">
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
          <div className="absolute left-0 bottom-4 w-full text-center px-6 text-gray" style={{ top:250}}>
            <h2 className="text-lg font-semibold mb-2 drop-shadow-lg">Forgot your password?</h2>
            <p className="text-gray/90 text-sm mb-3 leading-relaxed drop-shadow-sm">Don’t worry! Enter your email and we’ll send a verification code to reset it.</p>
          </div>
        </div>

        <div className="p-6 md:p-10 bg-white flex items-center">
          <div className="w-full max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <AppLogo size={40} text="Reset your password" subtitle="Follow the steps to reset your password" />
              {/* <div className="w-10 h-10 flex items-center justify-center">

                <img src={logo2} alt="salesdream" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-800">Reset your password</h1>
                <div className="text-xs text-gray-400">Follow the steps to reset your password</div>
              </div> */}
            </div>

            {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 p-2 rounded mb-3">{error}</div>}
            {info && <div className="text-sm text-sky-700 bg-sky-50 border border-sky-100 p-2 rounded mb-3">{info}</div>}

            {phase === 1 && (
              <form onSubmit={requestOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400" />
                </div>

                <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium shadow-sm transition">
                  {loading ? "Sending…" : "Send OTP"}
                </button>

                <div className="text-sm text-center mt-2">
                  <Link to="/login" className="text-indigo-600 hover:underline">Back to login</Link>
                </div>
              </form>
            )}

            {phase === 2 && (
              <form onSubmit={verifyOtpOnly} className="space-y-4">
                <div>
                  <div className="text-sm text-slate-600 mb-1">OTP sent to <b>{email}</b></div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OTP</label>
                  <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter 6-digit code" required className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400" />
                </div>

                <div className="flex gap-2">
                  <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium shadow-sm transition">{loading ? "Verifying…" : "Verify OTP"}</button>
                  <button type="button" onClick={() => setPhase(1)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50 transition">Back</button>
                </div>

                <div className="flex justify-between text-sm text-gray-500">
                  <button type="button" onClick={resendOtp} className="text-indigo-600 hover:underline">Resend OTP</button>
                </div>
              </form>
            )}

            {phase === 3 && (
              <form onSubmit={submitNewPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Create new password" required className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" required className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400" />
                </div>

                <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium shadow-sm transition">{loading ? "Resetting…" : "Verify & Reset"}</button>

                <div className="flex justify-between text-sm text-gray-500">
                  <button type="button" onClick={() => setPhase(2)} className="hover:underline">Back</button>
                  <button type="button" onClick={resendOtp} className="text-indigo-600 hover:underline">Resend OTP</button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center text-sm text-gray-400">© {new Date().getFullYear()} SalesDream. All rights reserved.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
