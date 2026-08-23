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
import { Plus, MoreVertical, CheckCircle2, Trash2, ArrowDownToLine, Repeat } from "lucide-react";
import { formatCurrency, formatDate, daysUntil } from "@/lib/format";
import MonthPicker, { monthKey } from "@/components/MonthPicker";

const emptyForm = {
  customer: "", description: "", amount: "", currency: "TRY",
  due_date: new Date().toISOString().slice(0, 10), account_id: "none",
};

const STATUS = {
  pending: { label: "Bekliyor", className: "bg-warn/10 text-warn border-warn/20" },
  paid: { label: "Ödendi", className: "bg-income/10 text-income border-income/20" },
  overdue: { label: "Vadesi Geçti", className: "bg-expense/10 text-expense border-expense/20" },
};

export default function Receivables() {
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState("all");
  const [month, setMonth] = useState(monthKey());

  const load = async () => {
    try {
      const params = month ? `?month=${month}` : "";
      const [r, a] = await Promise.all([api.get(`/receivables${params}`), api.get("/accounts")]);
      setItems(r.data);
      setAccounts(a.data);
    } catch { toast.error("Yüklenemedi"); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month]);

  const submit = async () => {
    if (!form.customer.trim()) return toast.error("Müşteri adı zorunlu");
    if (!form.amount || Number(form.amount) <= 0) return toast.error("Geçerli tutar girin");
    try {
      await api.post("/receivables", {
        customer: form.customer.trim(),
        description: form.description,
        amount: Number(form.amount),
        currency: form.currency,
        due_date: form.due_date,
        account_id: form.account_id === "none" ? null : form.account_id,
      });
      toast.success("Alacak eklendi");
      setOpen(false);
      setForm(emptyForm);
      load();
    } catch { toast.error("Kaydedilemedi"); }
  };

  const markPaid = async (id) => {
    try {
      await api.post(`/receivables/${id}/mark-paid`);
      toast.success("Tahsil edildi");
      load();
    } catch { toast.error("İşlenemedi"); }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/receivables/${id}`);
      toast.success("Silindi");
      load();
    } catch { toast.error("Silinemedi"); }
  };

  const filtered = items.filter((i) => filter === "all" ? true : i.status === filter);

  return (
    <div className="space-y-6" data-testid="receivables-page">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <MonthPicker value={month} onChange={setMonth} testidPrefix="receivable-month" />
        <div className="flex gap-1 bg-card border border-border rounded-md p-1">
          {[
            { k: "all", l: "Tümü" },
            { k: "pending", l: "Bekleyen" },
            { k: "overdue", l: "Vadesi Geçen" },
            { k: "paid", l: "Ödenen" },
          ].map((t) => (
            <button
              key={t.k}
              data-testid={`filter-${t.k}`}
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
            <Button data-testid="add-receivable-btn" className="bg-brand text-white hover:bg-brand/90 hover:-translate-y-[1px] transition-transform">
              <Plus className="h-4 w-4 mr-1.5" /> Yeni Alacak
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">Yeni Alacak</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>Müşteri / Kaynak</Label>
                <Input data-testid="receivable-customer-input" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} placeholder="Örn. ABC Ltd." />
              </div>
              <div className="space-y-1.5">
                <Label>Açıklama</Label>
                <Textarea data-testid="receivable-description-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Fatura numarası, notlar…" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tutar</Label>
                  <Input data-testid="receivable-amount-input" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0,00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Para Birimi</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v, account_id: "none" })}>
                    <SelectTrigger data-testid="receivable-currency-select"><SelectValue /></SelectTrigger>
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
                  <Label>Vade Tarihi</Label>
                  <Input data-testid="receivable-due-input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Yatırılacak Hesap</Label>
                  <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                    <SelectTrigger data-testid="receivable-account-select"><SelectValue placeholder="Seçilmedi" /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="none">Seçilmedi</SelectItem>
                      {accounts.filter((a) => a.currency === form.currency).map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name} · {a.currency}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
              <Button data-testid="submit-receivable-btn" onClick={submit} className="bg-brand text-white hover:bg-brand/90">Ekle</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs uppercase tracking-wider">Müşteri</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Vade</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Durum</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">Tutar</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow className="border-border">
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  Kayıt bulunamadı
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => {
              const d = daysUntil(r.due_date);
              return (
                <TableRow key={r.id} className="border-border hover:bg-secondary/40" data-testid={`receivable-row-${r.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-income/10 flex items-center justify-center">
                        <ArrowDownToLine className="h-4 w-4 text-income" />
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-1.5">
                          {r.customer}
                          {r.customer_id && (
                            <span title="Aylık tekrarlı" className="text-brand">
                              <Repeat className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        {r.description && <div className="text-xs text-muted-foreground truncate max-w-xs">{r.description}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <div>{formatDate(r.due_date)}</div>
                    {r.status !== "paid" && (
                      <div className={`text-[11px] ${d < 0 ? "text-expense" : "text-muted-foreground"}`}>
                        {d < 0 ? `${Math.abs(d)} gün gecikti` : d === 0 ? "bugün" : `${d} gün sonra`}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${STATUS[r.status].className} font-medium`}>
                      {STATUS[r.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-income">
                    +{formatCurrency(r.amount, r.currency)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button data-testid={`receivable-menu-${r.id}`} className="text-muted-foreground hover:text-foreground p-1">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border">
                        {r.status !== "paid" && (
                          <DropdownMenuItem data-testid={`receivable-mark-paid-${r.id}`} onClick={() => markPaid(r.id)}>
                            <CheckCircle2 className="h-4 w-4 mr-2 text-income" /> Tahsil Edildi
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => remove(r.id)} className="text-expense focus:text-expense">
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
