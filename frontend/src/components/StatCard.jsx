import { formatCurrency } from "@/lib/format";

export default function StatCard({ label, valuesByCurrency = {}, accent = "default", icon: Icon, testid }) {
  const currencies = Object.keys(valuesByCurrency);
  const accentClass =
    accent === "income"
      ? "text-income"
      : accent === "expense"
      ? "text-expense"
      : accent === "warn"
      ? "text-warn"
      : "text-foreground";

  return (
    <div
      className="bg-card border border-border rounded-md p-5 flex flex-col gap-3 hover:border-zinc-700 transition-colors duration-200"
      data-testid={testid}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
          {label}
        </div>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={2} />}
      </div>
      <div className="space-y-1.5">
        {currencies.length === 0 ? (
          <div className={`font-mono text-2xl font-semibold ${accentClass}`}>—</div>
        ) : (
          currencies.map((cur) => (
            <div key={cur} className="flex items-baseline justify-between gap-3">
              <span className={`font-mono text-2xl font-semibold ${accentClass}`}>
                {formatCurrency(valuesByCurrency[cur], cur)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
