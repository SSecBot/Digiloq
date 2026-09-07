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
import { Plus, MoreVertical, CheckCircle2, Trash2, Pencil, ArrowDownToLine, Repeat, Calendar } from "lucide-react";
import { formatCurrency, formatDate, daysUntil } from "@/lib/format";
import MonthPicker, { monthKey } from "@/components/MonthPicker";

const emptyForm = {
  customer: "",
  description: "",
  amount: "",
  currency: "TRY",
  due_date: new Date().toISOString().slice(0, 10),
  account_id: "none",
  is_recurring: false,
  commitment_end_date: "", // Mandatory if is_recurring is true
};

const STATUS = {
  pending: { label: "Bekliyor", className: "bg-warn/10 text-warn border-warn/20" },
  paid: { label: "Tahsil Edildi", className: "bg-income/10 text-income border-income/20" },
  overdue: { label: "Vadesi Geçti", className: "bg-expense/10 text-expense border-expense/20" },
};

export default function Receivables() {
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState("all");
  const [month, setMonth] = useState(monthKey());

  const load = async () => {
    try {
      const params = month ? `?month=${month}` : "";
      const [r, a] = await Promise.all([
        api.get(`/receivables${params}`),
        api.get("/accounts"),
      ]);
      setItems(r.data);
      setAccounts(a.data);
    } catch {
      toast.error("Gelirler yüklenemedi");
    }
  };

  useEffect(() => {
    load();
    /* eslint-disable-next-line */
  }, [month]);

  const handleOpenNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setForm({
      customer: r.customer || "",
      description: r.description || "",
      amount: String(r.amount || ""),
      currency: r.currency || "TRY",
      due_date: r.due_date || new Date().toISOString().slice(0, 10),
      account_id: r.account_id || "none",
      is_recurring: Boolean(r.is_recurring),
      commitment_end_date: r.commitment_end_date || "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.customer.trim()) return toast.error("Müşteri / Kaynak adı zorunludur");
    if (!form.amount || Number(form.amount) <= 0) return toast.error("Geçerli tutar girin");

    if (form.is_recurring && !form.commitment_end_date) {
      return toast.error("Düzenli gelir için Taahhüt / Bitiş Tarihi zorunludur");
    }

    const payload = {
      customer: form.customer.trim(),
      description: form.description,
      amount: Number(form.amount),
      currency: form.currency,
      due_date: form.due_date,
      account_id: form.account_id === "none" ? null : form.account_id,
      is_recurring: form.is_recurring,
      commitment_end_date: form.is_recurring ? form.commitment_end_date : null,
    };

    try {
      if (editingId) {
        await api.patch(`/receivables/${editingId}`, payload);
        toast.success("Gelir kaydı güncellendi");
      } else {
        await api.post("/receivables", payload);
        toast.success(
          form.is_recurring
            ? "Düzenli gelir eklendi · Taahhüt süresince aylık kayıtlar oluşturuldu"
            : "Gelir eklendi"
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
      await api.post(`/receivables/${id}/mark-paid`);
      toast.success("Tahsil edildi olarak işaretlendi");
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
    const isRecurring = Boolean(target && (target.is_recurring || target.customer_id));

    // Optimistic instantaneous UI update
    setItems((prev) =>
      prev.filter((item) => {
        const itemId = String(item.id || item._id || "").trim();
        if (itemId === targetId) return false;
        if (isRecurring && target && item.status !== "paid") {
          if (target.customer_id && item.customer_id && String(item.customer_id) === String(target.customer_id)) return false;
          if (item.customer === target.customer && item.due_date >= target.due_date) return false;
        }
        return true;
      })
    );

    try {
      await api.delete(`/receivables/${encodeURIComponent(targetId)}${isRecurring ? "?cascade_future=true" : ""}`);
      toast.success(isRecurring ? "Tekrarlı gelir ve gelecek planları silindi" : "Kayıt silindi");
      load();
    } catch {
      toast.error("Silinemedi");
      load();
    }
  };

  const filtered = items.filter((i) => {
    if (filter === "all") return true;
    if (filter === "recurring") return i.is_recurring || Boolean(i.customer_id);
    return i.status === filter;
  });

  return (
    <div className="space-y-6" data-testid="receivables-page">
      {/* Header controls strip */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <MonthPicker value={month} onChange={setMonth} testidPrefix="receivable-month" />

        <div className="flex flex-wrap gap-1 bg-card border border-border rounded-md p-1">
          {[
            { k: "all", l: "Tümü" },
            { k: "pending", l: "Bekleyen" },
            { k: "overdue", l: "Vadesi Geçen" },
            { k: "paid", l: "Tahsil Edilen" },
            { k: "recurring", l: "Sabit / Düzenli" },
          ].map((t) => (
            <button
              key={t.k}
              data-testid={`filter-${t.k}`}
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
              data-testid="add-receivable-btn"
              className="bg-brand text-white hover:bg-brand/90 hover:-translate-y-[1px] transition-transform"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Yeni Gelir
            </Button>
          </DialogTrigger>

          <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingId ? "Gelir Kaydını Düzenle" : "Yeni Gelir Ekle"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {/* Income Type Toggle: One-time vs Recurring */}
              <div className="space-y-1.5">
                <Label>Gelir Türü</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, is_recurring: false })}
                    className={`p-2.5 rounded-md border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                      !form.is_recurring
                        ? "border-brand bg-brand/10 text-brand font-semibold"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    <span>Tek Seferlik Gelir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, is_recurring: true })}
                    className={`p-2.5 rounded-md border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                      form.is_recurring
                        ? "border-brand bg-brand/10 text-brand font-semibold"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Repeat className="h-4 w-4" />
                    <span>Düzenli / Sabit Gelir</span>
                  </button>
                </div>
              </div>

              {/* Customer / Source */}
              <div className="space-y-1.5">
                <Label>Müşteri / Gelir Kaynağı</Label>
                <Input
                  data-testid="receivable-customer-input"
                  value={form.customer}
                  onChange={(e) => setForm({ ...form, customer: e.target.value })}
                  placeholder="Örn. ABC Ltd. / Müşteri Adı"
                />
              </div>

              {/* Amount and Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{form.is_recurring ? "Aylık Tutar" : "Tutar"}</Label>
                  <Input
                    data-testid="receivable-amount-input"
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
                    <SelectTrigger data-testid="receivable-currency-select">
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

              {/* Vade Tarihi */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{form.is_recurring ? "İlk Vade Tarihi" : "Vade Tarihi"}</Label>
                  <Input
                    data-testid="receivable-due-input"
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Yatırılacak Hesap</Label>
                  <Select
                    value={form.account_id}
                    onValueChange={(v) => setForm({ ...form, account_id: v })}
                  >
                    <SelectTrigger data-testid="receivable-account-select">
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

              {/* Mandatory Commitment End Date for Recurring Income */}
              {form.is_recurring && (
                <div className="p-3 bg-secondary/40 border border-brand/20 rounded-md space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-brand">
                    <Calendar className="h-3.5 w-3.5" /> Taahhüt & Sözleşme Bitiş Tarihi
                  </div>
                  <Input
                    data-testid="receivable-commitment-end-date"
                    type="date"
                    value={form.commitment_end_date}
                    onChange={(e) =>
                      setForm({ ...form, commitment_end_date: e.target.value })
                    }
                  />
                  <div className="text-[11px] text-muted-foreground">
                    Bu tarihe kadar her ay otomatik bekleyen gelir kaydı oluşturulur.
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <Label>Açıklama</Label>
                <Textarea
                  data-testid="receivable-description-input"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Fatura no, sözleşme detayları…"
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
                data-testid="submit-receivable-btn"
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
                <TableHead className="text-[11px] uppercase tracking-wider">Müşteri / Kaynak</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Vade</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Durum</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-right">Tutar</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow className="border-border">
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10 text-xs">
                    Bu kriterlere uygun gelir kaydı bulunamadı
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((r) => {
                const d = daysUntil(r.due_date);
                const isRecurring = r.is_recurring || Boolean(r.customer_id);

                return (
                  <TableRow
                    key={r.id}
                    className="border-border hover:bg-secondary/40 transition-colors"
                    data-testid={`receivable-row-${r.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-income/10 flex items-center justify-center shrink-0">
                          {isRecurring ? (
                            <Repeat className="h-4 w-4 text-brand" />
                          ) : (
                            <ArrowDownToLine className="h-4 w-4 text-income" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                            <span className="truncate">{r.customer}</span>
                            {isRecurring && (
                              <span
                                title="Aylık tekrarlı"
                                className="text-brand text-[9px] px-1.5 py-0.5 rounded-md bg-brand/10 font-mono"
                              >
                                Sabit
                              </span>
                            )}
                          </div>
                          {r.description && (
                            <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                              {r.description}
                            </div>
                          )}
                          {r.commitment_end_date && (
                            <div className="text-[10px] text-muted-foreground font-mono">
                              Taahhüt Bitiş: {formatDate(r.commitment_end_date)}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-xs">
                      <div>{formatDate(r.due_date)}</div>
                      {r.status !== "paid" && (
                        <div
                          className={`text-[10px] ${
                            d < 0 ? "text-expense font-semibold" : "text-muted-foreground"
                          }`}
                        >
                          {d < 0
                            ? `${Math.abs(d)} gün gecikti`
                            : d === 0
                            ? "bugün"
                            : `${d} gün sonra`}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`${STATUS[r.status]?.className || ""} font-medium text-[10px] rounded-lg`}
                      >
                        {STATUS[r.status]?.label || r.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs font-bold text-income">
                      +{formatCurrency(r.amount, r.currency)}
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            data-testid={`receivable-menu-${r.id}`}
                            className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                            onClick={(ev) => ev.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border rounded-xl">
                          {r.status !== "paid" && (
                            <DropdownMenuItem
                              data-testid={`receivable-mark-paid-${r.id}`}
                              onClick={(ev) => markPaid(r.id, ev)}
                              className="rounded-lg text-xs"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-income" /> Tahsil Edildi
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            data-testid={`receivable-edit-${r.id}`}
                            onClick={() => startEdit(r)}
                            className="rounded-lg text-xs"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-2 text-brand" /> Düzenle
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            data-testid={`receivable-delete-${r.id}`}
                            onClick={(ev) => remove(r.id, ev)}
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
              Bu kriterlere uygun gelir kaydı bulunamadı
            </div>
          )}

          {filtered.map((r) => {
            const d = daysUntil(r.due_date);
            const isRecurring = r.is_recurring || Boolean(r.customer_id);

            return (
              <div
                key={r.id}
                data-testid={`receivable-card-${r.id}`}
                className="bg-[#16181d] border border-border rounded-xl p-3 space-y-2 hover:border-zinc-700 transition-all shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-income/10 flex items-center justify-center shrink-0">
                      {isRecurring ? (
                        <Repeat className="h-4 w-4 text-brand" />
                      ) : (
                        <ArrowDownToLine className="h-4 w-4 text-income" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                        <span>{r.customer}</span>
                        {isRecurring && (
                          <span className="text-brand text-[9px] px-1 py-0.5 rounded bg-brand/10 font-mono">
                            Sabit
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
                        <span>{formatDate(r.due_date)}</span>
                        {r.status !== "paid" && d < 0 && (
                          <span className="text-expense font-semibold">· {Math.abs(d)}g gecikti</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-bold text-income">
                      +{formatCurrency(r.amount, r.currency)}
                    </div>
                    <Badge
                      variant="outline"
                      className={`${STATUS[r.status]?.className || ""} font-medium text-[9px] rounded-md mt-1`}
                    >
                      {STATUS[r.status]?.label || r.status}
                    </Badge>
                  </div>
                </div>

                {r.description && (
                  <div className="text-[11px] text-muted-foreground line-clamp-2 bg-[#121316] p-2 rounded-lg border border-border/40">
                    {r.description}
                  </div>
                )}

                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/40">
                  {r.status !== "paid" && (
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`mobile-receivable-mark-paid-${r.id}`}
                      onClick={(ev) => markPaid(r.id, ev)}
                      className="border-income/40 text-income hover:bg-income/10 text-xs h-7 px-2 rounded-lg"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Tahsil Et
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid={`mobile-receivable-edit-${r.id}`}
                    onClick={() => startEdit(r)}
                    className="text-xs h-7 px-2 rounded-lg"
                  >
                    <Pencil className="h-3 w-3 mr-1 text-brand" /> Düzenle
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid={`mobile-receivable-delete-${r.id}`}
                    onClick={(ev) => remove(r.id, ev)}
                    className="text-expense hover:bg-expense/10 text-xs h-7 px-2 rounded-lg"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
