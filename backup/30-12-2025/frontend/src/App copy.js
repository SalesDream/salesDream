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
import NotFound from "./pages/NotFound"; // ⬅️ 404 page
import { useAuthToken, setAuth } from "./useAuth";
import SimpleSearch from "./pages/SimpleSearch";


function ProtectedRoute({ roles }) {
  const token = useAuthToken();
  const role = localStorage.getItem("role") || "user";
  const location = useLocation();

  // Not logged in → go to login (remember intended path)
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  // Logged in but wrong role → go to dashboard
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
      setAuth(token, role);
      navigate("/dashboard", { replace: true });
    }
  }, [params, navigate]);

  return <div className="p-6">Signing you in…</div>;
}

export default function App() {
  const token = useAuthToken();

  return (
    <BrowserRouter>
      <Routes>
        {/* Root → dashboard if logged in, else login */}
        <Route
          path="/"
          element={
            token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
          }
        />

        {/* Public routes: visible only when NOT logged in */}
        <Route
          path="/login"
          element={token ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/signup"
          element={token ? <Navigate to="/dashboard" replace /> : <Signup />}
        />
        <Route path="/oauth-success" element={<OAuthSuccess />} />

        {/* Protected routes (require token) */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/dashboard"
            element={
              <Layout>
                <Dashboard />
              </Layout>
              
            }
          />
          {/* New simple search pages (no filters) */}
<Route path="/search-phone" element={<Layout><SimpleSearch /></Layout>} />
<Route path="/search-area-code" element={<Layout><SimpleSearch /></Layout>} />
<Route path="/search-email" element={<Layout><SimpleSearch /></Layout>} />
<Route path="/search-domain" element={<Layout><SimpleSearch /></Layout>} />
<Route path="/search-name" element={<Layout><SimpleSearch /></Layout>} />
        </Route>

        {/* Admin-only (require token + role) */}
        <Route element={<ProtectedRoute roles={["admin"]} />}>
          <Route
            path="/settings"
            element={
              <Layout>
                <Settings />
              </Layout>
            }
          />
          <Route
            path="/change-password"
            element={
              <Layout>
                <ChangePassword />
              </Layout>
            }
          />
        </Route>

        {/* 404 Page Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
