import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, MoreVertical, CheckCircle2, Trash2, Pencil, ArrowUpFromLine, Repeat,
  CreditCard, Landmark, DollarSign, Calendar
} from "lucide-react";
import { formatCurrency, formatDate, daysUntil } from "@/lib/format";
import MonthPicker, { monthKey } from "@/components/MonthPicker";
import { useCurrency } from "@/context/CurrencyContext";

const CATEGORIES = [
  "Kira", "Personel", "Kredi & Borç", "Vergi", "Elektrik/Su",
  "İnternet", "Yazılım", "Pazarlama", "Diğer"
];

const emptyForm = {
  title: "",
  category: "Diğer",
  amount: "",
  currency: "TRY",
  date: new Date().toISOString().slice(0, 10),
  account_id: "none",
  notes: "",
  status: "pending",
  expense_type: "one_time", // "one_time" | "recurring" | "debt"
  day_of_month: 1,
  commitment_end_date: "",
  // Debt specific fields
  principal_amount: "",
  interest_rate: "3.9", // 3.9% fallback
  min_payment_pct: "20", // 20% fallback
};

const STATUS = {
  pending: { label: "Bekliyor", className: "bg-warn/10 text-warn border-warn/20" },
  paid: { label: "Ödendi", className: "bg-income/10 text-income border-income/20" },
};

