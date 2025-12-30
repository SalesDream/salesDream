// src/pages/ExportedCsv.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import { Download, Trash2, RefreshCw, FileText } from "lucide-react";
import { useAuthToken } from "../useAuth";

function formatBytes(bytes) {
  const b = Number(bytes || 0);
  if (b < 1024) return `${b} B`;
  const kb = b / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

function formatDate(ms) {
  if (!ms) return "--";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString();
}

export default function ExportedCsv() {
  const token = useAuthToken();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyName, setBusyName] = useState("");
  const [err, setErr] = useState("");

  const headers = useMemo(() => {
    const t = token || localStorage.getItem("token") || "";
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [token]);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/api/export/files", { headers });
      setFiles(res?.data?.files || []);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load exports");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    
  }, []);

  const download = async (filename) => {
    if (!filename) return;
    setBusyName(filename);
    setErr("");
    try {
      const res = await api.get(`/api/export/file/${encodeURIComponent(filename)}`, {
        headers,
        responseType: "blob",
      });

      const blob = res.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 8000);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Download failed");
    } finally {
      setBusyName("");
    }
  };

  const remove = async (filename) => {
    if (!filename) return;
    const ok = window.confirm(`Delete export?\n\n${filename}`);
    if (!ok) return;

    setBusyName(filename);
    setErr("");
    try {
      await api.delete(`/api/export/files/${encodeURIComponent(filename)}`, { headers });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Delete failed");
    } finally {
      setBusyName("");
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-700" />
          <h1 className="text-lg font-semibold text-slate-800">Exported CSV</h1>
          <span className="text-xs text-slate-500">({files.length})</span>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-white text-sm ${
            loading ? "opacity-60 cursor-not-allowed" : "hover:bg-slate-50"
          }`}
          type="button"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {err ? (
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {err}
        </div>
      ) : null}

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-[860px] w-full">
            <thead className="bg-[#deeff7ff] text-slate-800">
              <tr>
                <th className="text-left text-xs font-semibold px-3 py-2">CSV Name</th>
                <th className="text-left text-xs font-semibold px-3 py-2">Exported Date</th>
                <th className="text-left text-xs font-semibold px-3 py-2">Size</th>
                <th className="text-right text-xs font-semibold px-3 py-2">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">
                    No exported CSV files found.
                  </td>
                </tr>
              ) : (
                files.map((f) => (
                  <tr key={f.filename} className="border-t">
                    <td className="px-3 py-2 text-sm text-slate-800">
                      <div className="font-medium">{f.filename}</div>
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-700">
                      {formatDate(f.exportedAt)}
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-700">
                      {formatBytes(f.sizeBytes)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => download(f.filename)}
                          disabled={busyName === f.filename}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-white text-sm ${
                            busyName === f.filename
                              ? "opacity-60 cursor-not-allowed"
                              : "hover:bg-slate-50"
                          }`}
                          type="button"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>

                        <button
                          onClick={() => remove(f.filename)}
                          disabled={busyName === f.filename}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm ${
                            busyName === f.filename
                              ? "opacity-60 cursor-not-allowed bg-white"
                              : "bg-white hover:bg-red-50 text-red-600 border-red-200"
                          }`}
                          type="button"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Tip: Files are stored on the backend in the <code className="px-1 py-0.5 bg-slate-100 rounded">/exports</code> folder.
      </div>
    </div>
  );
}
