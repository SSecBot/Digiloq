import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Bell, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, CheckCircle2 } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { formatCurrency, formatDate, daysUntil } from "@/lib/format";
import { toast } from "sonner";

export default function NotificationBell({ tick }) {
  const [receivables, setReceivables] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    try {
      const [r, e] = await Promise.all([
        api.get("/receivables"),
        api.get("/expenses"),
      ]);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setReceivables(r.data.filter((x) => x.status === "overdue"));
      setExpenses(
        e.data.filter((x) => {
          if (x.status === "paid") return false;
          const d = new Date(x.date);
          d.setHours(0, 0, 0, 0);
          return d < today;
        })
      );
    } catch {
      /* silent */
    }
  };

  useEffect(() => { load(); }, [tick]);

  const total = receivables.length + expenses.length;

  const closeReceivable = async (id) => {
    try {
      await api.post(`/receivables/${id}/mark-paid`);
      toast.success("Tahsil edildi olarak işaretlendi");
      load();
    } catch { toast.error("İşlem başarısız"); }
  };
  const closeExpense = async (id) => {
    try {
      await api.post(`/expenses/${id}/mark-paid`);
      toast.success("Ödendi olarak işaretlendi");
      load();
    } catch { toast.error("İşlem başarısız"); }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          data-testid="notification-bell"
          aria-label="Bildirimler"
          className="relative p-2 rounded-md border border-border hover:border-brand hover:text-brand transition-colors text-muted-foreground"
        >
          <Bell className="h-4 w-4" />
          {total > 0 && (
            <span
              data-testid="notification-badge"
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-expense text-white text-[10px] font-bold font-mono flex items-center justify-center border border-background"
            >
              {total > 99 ? "99+" : total}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[380px] bg-card border-border p-0"
        data-testid="notification-panel"
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              Bildirimler
            </div>
            <div className="font-display text-base font-bold mt-0.5">
              Vadesi Geçen Kalemler
            </div>
          </div>
          <div className={`text-xs font-mono ${total > 0 ? "text-expense" : "text-muted-foreground"}`}>
            {total} kayıt
          </div>
        </div>
        <div className="max-h-[420px] overflow-auto">
          {total === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <div className="h-10 w-10 rounded-md bg-income/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-income" />
              </div>
              Her şey yolunda — vadesi geçen kalem yok.
            </div>
          )}
          {receivables.length > 0 && (
            <div className="p-3 space-y-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold flex items-center gap-1.5 px-1">
                <ArrowDownToLine className="h-3 w-3" /> Tahsil Edilemedi
              </div>
              {receivables.map((r) => {
                const d = daysUntil(r.due_date);
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 border border-border rounded-md p-2.5 hover:bg-secondary/50 transition-colors"
                    data-testid={`notif-receivable-${r.id}`}
                  >
                    <div className="h-8 w-8 rounded-md bg-expense/10 text-expense flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.customer}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatDate(r.due_date)} · {Math.abs(d)} gün gecikti
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm font-semibold text-income">
                        +{formatCurrency(r.amount, r.currency)}
                      </div>
                      <button
                        onClick={() => closeReceivable(r.id)}
                        data-testid={`notif-close-receivable-${r.id}`}
                        className="text-[11px] text-muted-foreground hover:text-brand transition-colors mt-0.5"
                      >
                        Tahsil et
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {expenses.length > 0 && (
            <div className="p-3 space-y-2 border-t border-border">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold flex items-center gap-1.5 px-1">
                <ArrowUpFromLine className="h-3 w-3" /> Ödenmemiş Giderler
              </div>
              {expenses.map((e) => {
                const d = daysUntil(e.date);
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 border border-border rounded-md p-2.5 hover:bg-secondary/50 transition-colors"
                    data-testid={`notif-expense-${e.id}`}
                  >
                    <div className="h-8 w-8 rounded-md bg-expense/10 text-expense flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{e.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatDate(e.date)} · {Math.abs(d)} gün gecikti
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm font-semibold text-expense">
                        −{formatCurrency(e.amount, e.currency)}
                      </div>
                      <button
                        onClick={() => closeExpense(e.id)}
                        data-testid={`notif-close-expense-${e.id}`}
                        className="text-[11px] text-muted-foreground hover:text-brand transition-colors mt-0.5"
                      >
                        Öde
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="p-3 border-t border-border">
          <Link
            to="/payments"
            data-testid="notif-view-all"
            onClick={() => setOpen(false)}
            className="text-xs text-muted-foreground hover:text-brand transition-colors"
          >
            Tüm ödemeleri görüntüle →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
