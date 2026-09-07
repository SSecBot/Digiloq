export const CURRENCY_SYMBOLS = { TRY: "₺", USD: "$", EUR: "€" };

export function formatCurrency(amount, currency = "TRY") {
  const value = Number(amount || 0);
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function formatNumber(amount) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));
}

/**
 * Parse an ISO date string (e.g. "2026-09-15" or "2026-09-15T00:00:00") into a local Date
 * avoiding UTC midnight conversion shift (+1 / -1 day bug).
 */
export function parseLocalDate(iso) {
  if (!iso) return new Date();
  if (iso instanceof Date) return iso;
  const str = String(iso).slice(0, 10);
  const parts = str.split("-").map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  }
  return new Date(iso);
}

export function toLocalIsoDate(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDate(iso) {
  if (!iso) return "-";
  const d = parseLocalDate(iso);
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateShort(iso) {
  if (!iso) return "-";
  const d = parseLocalDate(iso);
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
  }).format(d);
}

export function daysUntil(iso) {
  if (!iso) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = parseLocalDate(iso);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
