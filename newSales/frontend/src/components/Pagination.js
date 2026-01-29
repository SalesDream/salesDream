import React from "react";

export default function Pagination({ total = 0, limit = 20, offset = 0, onPageChange }) {
  if (!total || total <= limit) return null;

  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + limit, total);

  return (
    <div className="mt-3 flex items-center justify-between text-xs text-[color:var(--text-primary)]">
      <div>
        Showing <span className="font-semibold">{start}</span>-
        <span className="font-semibold">{end}</span> of{" "}
        <span className="font-semibold">{total}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-ghost disabled:opacity-50"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Prev
        </button>
        <span>
          Page <span className="font-semibold">{page}</span> of{" "}
          <span className="font-semibold">{totalPages}</span>
        </span>
        <button
          type="button"
          className="btn-ghost disabled:opacity-50"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
