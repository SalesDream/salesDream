// src/App.js
import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import ChangePassword from "./pages/ChangePassword";
import Signup from "./pages/Signup";
import Layout from "./Layout";
import NotFound from "./pages/NotFound";
import { useAuthToken, useAuthRole, setAuth } from "./useAuth";
import SearchByEmail from "./pages/SearchByEmail";
import SearchByPhone from "./pages/SearchByPhone";
import SearchByName from "./pages/SearchByName";
import SearchByDomain from "./pages/SearchByDomain";
import Forgot from "./pages/Forgot";
import AdminDashboard from "./pages/AdminDashboard"; // new admin page

function ProtectedRoute({ roles }) {
  const token = useAuthToken();
  const role = useAuthRole() || "user";
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (roles && !roles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

function OAuthSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get("token");
    const role = params.get("role") || "user";
    if (token) {
      // persist auth and navigate based on persisted role
      setAuth(token, role);
      const currentRole = localStorage.getItem("role") || role;
      if (currentRole === "admin") navigate("/admin", { replace: true });
      else navigate("/dashboard", { replace: true });
    }
  }, [params, navigate]);

  return <div className="p-6">Signing you in…</div>;
}

export default function App() {
  const token = useAuthToken();
  const role = useAuthRole() || "user";

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={token ? <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace /> : <Navigate to="/login" replace />}
        />

        <Route path="/login" element={token ? <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace /> : <Login />} />
        <Route path="/signup" element={token ? <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace /> : <Signup />} />
        <Route path="/forgot" element={token ? <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace /> : <Forgot />} />
        <Route path="/oauth-success" element={<OAuthSuccess />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />

          <Route path="/search-phone" element={<Layout><SearchByPhone /></Layout>} />
          <Route path="/search-area-code" element={<Layout><NotFound /></Layout>} />
          <Route path="/search-email" element={<Layout><SearchByEmail /></Layout>} />
          <Route path="/search-by-email" element={<Layout><SearchByEmail /></Layout>} />
          <Route path="/search-domain" element={<Layout><SearchByDomain /></Layout>} />
          <Route path="/search-name" element={<Layout><SearchByName /></Layout>} />
          <Route path="/settings" element={<Layout><Settings /></Layout>} />
          <Route path="/change-password" element={<Layout><ChangePassword /></Layout>} />
        </Route>

        {/* Admin protected route */}
        <Route element={<ProtectedRoute roles={["admin"]} />}>
          <Route path="/admin" element={<Layout><AdminDashboard /></Layout>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
