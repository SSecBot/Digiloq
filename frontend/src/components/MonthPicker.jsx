import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export function monthKey(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function labelForMonth(key) {
  if (!key) return "Tümü";
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

function shift(key, delta) {
  const currentKey = key || monthKey();
  const [y, m] = currentKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}

export default function MonthPicker({ value, onChange, allowAll = true, testidPrefix = "month" }) {
  const [monthOpen, setMonthOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);

  const activeKey = value || monthKey();
  const [activeYear, activeMonthNum] = activeKey.split("-").map(Number);

  const handleSelectMonth = (monthIndex) => {
    const mStr = String(monthIndex + 1).padStart(2, "0");
    onChange(`${activeYear}-${mStr}`);
    setMonthOpen(false);
  };

  const handleSelectYear = (yr) => {
    const mStr = String(activeMonthNum).padStart(2, "0");
    onChange(`${yr}-${mStr}`);
    setYearOpen(false);
  };

  return (
    <div className="inline-flex items-center gap-1 bg-card border border-border rounded-md p-1">
      <button
        data-testid={`${testidPrefix}-prev`}
        aria-label="Önceki ay"
        onClick={() => onChange(shift(value, -1))}
        className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div
        data-testid={`${testidPrefix}-label`}
        className="px-2 py-1 flex items-center gap-1.5 text-sm font-medium font-mono min-w-[160px] justify-center"
      >
        <CalendarDays className="h-3.5 w-3.5 text-brand shrink-0" />

        {value ? (
          <div className="flex items-center gap-1">
            {/* Quick Month Picker Popover */}
            <Popover open={monthOpen} onOpenChange={setMonthOpen}>
              <PopoverTrigger asChild>
                <button
                  data-testid={`${testidPrefix}-month-select-btn`}
                  className="px-1.5 py-0.5 rounded hover:bg-secondary hover:text-brand transition-colors text-foreground"
                  title="Ay seç"
                >
                  {MONTH_NAMES[activeMonthNum - 1]}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2 bg-card border-border shadow-xl grid grid-cols-3 gap-1 z-50">
                {MONTH_NAMES.map((name, idx) => {
                  const isSelected = idx + 1 === activeMonthNum;
                  return (
                    <button
                      key={name}
                      onClick={() => handleSelectMonth(idx)}
                      data-testid={`${testidPrefix}-opt-month-${idx + 1}`}
                      className={`text-xs py-1.5 px-2 rounded-sm font-sans flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-brand text-white font-semibold"
                          : "hover:bg-secondary text-foreground/80 hover:text-foreground"
                      }`}
                    >
                      <span>{name}</span>
                      {isSelected && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>

            {/* Quick Year Picker Popover */}
            <Popover open={yearOpen} onOpenChange={setYearOpen}>
              <PopoverTrigger asChild>
                <button
                  data-testid={`${testidPrefix}-year-select-btn`}
                  className="px-1.5 py-0.5 rounded hover:bg-secondary hover:text-brand transition-colors text-foreground"
                  title="Yıl seç"
                >
                  {activeYear}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-2 bg-card border-border shadow-xl grid grid-cols-2 gap-1 z-50">
                {YEARS.map((yr) => {
                  const isSelected = yr === activeYear;
                  return (
                    <button
                      key={yr}
                      onClick={() => handleSelectYear(yr)}
                      data-testid={`${testidPrefix}-opt-year-${yr}`}
                      className={`text-xs py-1.5 px-2 rounded-sm font-mono flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-brand text-white font-semibold"
                          : "hover:bg-secondary text-foreground/80 hover:text-foreground"
                      }`}
                    >
                      <span>{yr}</span>
                      {isSelected && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <span className="text-muted-foreground">Tümü</span>
        )}
      </div>

      <button
        data-testid={`${testidPrefix}-next`}
        aria-label="Sonraki ay"
        onClick={() => onChange(shift(value, 1))}
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
            !value ? "text-brand font-semibold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Tümü
        </button>
      )}
    </div>
  );
}
