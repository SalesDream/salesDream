// src/pages/Settings.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Settings page
 *
 * Simple placeholder page that displays "In progress" (like a 404-style placeholder)
 * and a "Go back" button which navigates to the previous page.
 *
 * Usage: add a route to this component (e.g. <Route path="/settings" element={<Settings />} />)
 */

export default function Settings() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white border rounded-2xl shadow-lg p-8 text-center">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
          <p className="mt-2 text-sm text-slate-500">This page is currently</p>
        </div>

        <div className="my-6">
          <div className="inline-flex items-center justify-center w-40 h-40 rounded-full bg-sky-100 border border-sky-200">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-sky-600">
              <path d="M12 2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 18v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.93 4.93l2.83 2.83" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16.24 16.24l2.83 2.83" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18 12h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.93 19.07l2.83-2.83" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h2 className="mt-4 text-lg font-medium text-slate-800">In progress</h2>
          <p className="mt-2 text-sm text-slate-500">
            We're working on this — check back soon. If you arrived here by mistake, you can go back.
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
