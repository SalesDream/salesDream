const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function normalizeEmail(email) {
  if (!email) return null;
  const trimmed = String(email).trim().toLowerCase();
  return trimmed || null;
}

function isValidEmail(email) {
  if (!email) return false;
  const value = String(email).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function extractEmails(text) {
  if (!text) return [];
  const matches = String(text).match(EMAIL_REGEX) || [];
  const out = [];
  const seen = new Set();
  for (const m of matches) {
    const normalized = normalizeEmail(m);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      out.push(normalized);
    }
  }
  return out;
}

function uniqByEmail(items) {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    const email = normalizeEmail(item.email);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push({ ...item, email });
  }
  return out;
}

function chunk(list, size = 500) {
  const out = [];
  for (let i = 0; i < list.length; i += size) {
    out.push(list.slice(i, i + size));
  }
  return out;
}

function toMysqlDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace("T", " ");
}

function renderTemplate(template, data) {
  if (!template) return "";
  return String(template).replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    if (!key) return "";
    const value = data && Object.prototype.hasOwnProperty.call(data, key) ? data[key] : "";
    return value == null ? "" : String(value);
  });
}

module.exports = {
  normalizeEmail,
  isValidEmail,
  extractEmails,
  uniqByEmail,
  chunk,
  toMysqlDateTime,
  renderTemplate,
};
