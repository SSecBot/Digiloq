import { useEffect, useState } from "react";
import { api } from "@/lib/api";
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
import { Plus, MoreVertical, CheckCircle2, Trash2, ArrowUpFromLine, Repeat } from "lucide-react";
import { formatCurrency, formatDate, daysUntil } from "@/lib/format";
import MonthPicker, { monthKey } from "@/components/MonthPicker";

const CATEGORIES = ["Kira", "Personel", "Vergi", "Elektrik/Su", "İnternet", "Yazılım", "Pazarlama", "Diğer"];

const emptyForm = {
  title: "", category: "Diğer", amount: "", currency: "TRY",
  date: new Date().toISOString().slice(0, 10), account_id: "none", notes: "", status: "pending",
};

const STATUS = {
  pending: { label: "Bekliyor", className: "bg-warn/10 text-warn border-warn/20" },
  paid: { label: "Ödendi", className: "bg-income/10 text-income border-income/20" },
};

export default function Expenses() {
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState("all");
  const [month, setMonth] = useState(monthKey());

  const load = async () => {
    try {
      const params = month ? `?month=${month}` : "";
      const [e, a] = await Promise.all([api.get(`/expenses${params}`), api.get("/accounts")]);
      setItems(e.data);
      setAccounts(a.data);
    } catch { toast.error("Yüklenemedi"); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month]);

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Başlık zorunlu");
    if (!form.amount || Number(form.amount) <= 0) return toast.error("Geçerli tutar girin");
    try {
      await api.post("/expenses", {
        title: form.title.trim(),
        category: form.category,
        amount: Number(form.amount),
        currency: form.currency,
        date: form.date,
        status: form.status,
        account_id: form.account_id === "none" ? null : form.account_id,
        notes: form.notes,
      });
      toast.success("Gider eklendi");
      setOpen(false);
      setForm(emptyForm);
      load();
    } catch { toast.error("Kaydedilemedi"); }
  };

  const markPaid = async (id) => {
    try {
      await api.post(`/expenses/${id}/mark-paid`);
      toast.success("Ödendi olarak işaretlendi");
      load();
    } catch { toast.error("İşlenemedi"); }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/expenses/${id}`);
      toast.success("Silindi");
      load();
    } catch { toast.error("Silinemedi"); }
  };

  const filtered = items.filter((i) => filter === "all" ? true : i.status === filter);

  return (
    <div className="space-y-6" data-testid="expenses-page">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <MonthPicker value={month} onChange={setMonth} testidPrefix="expense-month" />
        <div className="flex gap-1 bg-card border border-border rounded-md p-1">
          {[{ k: "all", l: "Tümü" }, { k: "pending", l: "Bekleyen" }, { k: "paid", l: "Ödenen" }].map((t) => (
            <button
              key={t.k}
              data-testid={`exp-filter-${t.k}`}
              onClick={() => setFilter(t.k)}
              className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                filter === t.k ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(emptyForm); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-expense-btn" className="bg-brand text-white hover:bg-brand/90 hover:-translate-y-[1px] transition-transform">
              <Plus className="h-4 w-4 mr-1.5" /> Yeni Gider
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">Yeni Gider</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>Başlık</Label>
                <Input data-testid="expense-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Örn. Ofis kirası - Şubat" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Kategori</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger data-testid="expense-category-select"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Durum</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger data-testid="expense-status-select"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="pending">Bekliyor</SelectItem>
                      <SelectItem value="paid">Ödendi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tutar</Label>
                  <Input data-testid="expense-amount-input" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0,00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Para Birimi</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v, account_id: "none" })}>
                    <SelectTrigger data-testid="expense-currency-select"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="TRY">TRY ₺</SelectItem>
                      <SelectItem value="USD">USD $</SelectItem>
                      <SelectItem value="EUR">EUR €</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tarih</Label>
                  <Input data-testid="expense-date-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Ödeme Hesabı</Label>
                  <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                    <SelectTrigger data-testid="expense-account-select"><SelectValue placeholder="Seçilmedi" /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="none">Seçilmedi</SelectItem>
                      {accounts.filter((a) => a.currency === form.currency).map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name} · {a.currency}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notlar</Label>
                <Textarea data-testid="expense-notes-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
              <Button data-testid="submit-expense-btn" onClick={submit} className="bg-brand text-white hover:bg-brand/90">Ekle</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs uppercase tracking-wider">Başlık</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Kategori</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Tarih</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Durum</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">Tutar</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow className="border-border">
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">Kayıt bulunamadı</TableCell>
              </TableRow>
            )}
            {filtered.map((e) => {
              const d = daysUntil(e.date);
              return (
                <TableRow key={e.id} className="border-border hover:bg-secondary/40" data-testid={`expense-row-${e.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-expense/10 flex items-center justify-center">
                        <ArrowUpFromLine className="h-4 w-4 text-expense" />
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-1.5">
                          {e.title}
                          {e.fixed_expense_id && (
                            <span title="Aylık tekrarlı" className="text-brand">
                              <Repeat className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        {e.notes && <div className="text-xs text-muted-foreground truncate max-w-xs">{e.notes}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-1 rounded-sm bg-secondary text-foreground/80">{e.category}</span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <div>{formatDate(e.date)}</div>
                    {e.status !== "paid" && d >= 0 && (
                      <div className="text-[11px] text-muted-foreground">{d === 0 ? "bugün" : `${d} gün sonra`}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${STATUS[e.status].className} font-medium`}>
                      {STATUS[e.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-expense">
                    −{formatCurrency(e.amount, e.currency)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button data-testid={`expense-menu-${e.id}`} className="text-muted-foreground hover:text-foreground p-1">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border">
                        {e.status !== "paid" && (
                          <DropdownMenuItem data-testid={`expense-mark-paid-${e.id}`} onClick={() => markPaid(e.id)}>
                            <CheckCircle2 className="h-4 w-4 mr-2 text-income" /> Ödendi İşaretle
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => remove(e.id)} className="text-expense focus:text-expense">
                          <Trash2 className="h-4 w-4 mr-2" /> Sil
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
    </div>
  );
}