export default function Expenses() {
  const { activeCurrency, convertTotals } = useCurrency();
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [systemDefaults, setSystemDefaults] = useState({
    default_interest_rate: 0.039,
    default_min_payment_pct: 0.20,
    default_currency: "TRY",
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [month, setMonth] = useState(monthKey());

  const load = async () => {
    try {
      const params = month ? `?month=${month}` : "";
      const [e, a, defs] = await Promise.all([
        api.get(`/expenses${params}`),
        api.get("/accounts"),
        api.get("/settings/defaults").catch(() => ({ data: {} })),
      ]);
      setItems(e.data);
      setAccounts(a.data);
      if (defs.data?.default_interest_rate) {
        setSystemDefaults(defs.data);
      }
    } catch {
      toast.error("Giderler yüklenemedi");
    }
  };

  useEffect(() => {
    load();
    /* eslint-disable-next-line */
  }, [month]);

  const handleOpenNew = () => {
    setEditingId(null);
    const ir = ((systemDefaults.default_interest_rate || 0.039) * 100).toFixed(1);
    const mp = ((systemDefaults.default_min_payment_pct || 0.20) * 100).toFixed(0);
    setForm({
      ...emptyForm,
      currency: systemDefaults.default_currency || "TRY",
      interest_rate: ir,
      min_payment_pct: mp,
    });
    setOpen(true);
  };

  const startEdit = (e) => {
    setEditingId(e.id);
    const ir = e.interest_rate !== undefined ? ((Number(e.interest_rate) || 0.039) * 100).toFixed(1) : "3.9";
    const mp = e.min_payment_pct !== undefined ? ((Number(e.min_payment_pct) || 0.20) * 100).toFixed(0) : "20";
    setForm({
      title: e.title || "",
      category: e.category || "Diğer",
      amount: String(e.amount || ""),
      currency: e.currency || "TRY",
      date: e.date || new Date().toISOString().slice(0, 10),
      account_id: e.account_id || "none",
      notes: e.notes || "",
      status: e.status || "pending",
      expense_type: e.expense_type || "one_time",
      day_of_month: e.day_of_month || 1,
      commitment_end_date: e.commitment_end_date || "",
      principal_amount: e.principal_amount ? String(e.principal_amount) : String(e.amount || ""),
      interest_rate: ir,
      min_payment_pct: mp,
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Başlık zorunludur");
    if (!form.amount || Number(form.amount) <= 0) return toast.error("Geçerli tutar girin");

    const payload = {
      title: form.title.trim(),
      category: form.expense_type === "debt" ? "Kredi & Borç" : form.category,
      amount: Number(form.amount),
      currency: form.currency,
      date: form.date,
      status: form.status,
      account_id: form.account_id === "none" ? null : form.account_id,
      notes: form.notes,
      expense_type: form.expense_type,
      day_of_month: form.expense_type === "recurring" ? Number(form.day_of_month || 1) : null,
      commitment_end_date: form.commitment_end_date || null,
    };

    if (form.expense_type === "debt") {
      const ir = form.interest_rate ? Number(form.interest_rate) / 100 : 0.039;
      const mp = form.min_payment_pct ? Number(form.min_payment_pct) / 100 : 0.20;
      payload.interest_rate = ir;
      payload.min_payment_pct = mp;
      payload.principal_amount = form.principal_amount ? Number(form.principal_amount) : Number(form.amount);
    }

    try {
      if (editingId) {
        await api.patch(`/expenses/${editingId}`, payload);
        toast.success("Gider güncellendi");
      } else {
        await api.post("/expenses", payload);
        toast.success(
          form.expense_type === "recurring"
            ? "Sabit gider eklendi · 12 aylık plan oluşturuldu"
            : form.expense_type === "debt"
            ? "Kredi/Borç gideri eklendi"
            : "Gider eklendi"
        );
      }
      setOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err, "Kaydedilemedi"));
    }
  };

  const markPaid = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.post(`/expenses/${id}/mark-paid`);
      toast.success("Ödendi olarak işaretlendi");
      load();
    } catch {
      toast.error("İşlenemedi");
    }
  };

  const remove = async (id, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const targetId = String(id || "").trim();
    if (!targetId) return;

    const target = items.find((i) => String(i.id || i._id || "").trim() === targetId);
    const isRecurring = Boolean(target && (target.expense_type === "recurring" || target.fixed_expense_id));

    // Optimistic instantaneous UI update
    setItems((prev) =>
      prev.filter((item) => {
        const itemId = String(item.id || item._id || "").trim();
        if (itemId === targetId) return false;
        if (isRecurring && target && item.status !== "paid") {
          if (target.fixed_expense_id && item.fixed_expense_id && String(item.fixed_expense_id) === String(target.fixed_expense_id)) return false;
          if (item.title === target.title && item.date >= target.date) return false;
        }
        return true;
      })
    );

    try {
      await api.delete(`/expenses/${encodeURIComponent(targetId)}${isRecurring ? "?cascade_future=true" : ""}`);
      toast.success(isRecurring ? "Sabit gider ve gelecek planları silindi" : "Gider silindi");
      load();
    } catch {
      toast.error("Silinemedi");
      load();
    }
  };

  // Filter items
  const filtered = items.filter((i) => {
    if (filter === "all") return true;
    if (filter === "pending") return i.status === "pending";
    if (filter === "paid") return i.status === "paid";
    if (filter === "recurring") return i.expense_type === "recurring" || Boolean(i.fixed_expense_id);
    if (filter === "debt") return i.expense_type === "debt" || i.category === "Kredi & Borç";
    return true;
  });

  return (
    <div className="space-y-6" data-testid="expenses-page">
      {/* Header controls strip */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <MonthPicker value={month} onChange={setMonth} testidPrefix="expense-month" />

        <div className="flex flex-wrap gap-1 bg-card border border-border rounded-md p-1">
          {[
            { k: "all", l: "Tümü" },
            { k: "pending", l: "Bekleyen" },
            { k: "paid", l: "Ödenen" },
            { k: "recurring", l: "Sabit / Tekrarlı" },
            { k: "debt", l: "Kredi / Borç" },
          ].map((t) => (
            <button
              key={t.k}
              data-testid={`exp-filter-${t.k}`}
              onClick={() => setFilter(t.k)}
              className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                filter === t.k
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>

        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) {
              setForm(emptyForm);
              setEditingId(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              onClick={handleOpenNew}
              data-testid="add-expense-btn"
              className="bg-brand text-white hover:bg-brand/90 hover:-translate-y-[1px] transition-transform"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Yeni Gider
            </Button>
          </DialogTrigger>

          <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingId ? "Gideri Düzenle" : "Yeni Gider Ekle"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {/* Expense Type Selector */}
              <div className="space-y-1.5">
                <Label>Gider Türü</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "one_time", label: "Tek Seferlik", icon: ArrowUpFromLine },
                    { id: "recurring", label: "Aylık Sabit", icon: Repeat },
                    { id: "debt", label: "Kredi / Borç", icon: CreditCard },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = form.expense_type === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            expense_type: t.id,
                            category: t.id === "debt" ? "Kredi & Borç" : form.category,
                          })
                        }
                        className={`p-2 rounded-md border text-xs font-medium flex flex-col items-center gap-1.5 transition-colors ${
                          isSelected
                            ? "border-brand bg-brand/10 text-brand font-semibold"
                            : "border-border bg-card text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Başlık</Label>
                  <Input
                    data-testid="expense-title-input"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder={
                      form.expense_type === "debt"
                        ? "Örn. Ticari Kredi / Kart Borcu"
                        : "Örn. Ofis Kirası"
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Kategori</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v })}
                    disabled={form.expense_type === "debt"}
                  >
                    <SelectTrigger data-testid="expense-category-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Amount and Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>
                    {form.expense_type === "debt"
                      ? "Aylık Ödeme / Taksit"
                      : form.expense_type === "recurring"
                      ? "Aylık Tutar"
                      : "Tutar"}
                  </Label>
                  <Input
                    data-testid="expense-amount-input"
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Para Birimi</Label>
                  <Select
                    value={form.currency}
                    onValueChange={(v) =>
                      setForm({ ...form, currency: v, account_id: "none" })
                    }
                  >
                    <SelectTrigger data-testid="expense-currency-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="TRY">TRY ₺</SelectItem>
                      <SelectItem value="USD">USD $</SelectItem>
                      <SelectItem value="EUR">EUR €</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Credit / Debt Specific Parameters */}
              {form.expense_type === "debt" && (
                <div className="p-3 bg-secondary/40 border border-brand/20 rounded-md space-y-2">
                  <div className="text-xs font-semibold text-brand flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" /> Kredi & Borç Hesaplama Parametreleri
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Toplam Ana Para</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Örn. 50000"
                        value={form.principal_amount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm({
                            ...form,
                            principal_amount: val,
                            // Auto calculate monthly installment
                            amount: val
                              ? (
                                  Number(val) * (Number(form.min_payment_pct || 20) / 100) +
                                  Number(val) * (Number(form.interest_rate || 3.9) / 100)
                                ).toFixed(2)
                              : form.amount,
                          });
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px]">Aylık Faiz (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="3.9"
                        value={form.interest_rate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm({
                            ...form,
                            interest_rate: val,
                            amount: form.principal_amount
                              ? (
                                  Number(form.principal_amount) *
                                    (Number(form.min_payment_pct || 20) / 100) +
                                  Number(form.principal_amount) * (Number(val || 3.9) / 100)
                                ).toFixed(2)
                              : form.amount,
                          });
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px]">Asgari (%)</Label>
                      <Input
                        type="number"
                        step="1"
                        placeholder="20"
                        value={form.min_payment_pct}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm({
                            ...form,
                            min_payment_pct: val,
                            amount: form.principal_amount
                              ? (
                                  Number(form.principal_amount) * (Number(val || 20) / 100) +
                                  Number(form.principal_amount) *
                                    (Number(form.interest_rate || 3.9) / 100)
                                ).toFixed(2)
                              : form.amount,
                          });
                        }}
                      />
                    </div>
                  </div>

                  {form.principal_amount && (
                    <div className="text-[11px] font-mono text-muted-foreground pt-1 flex justify-between">
                      <span>
                        Önerilen Asgari (%{form.min_payment_pct || 20}):{" "}
                        <strong className="text-foreground">
                          {formatCurrency(
                            Number(form.principal_amount) *
                              (Number(form.min_payment_pct || 20) / 100),
                            form.currency
                          )}
                        </strong>
                      </span>
                      <span>
                        Aylık Faiz (%{form.interest_rate || 3.9}):{" "}
                        <strong className="text-expense">
                          {formatCurrency(
                            Number(form.principal_amount) *
                              (Number(form.interest_rate || 3.9) / 100),
                            form.currency
                          )}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Recurring specific: day_of_month & optional commitment_end_date */}
              {form.expense_type === "recurring" && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/30 rounded-md border border-border">
                  <div className="space-y-1.5">
                    <Label>Ödeme Günü (1-28)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={28}
                      value={form.day_of_month}
                      onChange={(e) =>
                        setForm({ ...form, day_of_month: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Taahhüt Bitiş (Opsiyonel)</Label>
                    <Input
                      type="date"
                      value={form.commitment_end_date}
                      onChange={(e) =>
                        setForm({ ...form, commitment_end_date: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}

              {/* Date and Payment Account */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tarih</Label>
                  <Input
                    data-testid="expense-date-input"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Ödeme Hesabı</Label>
                  <Select
                    value={form.account_id}
                    onValueChange={(v) => setForm({ ...form, account_id: v })}
                  >
                    <SelectTrigger data-testid="expense-account-select">
                      <SelectValue placeholder="Seçilmedi" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="none">Seçilmedi</SelectItem>
                      {accounts
                        .filter((a) => a.currency === form.currency)
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} · {a.currency}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>Notlar</Label>
                <Textarea
                  data-testid="expense-notes-input"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Ek açıklama…"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setEditingId(null);
                }}
              >
                İptal
              </Button>
              <Button
                data-testid="submit-expense-btn"
                onClick={submit}
                className="bg-brand text-white hover:bg-brand/90"
              >
                {editingId ? "Güncelle" : "Ekle"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Ledger Table (Desktop) & Stacked Cards (Mobile) */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent bg-secondary/30">
                <TableHead className="text-[11px] uppercase tracking-wider">Gider / Başlık</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Kategori</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Vade / Tarih</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Durum</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-right">Aylık Ödeme / Tutar</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow className="border-border">
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10 text-xs">
                    Bu kriterlere uygun gider kaydı bulunamadı
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((e) => {
                const d = daysUntil(e.date);
                const isRecurring = e.expense_type === "recurring" || Boolean(e.fixed_expense_id);
                const isDebt = e.expense_type === "debt" || e.category === "Kredi & Borç";

                // Dynamic debt calculation
                const principal = Number(e.principal_amount || e.amount || 0);
                const ir = Number(e.interest_rate || 0.039);
                const mp = Number(e.min_payment_pct || 0.20);
                const monthlyInterest = principal * ir;
                const monthlyMin = principal * mp;
                const calculatedInstallment = isDebt ? (monthlyMin + monthlyInterest) : Number(e.amount || 0);

                return (
                  <TableRow
                    key={e.id}
                    className="border-border hover:bg-secondary/40 transition-colors"
                    data-testid={`expense-row-${e.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isDebt
                              ? "bg-amber-500/10 text-amber-400"
                              : isRecurring
                              ? "bg-brand/10 text-brand"
                              : "bg-expense/10 text-expense"
                          }`}
                        >
                          {isDebt ? (
                            <CreditCard className="h-4 w-4" />
                          ) : isRecurring ? (
                            <Repeat className="h-4 w-4" />
                          ) : (
                            <ArrowUpFromLine className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                            <span className="truncate">{e.title}</span>
                            {isRecurring && (
                              <span
                                title="Aylık tekrarlı"
                                className="text-brand text-[9px] px-1.5 py-0.5 rounded-md bg-brand/10 font-mono"
                              >
                                Sabit
                              </span>
                            )}
                            {isDebt && (
                              <span
                                title="Kredi / Borç"
                                className="text-amber-400 text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/10 font-mono"
                              >
                                Borç
                              </span>
                            )}
                          </div>
                          {e.notes && (
                            <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                              {e.notes}
                            </div>
                          )}
                          {isDebt && e.principal_amount && (
                            <div className="text-[10px] text-muted-foreground font-mono">
                              Toplam Ana Para: {formatCurrency(principal, e.currency)} · Faiz: %{(ir * 100).toFixed(1)}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-foreground/80 font-medium">
                        {e.category}
                      </span>
                    </TableCell>

                    <TableCell className="font-mono text-xs">
                      <div>{formatDate(e.date)}</div>
                      {e.status !== "paid" && (
                        <div
                          className={`text-[10px] ${
                            d < 0 ? "text-expense font-semibold" : "text-muted-foreground"
                          }`}
                        >
                          {d < 0 ? `${Math.abs(d)} gün gecikti` : d === 0 ? "bugün" : `${d} gün sonra`}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`${STATUS[e.status]?.className || ""} font-medium text-[10px] rounded-lg`}
                      >
                        {STATUS[e.status]?.label || e.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs font-bold text-expense">
                      <div>−{formatCurrency(Number(e.amount || 0), e.currency)}</div>
                      {isDebt && (
                        <div className="text-[10px] font-normal text-muted-foreground">
                          Aylık Taksit: {formatCurrency(calculatedInstallment, e.currency)}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            data-testid={`expense-menu-${e.id}`}
                            className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                            onClick={(ev) => ev.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border rounded-xl">
                          {e.status !== "paid" && (
                            <DropdownMenuItem
                              data-testid={`expense-mark-paid-${e.id}`}
                              onClick={(ev) => markPaid(e.id, ev)}
                              className="rounded-lg text-xs"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-income" /> Ödendi İşaretle
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            data-testid={`expense-edit-${e.id}`}
                            onClick={() => startEdit(e)}
                            className="rounded-lg text-xs"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-2 text-brand" /> Düzenle
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            data-testid={`expense-delete-${e.id}`}
                            onClick={(ev) => remove(e.id, ev)}
                            className="text-expense focus:text-expense cursor-pointer rounded-lg text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Stacked Ledger Cards View */}
        <div className="md:hidden p-3 space-y-2.5">
          {filtered.length === 0 && (
            <div className="text-center text-muted-foreground py-8 text-xs border border-dashed border-border rounded-xl">
              Bu kriterlere uygun gider kaydı bulunamadı
            </div>
          )}

          {filtered.map((e) => {
            const d = daysUntil(e.date);
            const isRecurring = e.expense_type === "recurring" || Boolean(e.fixed_expense_id);
            const isDebt = e.expense_type === "debt" || e.category === "Kredi & Borç";

            return (
              <div
                key={e.id}
                data-testid={`expense-card-${e.id}`}
                className="bg-[#16181d] border border-border rounded-xl p-3 space-y-2 hover:border-zinc-700 transition-all shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isDebt
                          ? "bg-amber-500/10 text-amber-400"
                          : isRecurring
                          ? "bg-brand/10 text-brand"
                          : "bg-expense/10 text-expense"
                      }`}
                    >
                      {isDebt ? (
                        <CreditCard className="h-4 w-4" />
                      ) : isRecurring ? (
                        <Repeat className="h-4 w-4" />
                      ) : (
                        <ArrowUpFromLine className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                        <span>{e.title}</span>
                        {isRecurring && (
                          <span className="text-brand text-[9px] px-1 py-0.5 rounded bg-brand/10 font-mono">
                            Sabit
                          </span>
                        )}
                        {isDebt && (
                          <span className="text-amber-400 text-[9px] px-1 py-0.5 rounded bg-amber-500/10 font-mono">
                            Borç
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
                        <span>{formatDate(e.date)}</span>
                        {e.status !== "paid" && d < 0 && (
                          <span className="text-expense font-semibold">· {Math.abs(d)}g gecikti</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-bold text-expense">
                      −{formatCurrency(Number(e.amount || 0), e.currency)}
                    </div>
                    <Badge
                      variant="outline"
                      className={`${STATUS[e.status]?.className || ""} font-medium text-[9px] rounded-md mt-1`}
                    >
                      {STATUS[e.status]?.label || e.status}
                    </Badge>
                  </div>
                </div>

                {e.notes && (
                  <div className="text-[11px] text-muted-foreground line-clamp-2 bg-[#121316] p-2 rounded-lg border border-border/40">
                    {e.notes}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <span className="text-[11px] px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                    {e.category}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {e.status !== "paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`mobile-expense-mark-paid-${e.id}`}
                        onClick={(ev) => markPaid(e.id, ev)}
                        className="border-expense/40 text-expense hover:bg-expense/10 text-xs h-7 px-2 rounded-lg"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Öde
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`mobile-expense-edit-${e.id}`}
                      onClick={() => startEdit(e)}
                      className="text-xs h-7 px-2 rounded-lg"
                    >
                      <Pencil className="h-3 w-3 mr-1 text-brand" /> Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`mobile-expense-delete-${e.id}`}
                      onClick={(ev) => remove(e.id, ev)}
                      className="text-expense hover:bg-expense/10 text-xs h-7 px-2 rounded-lg"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
