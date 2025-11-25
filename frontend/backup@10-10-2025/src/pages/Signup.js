import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";

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
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={submit} className="bg-white p-6 rounded-2xl shadow w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold text-center">Create account</h1>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input className="w-full border rounded px-3 py-2" value={name} onChange={e=>setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input className="w-full border rounded px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input type="password" className="w-full border rounded px-3 py-2" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        <button className="w-full bg-black text-white rounded py-2">Sign up</button>
        <p className="text-sm text-center">Have an account? <Link to="/login" className="text-blue-600">Login</Link></p>
      </form>
    </div>
  );
}
