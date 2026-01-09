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
import Forgot from "./pages/Forgot";
import AdminDashboard from "./pages/AdminDashboard";
import ExportedCsv from "./pages/ExportedCsv";
import ColdEmail from "./pages/ColdEmail";
import ColdEmailLists from "./pages/ColdEmailLists";
import ColdEmailContacts from "./pages/ColdEmailContacts";
import ColdEmailTemplates from "./pages/ColdEmailTemplates";
import ColdEmailCampaigns from "./pages/ColdEmailCampaigns";

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
      setAuth(token, role);
      const currentRole = localStorage.getItem("role") || role;
      if (currentRole === "admin") navigate("/admin", { replace: true });
      else navigate("/dashboard", { replace: true });
    }
  }, [params, navigate]);

  return <div className="p-6">Signing you in…</div>;
}

const SearchShell = (props) => (
  <Layout>
    <Dashboard {...props} />
  </Layout>
);

export default function App() {
  const token = useAuthToken();
  const role = useAuthRole() || "user";

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            token ? (
              <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/login"
          element={
            token ? (
              <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace />
            ) : (
              <Login />
            )
          }
        />
        <Route
          path="/signup"
          element={
            token ? (
              <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace />
            ) : (
              <Signup />
            )
          }
        />
        <Route
          path="/forgot"
          element={
            token ? (
              <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace />
            ) : (
              <Forgot />
            )
          }
        />
        <Route path="/oauth-success" element={<OAuthSuccess />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<SearchShell pageTitle="Lead Finder" />} />

          {/* Unified search experience across all entry points */}
          <Route path="/search-phone" element={<SearchShell pageTitle="Search by Phone" presetFocus="phone" showGlobalControls={false} showExportControls={false} />} />
          <Route path="/search-area-code" element={<SearchShell pageTitle="Search by Area Code" presetFocus="phone" showGlobalControls={false} showExportControls={false} />} />
          <Route path="/search-email" element={<SearchShell pageTitle="Search by Email" presetFocus="email" showGlobalControls={false} showExportControls={false} />} />
          <Route path="/search-by-email" element={<SearchShell pageTitle="Search by Email" presetFocus="email" showGlobalControls={false} showExportControls={false} />} />
          <Route path="/search-domain" element={<SearchShell pageTitle="Search by Domain" presetFocus="domain" showGlobalControls={false} showExportControls={false} />} />
          <Route path="/search-name" element={<SearchShell pageTitle="Search by Name" presetFocus="name" showGlobalControls={false} showExportControls={false} />} />
          <Route path="/settings" element={<Layout><Settings /></Layout>} />
          <Route path="/change-password" element={<Layout><ChangePassword /></Layout>} />
          <Route path="/cold-email" element={<Layout><ColdEmail /></Layout>} />
          <Route path="/cold-email/lists" element={<Layout><ColdEmailLists /></Layout>} />
          <Route path="/cold-email/contacts" element={<Layout><ColdEmailContacts /></Layout>} />
          <Route path="/cold-email/templates" element={<Layout><ColdEmailTemplates /></Layout>} />
          <Route path="/cold-email/campaigns" element={<Layout><ColdEmailCampaigns /></Layout>} />

        </Route>

        <Route element={<ProtectedRoute roles={["admin"]} />}>
          <Route path="/admin" element={<Layout><AdminDashboard /></Layout>} />
          <Route path="/exported-csv" element={<Layout><ExportedCsv /></Layout>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
