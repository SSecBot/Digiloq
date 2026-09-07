import { useEffect, useMemo, useState, useRef } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon, ArrowDownToLine, ArrowUpFromLine, CheckCircle2,
  ListTodo, AlertCircle, Trash2, History, ChevronLeft, ChevronRight, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, daysUntil, toLocalIsoDate } from "@/lib/format";
import { useCurrency } from "@/context/CurrencyContext";
import { MONTH_NAMES } from "@/components/MonthPicker";

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export default function Payments() {
  const { activeCurrency, convert } = useCurrency();
  const [items, setItems] = useState([]);
  const [selectedDateStr, setSelectedDateStr] = useState(toLocalIsoDate(new Date()));
  const [filterType, setFilterType] = useState("all"); // "all" | "receivable" | "expense" | "task"
  const [loading, setLoading] = useState(true);
  const timelineScrollRef = useRef(null);
  const monthRefs = useRef({});

  const load = async () => {
    try {
      const { data } = await api.get("/upcoming-payments?past_days=365&future_days=365&include_paid=true");
      setItems(data || []);
    } catch {
      toast.error("İşlem ve takvim verileri yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAction = async (item) => {
    try {
      if (item.type === "receivable") {
        await api.post(`/receivables/${item.id}/mark-paid`);
        toast.success("Gelir tahsil edildi");
      } else if (item.type === "expense") {
        await api.post(`/expenses/${item.id}/mark-paid`);
        toast.success("Gider ödendi");
      } else if (item.type === "task") {
        await api.patch(`/tasks/${item.id}/stage`, { stage: "completed" });
        toast.success("Görev tamamlandı");
      }
      load();
    } catch {
      toast.error("İşlem başarısız");
    }
  };

  const handleDelete = async (p, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const targetId = String(p.id || p._id || "").trim();
    if (!targetId) return;

    const isRecurring = Boolean(
      p.is_recurring || p.customer_id || p.fixed_expense_id || p.expense_type === "recurring"
    );

    // Instant optimistic UI update: remove target and all future projections if recurring
    setItems((prev) =>
      prev.filter((item) => {
        const itemId = String(item.id || item._id || "").trim();
        if (itemId === targetId) return false;
        if (isRecurring && item.type === p.type && item.status !== "paid") {
          if (p.customer_id && item.customer_id && String(item.customer_id) === String(p.customer_id)) return false;
          if (p.fixed_expense_id && item.fixed_expense_id && String(item.fixed_expense_id) === String(p.fixed_expense_id)) return false;
          if (p.title && item.title === p.title && item.date >= p.date) return false;
        }
        return true;
      })
    );

    try {
      if (p.type === "receivable") {
        await api.delete(`/receivables/${encodeURIComponent(targetId)}?cascade_future=true`);
      } else if (p.type === "expense") {
        await api.delete(`/expenses/${encodeURIComponent(targetId)}?cascade_future=true`);
      } else if (p.type === "task") {
        await api.delete(`/tasks/${encodeURIComponent(targetId)}`);
      }
      toast.success(isRecurring ? "Tekrarlı kayıt ve gelecek planları silindi" : "Kayıt silindi");
      load();
    } catch {
      toast.error("Silinemedi");
      load();
    }
  };

  // Group items by local ISO date string "YYYY-MM-DD"
  const groupedByDate = useMemo(() => {
    const m = {};
    items.forEach((i) => {
      const dateKey = i.date ? i.date.slice(0, 10) : "";
      if (dateKey) {
        (m[dateKey] = m[dateKey] || []).push(i);
      }
    });
    return m;
  }, [items]);

  // Generate continuous timeline: 12 past months + current month + 12 future months = 25 months
  const timelineMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    // Start 12 months in the past
    const startDate = new Date(curYear, curMonth - 12, 1);
    let iterY = startDate.getFullYear();
    let iterM = startDate.getMonth();

    for (let i = 0; i < 25; i++) {
      const daysCount = new Date(iterY, iterM + 1, 0).getDate();
      const firstDaySunBased = new Date(iterY, iterM, 1).getDay();
      const offsetDays = (firstDaySunBased + 6) % 7;

      const monthKeyStr = `${iterY}-${String(iterM + 1).padStart(2, "0")}`;
      const monthTitle = `${MONTH_NAMES[iterM]} ${iterY}`;
      const isCurrentMonth = iterY === curYear && iterM === curMonth;
      const isPastMonth = iterY < curYear || (iterY === curYear && iterM < curMonth);

      months.push({
        key: monthKeyStr,
        year: iterY,
        monthIndex: iterM,
        monthName: MONTH_NAMES[iterM],
        titleWithDays: `${monthTitle} (${daysCount} Gün)`,
        daysCount,
        offsetDays,
        isCurrentMonth,
        isPastMonth,
      });

      iterM += 1;
      if (iterM > 11) {
        iterM = 0;
        iterY += 1;
      }
    }
    return months;
  }, []);

  const todayIso = toLocalIsoDate(new Date());
  const currentMonthKey = todayIso.slice(0, 7);

  // Auto-scroll to current month on initial render
  useEffect(() => {
    if (!loading && timelineMonths.length > 0) {
      const timer = setTimeout(() => {
        const el = monthRefs.current[currentMonthKey];
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [loading, timelineMonths, currentMonthKey]);

  // Items for selected day
  const rawDayItems = (selectedDateStr && groupedByDate[selectedDateStr]) || [];
  const dayItems = rawDayItems.filter((i) => {
    if (filterType === "all") return true;
    return i.type === filterType;
  });

  // Next Immediate Month calculation
  const today = new Date();
  const nextMonthYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
  const nextMonthNum = today.getMonth() === 11 ? 1 : today.getMonth() + 2;
  const nextMonthKey = `${nextMonthYear}-${String(nextMonthNum).padStart(2, "0")}`;

  const nextMonthExpenses = items.filter(
    (i) => i.type === "expense" && i.date && i.date.startsWith(nextMonthKey) && i.status !== "paid"
  );
  const nextMonthTotalExpenseInActive = nextMonthExpenses.reduce(
    (sum, i) => sum + convert(i.amount, i.currency, activeCurrency),
    0
  );

  const nextMonthIncomes = items.filter(
    (i) => i.type === "receivable" && i.date && i.date.startsWith(nextMonthKey) && i.status !== "paid"
  );
  const nextMonthTotalIncomeInActive = nextMonthIncomes.reduce(
    (sum, i) => sum + convert(i.amount, i.currency, activeCurrency),
    0
  );

  const scrollToMonth = (mKey) => {
    const el = monthRefs.current[mKey];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToCurrentMonth = () => {
    scrollToMonth(currentMonthKey);
    setSelectedDateStr(todayIso);
  };

  return (
    <div className="space-y-3.5 sm:space-y-4" data-testid="payments-page">
      {/* Top summary strip for upcoming focus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-3.5 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              Gelecek Ay ({MONTH_NAMES[nextMonthNum - 1]}) · Beklenen Gelir
            </div>
            <Badge variant="outline" className="text-[10px] bg-income/10 text-income border-income/30 font-mono rounded-lg">
              {nextMonthIncomes.length} Kayıt
            </Badge>
          </div>
          <div className="mt-1.5">
            <div className="font-mono text-xl sm:text-2xl font-bold text-income">
              +{formatCurrency(nextMonthTotalIncomeInActive, activeCurrency)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Cari ayın hemen sonraki dönemi ({activeCurrency})
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              Gelecek Ay ({MONTH_NAMES[nextMonthNum - 1]}) · Beklenen Gider & Ödemeler
            </div>
            <Badge variant="outline" className="text-[10px] bg-expense/10 text-expense border-expense/30 font-mono rounded-lg">
              {nextMonthExpenses.length} Kayıt
            </Badge>
          </div>
          <div className="mt-1.5">
            <div className="font-mono text-xl sm:text-2xl font-bold text-expense">
              −{formatCurrency(nextMonthTotalExpenseInActive, activeCurrency)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Cari ayın hemen sonraki dönemi ({activeCurrency})
            </div>
          </div>
        </div>
      </div>

      {/* Month quick jump chips bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1 px-2 bg-card/60 border border-border rounded-xl">
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={scrollToCurrentMonth}
            data-testid="jump-to-current-month-btn"
            className="h-7 px-2.5 text-xs bg-brand text-white border-brand hover:bg-brand/90 font-semibold rounded-lg shrink-0 shadow-2xs"
          >
            Bugün / Bu Ay
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {timelineMonths.map((m) => {
            const isCurrent = m.key === currentMonthKey;
            return (
              <button
                key={m.key}
                onClick={() => scrollToMonth(m.key)}
                data-testid={`quick-jump-${m.key}`}
                className={`px-2 py-1 rounded-lg text-xs font-medium shrink-0 transition-all ${
                  isCurrent
                    ? "bg-brand/20 text-brand border border-brand/40 font-bold shadow-xs"
                    : m.isPastMonth
                    ? "text-muted-foreground/70 hover:text-foreground hover:bg-secondary/40"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                }`}
              >
                {m.monthName} {m.year !== today.getFullYear() ? `'${String(m.year).slice(-2)}` : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Continuous Timeline Calendar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3.5 items-start">
        {/* Left Container: Continuous Scrollable Timeline Months (Past, Present, Future) */}
        <div
          ref={timelineScrollRef}
          data-testid="continuous-calendar-timeline"
          className="lg:col-span-3 space-y-3.5 h-[calc(100vh-250px)] min-h-[450px] overflow-y-auto pr-1 rounded-2xl"
        >
          {timelineMonths.map((month) => {
            return (
              <div
                key={month.key}
                ref={(el) => (monthRefs.current[month.key] = el)}
                data-testid={`timeline-month-card-${month.key}`}
                className={`bg-card border rounded-2xl overflow-hidden shadow-xs transition-all ${
                  month.isCurrentMonth
                    ? "border-brand/50 ring-1 ring-brand/20"
                    : month.isPastMonth
                    ? "border-border/70 opacity-95"
                    : "border-border"
                }`}
              >
                {/* Sticky Month Header */}
                <div className={`sticky top-0 z-10 backdrop-blur-md px-3.5 py-2 border-b border-border flex items-center justify-between ${
                  month.isCurrentMonth ? "bg-[#1d1916]/95 border-brand/30" : "bg-[#16181d]/95"
                }`}>
                  <div className="flex items-center gap-2">
                    {month.isPastMonth ? (
                      <History className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <CalendarIcon className={`h-4 w-4 ${month.isCurrentMonth ? "text-brand" : "text-foreground/80"}`} />
                    )}
                    <span className={`font-display text-xs sm:text-sm font-bold ${
                      month.isCurrentMonth ? "text-brand" : "text-foreground"
                    }`}>
                      {month.titleWithDays}
                    </span>
                    {month.isCurrentMonth && (
                      <Badge className="bg-brand text-white text-[9px] px-1.5 py-0 rounded font-semibold">
                        Bu Ay
                      </Badge>
                    )}
                    {month.isPastMonth && (
                      <Badge variant="outline" className="text-muted-foreground border-border text-[9px] px-1.5 py-0 rounded">
                        Geçmiş
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {month.key}
                  </span>
                </div>

                {/* Weekdays Row */}
                <div className="grid grid-cols-7 gap-1 px-3 pt-2 pb-1 border-b border-border/40 text-center">
                  {WEEKDAYS.map((wd) => (
                    <div
                      key={wd}
                      className="text-[10px] font-mono font-medium text-muted-foreground/70 uppercase"
                    >
                      {wd}
                    </div>
                  ))}
                </div>

                {/* Day Cells Grid */}
                <div className="grid grid-cols-7 gap-1 p-2.5">
                  {/* Empty offset padding cells */}
                  {Array.from({ length: month.offsetDays }).map((_, idx) => (
                    <div
                      key={`empty-${month.key}-${idx}`}
                      className="h-12 sm:h-14 rounded-xl border border-transparent opacity-0 pointer-events-none"
                    />
                  ))}

                  {/* Month days */}
                  {Array.from({ length: month.daysCount }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const dayIso = `${month.key}-${String(dayNum).padStart(2, "0")}`;
                    const dayEvents = groupedByDate[dayIso] || [];
                    const isSelected = selectedDateStr === dayIso;
                    const isToday = dayIso === todayIso;

                    const incomeCount = dayEvents.filter((e) => e.type === "receivable").length;
                    const expenseCount = dayEvents.filter((e) => e.type === "expense").length;
                    const taskCount = dayEvents.filter((e) => e.type === "task").length;

                    return (
                      <button
                        key={dayIso}
                        onClick={() => setSelectedDateStr(dayIso)}
                        data-testid={`timeline-day-${dayIso}`}
                        className={`h-12 sm:h-14 rounded-xl border p-1 flex flex-col justify-between items-start text-left transition-all duration-150 relative group ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/40 shadow-xs"
                            : isToday
                            ? "border-brand/80 bg-brand/10 hover:border-brand"
                            : "border-border/60 bg-[#141518]/80 hover:border-zinc-700 hover:bg-secondary/40"
                        }`}
                      >
                        {/* Day Number Header */}
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`text-[11px] font-mono font-semibold px-1 py-0.2 rounded-md ${
                              isToday
                                ? "bg-brand text-white font-bold"
                                : isSelected
                                ? "text-emerald-400 font-bold"
                                : "text-foreground/90"
                            }`}
                          >
                            {dayNum}
                          </span>

                          {dayEvents.length > 0 && (
                            <span className="text-[9px] font-mono text-muted-foreground">
                              {dayEvents.length}
                            </span>
                          )}
                        </div>

                        {/* Transaction & Task Indicators */}
                        <div className="flex flex-wrap items-center gap-1 w-full mt-auto">
                          {incomeCount > 0 && (
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-income shadow-xs"
                              title={`${incomeCount} Gelir`}
                            />
                          )}
                          {expenseCount > 0 && (
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-expense shadow-xs"
                              title={`${expenseCount} Gider`}
                            />
                          )}
                          {taskCount > 0 && (
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-xs"
                              title={`${taskCount} Görev`}
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Container: Selected Date Agenda & Interactive Items Pane */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-3.5 flex flex-col h-[calc(100vh-250px)] min-h-[450px] shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-border shrink-0">
            <div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                Seçilen Gün ve Detaylar
              </div>
              <div className="font-display text-sm sm:text-base font-bold mt-0.5 text-foreground">
                {selectedDateStr ? formatDate(selectedDateStr) : "-"}
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 bg-secondary/60 p-0.5 rounded-xl text-xs">
              {[
                { k: "all", l: "Tümü" },
                { k: "receivable", l: "Gelir" },
                { k: "expense", l: "Gider" },
                { k: "task", l: "Görev" },
              ].map((t) => (
                <button
                  key={t.k}
                  onClick={() => setFilterType(t.k)}
                  data-testid={`filter-${t.k}`}
                  className={`px-2 py-0.5 rounded-lg text-xs transition-colors ${
                    filterType === t.k
                      ? "bg-card text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          {/* Agenda Items List */}
          <div className="space-y-2 flex-1 overflow-y-auto pr-1">
            {dayItems.length === 0 && (
              <div className="text-muted-foreground text-xs border border-dashed border-border rounded-xl p-6 text-center flex flex-col items-center justify-center h-40">
                <span>Bu gün için planlı ödeme, tahsilat veya görev bulunmamaktadır.</span>
                <span className="text-[10px] text-muted-foreground/60 mt-1">
                  Renkli nokta bulunan günlere tıklayarak işlemleri görüntüleyebilirsiniz.
                </span>
              </div>
            )}

            {dayItems.map((p) => {
              const d = daysUntil(p.date);
              const isIncome = p.type === "receivable";
              const isExpense = p.type === "expense";
              const isTask = p.type === "task";
              const isPaid = p.status === "paid";
              const isCompleted = p.stage === "completed";
              const isDone = isPaid || isCompleted;

              const isOverdue =
                !isDone &&
                (p.status === "overdue" || d < 0);

              return (
                <div
                  key={`${p.type}-${p.id}`}
                  className={`flex items-center gap-2 border rounded-xl p-2.5 transition-all bg-[#16181d] ${
                    isDone
                      ? "border-border/50 opacity-80"
                      : isOverdue
                      ? "border-expense/40"
                      : "border-border hover:bg-secondary/40"
                  }`}
                  data-testid={`day-item-${p.type}-${p.id}`}
                >
                  <div
                    className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isIncome
                        ? "bg-income/10 text-income"
                        : isExpense
                        ? "bg-expense/10 text-expense"
                        : "bg-blue-500/10 text-blue-400"
                    }`}
                  >
                    {isIncome ? (
                      <ArrowDownToLine className="h-3.5 w-3.5" />
                    ) : isExpense ? (
                      <ArrowUpFromLine className="h-3.5 w-3.5" />
                    ) : (
                      <ListTodo className="h-3.5 w-3.5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                      <span className={isDone ? "line-through text-muted-foreground" : "text-foreground"}>
                        {p.title}
                      </span>
                      {isTask && (
                        <span className="text-[9px] px-1 py-0 rounded bg-blue-500/10 text-blue-400 font-mono">
                          İş Akışı
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <span className="truncate">
                        {p.description || (isIncome ? "Gelir" : isExpense ? "Gider" : "Görev")}
                      </span>
                      {isDone && (
                        <span className="text-income font-medium shrink-0">
                          · {isIncome ? "Tahsil Edildi" : isExpense ? "Ödendi" : "Tamamlandı"}
                        </span>
                      )}
                      {isOverdue && (
                        <span className="text-expense font-semibold shrink-0">
                          · {Math.abs(d)}g gecikti
                        </span>
                      )}
                    </div>
                  </div>

                  {!isTask && (
                    <div
                      className={`font-mono text-xs font-semibold shrink-0 ${
                        isDone
                          ? "text-muted-foreground"
                          : isIncome
                          ? "text-income"
                          : "text-expense"
                      }`}
                    >
                      {isIncome ? "+" : "−"}
                      {formatCurrency(p.amount, p.currency)}
                    </div>
                  )}

                  {/* Status Action or Completed Badge */}
                  {isDone ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline" className="border-income/40 bg-income/10 text-income font-medium text-[10px] h-6 px-1.5 rounded-md flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        <span>{isIncome ? "Tahsil Edildi" : isExpense ? "Ödendi" : "Tamam"}</span>
                      </Badge>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(p, e)}
                        data-testid={`day-delete-${p.type}-${p.id}`}
                        className="text-muted-foreground/60 hover:text-expense hover:bg-expense/10 p-1.5 rounded-lg transition-colors shrink-0"
                        title="Kalıcı Olarak Sil"
                        aria-label="Kalıcı Olarak Sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(p)}
                        data-testid={`day-mark-paid-${p.type}-${p.id}`}
                        className="border-border hover:border-brand hover:text-brand text-[11px] h-6 px-2 rounded-md"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {isIncome ? "Tahsil Et" : isExpense ? "Öde" : "Tamamla"}
                      </Button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(p, e)}
                        data-testid={`day-delete-${p.type}-${p.id}`}
                        className="text-muted-foreground/60 hover:text-expense hover:bg-expense/10 p-1.5 rounded-lg transition-colors shrink-0"
                        title="Kalıcı Olarak Sil"
                        aria-label="Kalıcı Olarak Sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
