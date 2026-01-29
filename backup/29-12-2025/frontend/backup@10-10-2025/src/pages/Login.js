import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import { setAuth } from "../useAuth";

const API_URL = process.env.REACT_APP_API_URL || "https://28c4e5633a2c.ngrok-free.app";
console.log(process.env.REACT_APP_API_URL);

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
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={submit} className="bg-white p-6 rounded-2xl shadow w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold text-center">SalesDream Login</h1>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input className="w-full border rounded px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input type="password" className="w-full border rounded px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="w-full bg-black text-white rounded py-2">Sign in</button>

        <div className="flex items-center gap-2">
          <div className="h-px bg-gray-200 flex-1" />
          <div className="text-xs text-gray-500">OR</div>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        <button type="button" onClick={googleLogin} className="w-full border rounded py-2 hover:bg-gray-50">
          Continue with Google
        </button>

        <p className="text-sm text-center">
          No account? <Link to="/signup" className="text-blue-600">Sign up</Link>
        </p>
      </form>
    </div>
  );
}
