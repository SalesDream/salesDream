export default function Footer() {
  return (
    <footer className="h-12 border-t border-[color:var(--border-color)] bg-[color:var(--surface)] flex items-center justify-center text-xs text-[color:var(--text-muted)]">
      (c) {new Date().getFullYear()} SalesDream. All rights reserved.
    </footer>
  );
}
