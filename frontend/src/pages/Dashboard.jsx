import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import StatCard from "@/components/StatCard";
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  ArrowRight,
  ListTodo,
  TrendingUp,
  TrendingDown,
  Flame,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { formatCurrency, formatDateShort, formatDate, daysUntil } from "@/lib/format";
import { useCurrency } from "@/context/CurrencyContext";
import { Link } from "react-router-dom";
import { MONTH_NAMES } from "@/components/MonthPicker";

export default function Dashboard() {
  const { activeCurrency, convert, formatInActive } = useCurrency();
  const [summary, setSummary] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [s, u] = await Promise.all([
        api.get("/dashboard/summary"),
        api.get("/upcoming-payments?days=14"),
      ]);
      setSummary(s.data);
      setUpcoming(u.data);
    } catch (e) {
      toast.error("Veriler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <div className="text-muted-foreground text-sm">Yükleniyor…</div>;
  }

  // Forecast data converted to active currency
  const forecast = (summary?.cash_flow_forecast || []).map((d) => {
    const balanceConverted = convert(d.balance, "TRY", activeCurrency);
    return {
      ...d,
      convertedBalance: balanceConverted,
      label: formatDateShort(d.date),
    };
  });

  // History data converted to active currency
  const history = (summary?.cash_flow_history || []).slice(-14).map((d) => {
    const incConverted = convert(d.income, "TRY", activeCurrency);
    const expConverted = convert(d.expense, "TRY", activeCurrency);
    return {
      ...d,
      convertedIncome: incConverted,
      convertedExpense: expConverted,
      label: formatDateShort(d.date),
    };
  });

  const monthlyPending = summary?.monthly_pending || [];
  const taskSummary = summary?.task_summary || {
    pending: 0,
    in_progress: 0,
    approved: 0,
    completed: 0,
    overdue: 0,
    total: 0,
  };

  return (
    <div className="space-y-6" data-testid="dashboard-container">
      {/* Stat grid with dynamic currency conversion */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Toplam Bakiye"
          valuesByCurrency={summary?.balances_by_currency || {}}
          icon={Wallet}
          testid="stat-total-balance"
        />
        <StatCard
          label="Bekleyen Gelirler"
          valuesByCurrency={summary?.pending_receivables_by_currency || {}}
          accent="income"
          icon={ArrowDownToLine}
          testid="stat-pending-receivables"
        />
        <StatCard
          label="Bekleyen Giderler"
          valuesByCurrency={summary?.pending_expenses_by_currency || {}}
          accent="expense"
          icon={ArrowUpFromLine}
          testid="stat-pending-expenses"
        />
        <StatCard
          label="Vadesi Geçmiş"
          valuesByCurrency={summary?.overdue_by_currency || {}}
          accent="warn"
          icon={AlertTriangle}
          testid="stat-overdue"
        />
      </div>

      {/* Monthly Pending Cashflow Breakdown Widget */}
      <div className="bg-card border border-border rounded-md p-5" data-testid="monthly-cashflow-widget">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              Aylık Bekleyen Nakit Akışı
            </div>
            <div className="font-display text-xl font-bold mt-1">
              Gelecek 12 Ay Projeksiyonu ({activeCurrency})
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-income" /> Bekleyen Gelir
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-expense" /> Bekleyen Gider
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
              Net Beklenti
            </span>
          </div>
        </div>

        {/* Responsive Month-by-Month Projection Scroll Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
          {monthlyPending.slice(0, 6).map((m) => {
            let totalInc = 0;
            for (const [cur, amt] of Object.entries(m.incomes_by_currency || {})) {
              totalInc += convert(amt, cur, activeCurrency);
            }
            let totalExp = 0;
            for (const [cur, amt] of Object.entries(m.expenses_by_currency || {})) {
              totalExp += convert(amt, cur, activeCurrency);
            }
            const net = totalInc - totalExp;
            const monthLabel = `${MONTH_NAMES[m.month_num - 1]} ${m.year}`;

            return (
              <div
                key={m.month}
                className="bg-[#16181d] border border-border/80 rounded-md p-3.5 flex flex-col justify-between gap-2 hover:border-zinc-700 transition-colors"
                data-testid={`month-pending-${m.month}`}
              >
                <div className="font-medium text-xs text-foreground/90 border-b border-border/50 pb-1.5 flex items-center justify-between">
                  <span>{monthLabel}</span>
                  {net >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-income" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-expense" />
                  )}
                </div>

                <div className="space-y-1 text-xs font-mono">
                  <div className="flex items-center justify-between text-income">
                    <span className="text-[10px] text-muted-foreground font-sans">Gelir:</span>
                    <span>+{formatCurrency(totalInc, activeCurrency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-expense">
                    <span className="text-[10px] text-muted-foreground font-sans">Gider:</span>
                    <span>−{formatCurrency(totalExp, activeCurrency)}</span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-xs font-mono font-semibold">
                  <span className="text-[10px] text-muted-foreground font-sans uppercase">Net:</span>
                  <span className={net >= 0 ? "text-income" : "text-expense"}>
                    {net >= 0 ? "+" : ""}
                    {formatCurrency(net, activeCurrency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workflow Summary Widget + Forecast Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Forecast Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-md p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                Nakit Akış Öngörüsü · 30 Gün
              </div>
              <div className="font-display text-xl font-bold mt-1">
                Bakiye Projeksiyonu ({activeCurrency})
              </div>
            </div>
          </div>
          <div className="h-72" data-testid="chart-forecast">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecast} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="balArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F5D90A" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#F5D90A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#27272a" strokeDasharray="0" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#71717a"
                  tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }}
                  tickLine={false}
                  axisLine={{ stroke: "#27272a" }}
                />
                <YAxis
                  stroke="#71717a"
                  tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }}
                  tickLine={false}
                  axisLine={{ stroke: "#27272a" }}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat("tr-TR", { notation: "compact" }).format(v)
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: 6,
                    fontFamily: "IBM Plex Mono",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#a1a1aa" }}
                  formatter={(v) => [formatCurrency(v, activeCurrency), "Bakiye"]}
                />
                <Area
                  type="monotone"
                  dataKey="convertedBalance"
                  stroke="#F5D90A"
                  strokeWidth={2}
                  fill="url(#balArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workflow / Kanban Widget */}
        <div className="bg-card border border-border rounded-md p-5 flex flex-col justify-between" data-testid="workflow-widget">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                  İş Akışı Özeti
                </div>
                <div className="font-display text-xl font-bold mt-1">
                  Kanban Aşamaları
                </div>
              </div>
              <Link
                to="/is-akisi"
                data-testid="dashboard-goto-workflow"
                className="text-xs text-muted-foreground hover:text-brand transition-colors inline-flex items-center gap-1"
              >
                Panoya Git <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-[#16181d] border border-border rounded-md p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" /> Beklemede
                </div>
                <div className="font-mono text-2xl font-semibold mt-1">
                  {taskSummary.pending}
                </div>
              </div>

              <div className="bg-[#16181d] border border-brand/30 rounded-md p-3">
                <div className="flex items-center gap-2 text-xs text-brand">
                  <Flame className="h-3.5 w-3.5 text-brand" /> İşlemde
                </div>
                <div className="font-mono text-2xl font-semibold mt-1 text-brand">
                  {taskSummary.in_progress}
                </div>
              </div>

              <div className="bg-[#16181d] border border-blue-500/30 rounded-md p-3">
                <div className="flex items-center gap-2 text-xs text-blue-400">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" /> Onaylandı
                </div>
                <div className="font-mono text-2xl font-semibold mt-1 text-blue-400">
                  {taskSummary.approved}
                </div>
              </div>

              <div className="bg-[#16181d] border border-income/30 rounded-md p-3">
                <div className="flex items-center gap-2 text-xs text-income">
                  <CheckCircle2 className="h-3.5 w-3.5 text-income" /> Tamamlandı
                </div>
                <div className="font-mono text-2xl font-semibold mt-1 text-income">
                  {taskSummary.completed}
                </div>
              </div>
            </div>

            {taskSummary.overdue > 0 && (
              <div className="mt-3 p-2.5 rounded-md bg-expense/10 border border-expense/30 flex items-center justify-between text-xs">
                <span className="text-expense font-medium flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-expense" />
                  {taskSummary.overdue} Gecikmiş Görev (Yüksek Öncelik)
                </span>
                <Link
                  to="/is-akisi"
                  className="text-expense hover:underline font-semibold"
                >
                  İncele →
                </Link>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <span>Toplam {taskSummary.total} aktif iş akışı kartı</span>
            <Link to="/is-akisi" className="text-brand hover:underline">
              Görev Ekle +
            </Link>
          </div>
        </div>
      </div>

      {/* Upcoming Payments + History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Realized Income vs Expense History */}
        <div className="lg:col-span-2 bg-card border border-border rounded-md p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                Son 14 Gün · {activeCurrency}
              </div>
              <div className="font-display text-xl font-bold mt-1">
                Gerçekleşen Gelir vs Gider
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-income" /> Gelir
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-expense" /> Gider
              </span>
            </div>
          </div>
          <div className="h-64" data-testid="chart-history">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#71717a"
                  tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }}
                  tickLine={false}
                  axisLine={{ stroke: "#27272a" }}
                />
                <YAxis
                  stroke="#71717a"
                  tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }}
                  tickLine={false}
                  axisLine={{ stroke: "#27272a" }}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat("tr-TR", { notation: "compact" }).format(v)
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: 6,
                    fontFamily: "IBM Plex Mono",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#a1a1aa" }}
                  formatter={(v, k) => [
                    formatCurrency(v, activeCurrency),
                    k === "convertedIncome" ? "Gelir" : "Gider",
                  ]}
                />
                <Bar dataKey="convertedIncome" fill="#4ADE80" radius={[3, 3, 0, 0]} />
                <Bar dataKey="convertedExpense" fill="#F87171" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming 14-day payments */}
        <div className="bg-card border border-border rounded-md p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                Yaklaşan Ödemeler
              </div>
              <div className="font-display text-xl font-bold mt-1">14 Gün İçinde</div>
            </div>
            <Link
              to="/payments"
              data-testid="dashboard-see-all-payments"
              className="text-xs text-muted-foreground hover:text-brand transition-colors inline-flex items-center gap-1"
            >
              Tümü <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2 flex-1 overflow-auto max-h-80 pr-1">
            {upcoming.length === 0 && (
              <div className="text-sm text-muted-foreground">Yaklaşan ödeme yok.</div>
            )}
            {upcoming.map((p) => {
              const d = daysUntil(p.date);
              const overdue = d < 0;
              return (
                <div
                  key={`${p.type}-${p.id}`}
                  className="flex items-center gap-3 border border-border rounded-md p-3 hover:bg-secondary/60 transition-colors"
                  data-testid={`upcoming-${p.type}-${p.id}`}
                >
                  <div
                    className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${
                      p.type === "receivable"
                        ? "bg-income/10 text-income"
                        : "bg-expense/10 text-expense"
                    }`}
                  >
                    {p.type === "receivable" ? (
                      <ArrowDownToLine className="h-4 w-4" />
                    ) : (
                      <ArrowUpFromLine className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{p.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatDate(p.date)}{" "}
                      <span className={overdue ? "text-expense" : ""}>
                        ·{" "}
                        {overdue
                          ? `${Math.abs(d)} gün gecikti`
                          : d === 0
                          ? "bugün"
                          : `${d} gün sonra`}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`font-mono text-sm font-semibold ${
                      p.type === "receivable" ? "text-income" : "text-expense"
                    }`}
                  >
                    {p.type === "receivable" ? "+" : "−"}
                    {formatCurrency(p.amount, p.currency)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
