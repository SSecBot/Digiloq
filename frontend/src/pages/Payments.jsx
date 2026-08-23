import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Calendar as CalendarIcon, ArrowDownToLine, ArrowUpFromLine, CheckCircle2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, daysUntil } from "@/lib/format";
import { tr } from "date-fns/locale";

export default function Payments() {
  const [items, setItems] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const load = async () => {
    try {
      const { data } = await api.get("/upcoming-payments?days=60");
      setItems(data);
    } catch { toast.error("Yüklenemedi"); }
  };
  useEffect(() => { load(); }, []);

  const markPaid = async (p) => {
    try {
      const endpoint = p.type === "receivable" ? `/receivables/${p.id}/mark-paid` : `/expenses/${p.id}/mark-paid`;
      await api.post(endpoint);
      toast.success("İşlem güncellendi");
      load();
    } catch { toast.error("İşlem başarısız"); }
  };

  const groupedByDate = useMemo(() => {
    const m = {};
    items.forEach((i) => {
      (m[i.date] = m[i.date] || []).push(i);
    });
    return m;
  }, [items]);

  const paymentDays = useMemo(() => Object.keys(groupedByDate).map((d) => new Date(d)), [groupedByDate]);

  const selectedKey = selectedDate ? selectedDate.toISOString().slice(0, 10) : null;
  const dayItems = (selectedKey && groupedByDate[selectedKey]) || [];

  const totalsByCurrency = items.reduce((acc, i) => {
    const key = `${i.type}-${i.currency}`;
    acc[key] = (acc[key] || 0) + Number(i.amount);
    return acc;
  }, {});

  const currencies = ["TRY", "USD", "EUR"];

  return (
    <div className="space-y-6" data-testid="payments-page">
      {/* Totals strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-md p-5">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
            60 Gün · Beklenen Tahsilat
          </div>
          <div className="mt-3 space-y-1">
            {currencies.map((c) => {
              const v = totalsByCurrency[`receivable-${c}`];
              if (!v) return null;
              return (
                <div key={c} className="font-mono text-xl font-semibold text-income">
                  +{formatCurrency(v, c)}
                </div>
              );
            })}
            {!currencies.some((c) => totalsByCurrency[`receivable-${c}`]) && (
              <div className="text-muted-foreground text-sm">Kayıt yok</div>
            )}
          </div>
        </div>
        <div className="bg-card border border-border rounded-md p-5">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
            60 Gün · Beklenen Ödeme
          </div>
          <div className="mt-3 space-y-1">
            {currencies.map((c) => {
              const v = totalsByCurrency[`expense-${c}`];
              if (!v) return null;
              return (
                <div key={c} className="font-mono text-xl font-semibold text-expense">
                  −{formatCurrency(v, c)}
                </div>
              );
            })}
            {!currencies.some((c) => totalsByCurrency[`expense-${c}`]) && (
              <div className="text-muted-foreground text-sm">Kayıt yok</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-md p-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <CalendarIcon className="h-4 w-4 text-brand" />
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              Takvim
            </div>
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => d && setSelectedDate(d)}
            locale={tr}
            modifiers={{ hasPayment: paymentDays }}
            modifiersClassNames={{
              hasPayment:
                "relative before:content-[''] before:absolute before:bottom-1 before:left-1/2 before:-translate-x-1/2 before:h-1 before:w-1 before:rounded-full before:bg-brand",
            }}
            className="rounded-md"
            data-testid="payment-calendar"
          />
        </div>

        <div className="lg:col-span-3 bg-card border border-border rounded-md p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                Seçilen Gün
              </div>
              <div className="font-display text-xl font-bold mt-1">
                {selectedDate ? formatDate(selectedDate) : "-"}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {dayItems.length === 0 && (
              <div className="text-muted-foreground text-sm border border-dashed border-border rounded-md p-8 text-center">
                Bu gün için planlı ödeme yok.
              </div>
            )}
            {dayItems.map((p) => {
              const d = daysUntil(p.date);
              return (
                <div key={`${p.type}-${p.id}`} className="flex items-center gap-3 border border-border rounded-md p-3 hover:bg-secondary/50 transition-colors" data-testid={`day-item-${p.type}-${p.id}`}>
                  <div className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${p.type === "receivable" ? "bg-income/10 text-income" : "bg-expense/10 text-expense"}`}>
                    {p.type === "receivable" ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {p.description || (p.type === "receivable" ? "Alacak" : "Gider")}
                      {p.status === "overdue" && <span className="text-expense"> · {Math.abs(d)} gün gecikti</span>}
                    </div>
                  </div>
                  <div className={`font-mono text-sm font-semibold ${p.type === "receivable" ? "text-income" : "text-expense"}`}>
                    {p.type === "receivable" ? "+" : "−"}
                    {formatCurrency(p.amount, p.currency)}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markPaid(p)}
                    data-testid={`day-mark-paid-${p.type}-${p.id}`}
                    className="border-border hover:border-brand hover:text-brand"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Kapat
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
