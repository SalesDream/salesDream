// src/pages/OAuthSuccess.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setAuth } from "../useAuth";

export default function OAuthSuccess() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    // Parse token & role from query string
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const role = params.get("role") || "user";

    if (!token) {
      setMessage("Authentication failed — no token received.");
      return;
    }

    try {
      // persist token + role using existing helper
      setAuth(token, role);

      // remove token from URL (so it isn't visible in history)
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);

      // optionally show a success message briefly, then redirect
      setMessage("Login successful — redirecting...");
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 700);
    } catch (err) {
      console.error("OAuth sign-in error:", err);
      setMessage("Authentication failed. Please try signing in again.");
    }
  }, [navigate]);

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full text-center">
        <h2 className="text-lg font-semibold mb-2">Signing you in</h2>
        <p className="text-sm text-gray-600">{message}</p>
        <div className="mt-6">
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-indigo-600 text-white rounded"
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}
