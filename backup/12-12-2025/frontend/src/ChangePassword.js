// src/pages/ChangePassword.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Key } from "lucide-react";

/**
 * ChangePassword page
 *
 * Placeholder page that displays "In progress" (same style as Settings)
 * and a "Go back" button which navigates to the previous page.
 *
 * Usage: add a route to this component (e.g. <Route path="/change-password" element={<ChangePassword />} />)
 */

export default function ChangePassword() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white border rounded-2xl shadow-lg p-8 text-center">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-slate-900">Change Password</h1>
          <p className="mt-2 text-sm text-slate-500">This feature is currently</p>
        </div>

        <div className="my-6">
          <div className="inline-flex items-center justify-center w-40 h-40 rounded-full bg-sky-100 border border-sky-200">
            <Key className="w-12 h-12 text-sky-600" />
          </div>

          <h2 className="mt-4 text-lg font-medium text-slate-800">In progress</h2>
          <p className="mt-2 text-sm text-slate-500">
            We're working on the change password flow — check back soon. If you reached this page unexpectedly you can go back.
          </p>
        </div>

        <div className="mt-4 flex justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border bg-white text-sm text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>

          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-sky-600 text-sm text-white hover:bg-sky-700"
          >
            Home
          </button>
        </div>

        <div className="mt-4 text-xs text-slate-400">If you think this is an error, contact support.</div>
      </div>
    </div>
  );
}
