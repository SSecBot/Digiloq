import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

export function monthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function labelForMonth(key) {
  if (!key) return "Tümü";
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

function shift(key, delta) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}

export default function MonthPicker({ value, onChange, allowAll = true, testidPrefix = "month" }) {
  return (
    <div className="inline-flex items-center gap-1 bg-card border border-border rounded-md p-1">
      <button
        data-testid={`${testidPrefix}-prev`}
        aria-label="Önceki ay"
        onClick={() => onChange(shift(value || monthKey(), -1))}
        className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div
        data-testid={`${testidPrefix}-label`}
        className="px-3 py-1 flex items-center gap-2 text-sm font-medium font-mono min-w-[150px] justify-center"
      >
        <CalendarDays className="h-3.5 w-3.5 text-brand" />
        {labelForMonth(value)}
      </div>
      <button
        data-testid={`${testidPrefix}-next`}
        aria-label="Sonraki ay"
        onClick={() => onChange(shift(value || monthKey(), 1))}
        className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <div className="w-px h-5 bg-border mx-1" />
      <button
        data-testid={`${testidPrefix}-today`}
        onClick={() => onChange(monthKey())}
        className="px-2 py-1 text-xs text-muted-foreground hover:text-brand transition-colors"
      >
        Bu ay
      </button>
      {allowAll && (
        <button
          data-testid={`${testidPrefix}-all`}
          onClick={() => onChange(null)}
          className={`px-2 py-1 text-xs transition-colors ${
            !value ? "text-brand" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Tümü
        </button>
      )}
    </div>
  );
}
