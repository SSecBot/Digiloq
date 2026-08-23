import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import StatCard from "@/components/StatCard";
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  CalendarClock,
  ArrowRight,
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
  Legend,
} from "recharts";
import { formatCurrency, formatDateShort, formatDate, daysUntil } from "@/lib/format";
import { Link } from "react-router-dom";

export default function Dashboard() {
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

  const forecast = (summary?.cash_flow_forecast || []).map((d) => ({
    ...d,
    label: formatDateShort(d.date),
  }));
  const history = (summary?.cash_flow_history || []).slice(-14).map((d) => ({
    ...d,
    label: formatDateShort(d.date),
  }));

  return (
    <div className="space-y-6" data-testid="dashboard-container">
      {/* Stat grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Toplam Bakiye"
          valuesByCurrency={summary?.balances_by_currency || {}}
          icon={Wallet}
          testid="stat-total-balance"
        />
        <StatCard
          label="Bekleyen Alacaklar"
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

      {/* Chart + upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-md p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                Nakit Akış Öngörüsü · 30 Gün
              </div>
              <div className="font-display text-xl font-bold mt-1">
                Bakiye Projeksiyonu (TRY)
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
                  tickFormatter={(v) => new Intl.NumberFormat("tr-TR", { notation: "compact" }).format(v)}
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
                  formatter={(v, k) => [formatCurrency(v, "TRY"), k === "balance" ? "Bakiye" : k]}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#F5D90A"
                  strokeWidth={2}
                  fill="url(#balArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-md p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                Yaklaşan Ödemeler
              </div>
              <div className="font-display text-xl font-bold mt-1">
                14 Gün İçinde
              </div>
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
              <div className="text-sm text-muted-foreground">
                Yaklaşan ödeme yok.
              </div>
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
                        · {overdue ? `${Math.abs(d)} gün gecikti` : d === 0 ? "bugün" : `${d} gün sonra`}
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

      {/* History */}
      <div className="bg-card border border-border rounded-md p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              Son 14 Gün · TRY
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
                tickFormatter={(v) => new Intl.NumberFormat("tr-TR", { notation: "compact" }).format(v)}
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
                formatter={(v, k) => [formatCurrency(v, "TRY"), k === "income" ? "Gelir" : "Gider"]}
              />
              <Bar dataKey="income" fill="#4ADE80" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expense" fill="#F87171" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
