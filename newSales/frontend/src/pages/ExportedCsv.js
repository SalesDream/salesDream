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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200];

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

  // Reset to first page whenever the file list changes
  useEffect(() => {
    setPage(1);
  }, [files]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((files.length || 0) / pageSize)),
    [files.length, pageSize]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedFiles = useMemo(() => {
    const start = (page - 1) * pageSize;
    return files.slice(start, start + pageSize);
  }, [files, page, pageSize]);

  const rangeStart = files.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, files.length);

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
    <div className="p-4 text-[color:var(--text-primary)]">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[color:var(--text-primary)]" />
          <h1 className="text-lg font-semibold">Exported CSV</h1>
          <span className="text-xs text-[color:var(--text-muted)]">({files.length})</span>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[color:var(--border-color)] bg-[color:var(--surface)] text-sm ${
            loading ? "opacity-60 cursor-not-allowed" : "hover:bg-[color:var(--surface-muted)]"
          }`}
          type="button"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {err ? (
        <div className="mb-3 text-sm text-red-500 bg-red-500/10 border border-red-400/40 rounded-md px-3 py-2">
          {err}
        </div>
      ) : null}

      <div className="sd-table-wrap shadow-sm">
        <div className="overflow-x-auto">
          <table className="sd-table min-w-[860px] w-full">
            <thead>
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
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-[color:var(--text-muted)]">
                    Loading...
                  </td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-[color:var(--text-muted)]">
                    No exported CSV files found.
                  </td>
                </tr>
              ) : (
                paginatedFiles.map((f) => (
                  <tr key={f.filename}>
                    <td className="px-3 py-2 text-sm">
                      <div className="font-medium">{f.filename}</div>
                    </td>
                    <td className="px-3 py-2 text-sm text-[color:var(--text-primary)]">
                      {formatDate(f.exportedAt)}
                    </td>
                    <td className="px-3 py-2 text-sm text-[color:var(--text-primary)]">
                      {formatBytes(f.sizeBytes)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => download(f.filename)}
                          disabled={busyName === f.filename}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[color:var(--border-color)] bg-[color:var(--surface)] text-sm ${
                            busyName === f.filename
                              ? "opacity-60 cursor-not-allowed"
                              : "hover:bg-[color:var(--surface-muted)]"
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
                              ? "opacity-60 cursor-not-allowed bg-[color:var(--surface)]"
                              : "bg-[color:var(--surface)] hover:bg-red-500/10 text-red-500 border-red-400/60"
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

      {/* Pagination */}
      {files.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 bg-[color:var(--surface)] border border-[color:var(--border-color)] rounded-lg px-3 py-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[color:var(--text-muted)]">Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 text-xs rounded-md border border-[color:var(--border-color)] bg-[color:var(--surface-muted)] text-[color:var(--text-primary)] px-2"
              >
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-[color:var(--text-muted)]">
              Showing {rangeStart} - {rangeEnd} of {files.length}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1 rounded-md border border-[color:var(--border-color)] bg-[color:var(--surface)] text-[color:var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              Prev
            </button>
            <div className="text-sm text-[color:var(--text-primary)] px-2">
              Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1 rounded-md border border-[color:var(--border-color)] bg-[color:var(--surface)] text-[color:var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-[color:var(--text-muted)]">
        Tip: Files are stored on the backend in the <code className="px-1 py-0.5 bg-[color:var(--surface-muted)] rounded">/exports</code> folder.
      </div>
    </div>
  );
}
