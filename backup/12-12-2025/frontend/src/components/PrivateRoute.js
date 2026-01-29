// src/components/PrivateRoute.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthToken, useAuthRole } from "../useAuth";

/**
 * PrivateRoute acts as a wrapper using react-router v6 Outlet.
 * - roles: optional array of allowed roles, e.g. ['admin']
 *
 * Usage:
 * <Route element={<PrivateRoute roles={['admin']} />}>
 *   <Route path="/admin" element={<AdminDashboard />} />
 * </Route>
 */
export default function PrivateRoute({ roles = null }) {
  const token = useAuthToken();
  const role = useAuthRole() || "user";
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && Array.isArray(roles) && !roles.includes(role)) {
    // Logged-in but not authorized for this route
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
