import { formatCurrency } from "@/lib/format";
import { useCurrency } from "@/context/CurrencyContext";

export default function StatCard({ label, valuesByCurrency = {}, accent = "default", icon: Icon, testid }) {
  const { activeCurrency, convertTotals, formatInActive } = useCurrency();
  const entries = Object.entries(valuesByCurrency).filter(([_, v]) => Number(v) !== 0);

  const accentClass =
    accent === "income"
      ? "text-income"
      : accent === "expense"
      ? "text-expense"
      : accent === "warn"
      ? "text-warn"
      : "text-foreground";

  // Calculate total converted into active display currency
  const totalInActive = convertTotals(valuesByCurrency, activeCurrency);

  return (
    <div
      className="bg-card border border-border rounded-md p-5 flex flex-col justify-between gap-3 hover:border-zinc-700 transition-colors duration-200"
      data-testid={testid}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
          {label}
        </div>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={2} />}
      </div>

      <div className="space-y-1">
        {entries.length === 0 ? (
          <div className={`font-mono text-2xl font-semibold ${accentClass}`}>
            {formatCurrency(0, activeCurrency)}
          </div>
        ) : (
          <>
            <div className={`font-mono text-2xl font-semibold ${accentClass}`}>
              {formatCurrency(totalInActive, activeCurrency)}
            </div>
            {/* If there are multiple currencies or single currency different from active */}
            {(entries.length > 1 || (entries.length === 1 && entries[0][0] !== activeCurrency)) && (
              <div className="text-[11px] font-mono text-muted-foreground truncate flex items-center gap-1.5 pt-0.5">
                {entries.map(([c, v], idx) => (
                  <span key={c}>
                    {formatCurrency(v, c)}
                    {idx < entries.length - 1 && " + "}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
