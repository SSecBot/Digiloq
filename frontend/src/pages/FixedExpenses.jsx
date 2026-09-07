import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Trash2, Pencil, RefreshCw, CircleDot, CircleSlash } from "lucide-react";
import { formatCurrency } from "@/lib/format";

const CATEGORIES = ["Kira", "Personel", "Vergi", "Elektrik/Su", "İnternet", "Yazılım", "Pazarlama", "Diğer"];

const emptyForm = {
  title: "", category: "Kira", amount: "", currency: "TRY",
  day_of_month: 1, account_id: "none", notes: "", active: true,
};

export default function FixedExpenses() {
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    try {
      const [f, a] = await Promise.all([api.get("/fixed-expenses"), api.get("/accounts")]);
      setItems(f.data);
      setAccounts(a.data);
    } catch { toast.error("Yüklenemedi"); }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Başlık zorunlu");
    if (!form.amount || Number(form.amount) <= 0) return toast.error("Tutar geçersiz");
    const day = Number(form.day_of_month);
    if (day < 1 || day > 28) return toast.error("Ödeme günü 1-28 arasında olmalı");
    const payload = {
      title: form.title.trim(),
      category: form.category,
      amount: Number(form.amount),
      currency: form.currency,
      day_of_month: day,
      account_id: form.account_id === "none" ? null : form.account_id,
      notes: form.notes,
      active: form.active,
    };
    try {
      if (editing) {
        await api.patch(`/fixed-expenses/${editing}`, payload);
        toast.success("Güncellendi · giderler yeniden hesaplandı");
      } else {
        await api.post("/fixed-expenses", payload);
        toast.success("Sabit gider eklendi · 12 ay için giderler oluşturuldu");
      }
      setOpen(false);
      setForm(emptyForm);
      setEditing(null);
      load();
    } catch { toast.error("Kaydedilemedi"); }
  };

  const remove = async (id, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const targetId = String(id || "").trim();
    if (!targetId) return;

    // Optimistic instantaneous UI update
    setItems((prev) => prev.filter((item) => String(item.id || item._id || "").trim() !== targetId));
    try {
      await api.delete(`/fixed-expenses/${encodeURIComponent(targetId)}`);
      toast.success("Sabit gider ve gelecek planları silindi");
      load();
    } catch {
      toast.error("Silinemedi");
      load();
    }
  };

  const startEdit = (f) => {
    setEditing(f.id);
    setForm({
      title: f.title, category: f.category, amount: String(f.amount),
      currency: f.currency, day_of_month: f.day_of_month,
      account_id: f.account_id || "none", notes: f.notes || "", active: f.active,
    });
    setOpen(true);
  };

  const totalsByCurrency = items.reduce((acc, f) => {
    if (!f.active) return acc;
    acc[f.currency] = (acc[f.currency] || 0) + Number(f.amount);
    return acc;
  }, {});

  return (
    <div className="space-y-6" data-testid="fixed-expenses-page">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div className="flex flex-wrap gap-3">
          {Object.entries(totalsByCurrency).map(([cur, val]) => (
            <div key={cur} className="border border-border rounded-md bg-card px-4 py-2.5">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Aylık Yük · {cur}
              </div>
              <div className="font-mono text-lg font-semibold text-expense">
                −{formatCurrency(val, cur)}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Sabit gider ekleyin — her ay otomatik gider kaydı oluşur.
            </div>
          )}
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(emptyForm); setEditing(null); } }}>
          <DialogTrigger asChild>
            <Button data-testid="add-fixed-expense-btn" className="bg-brand text-white hover:bg-brand/90 hover:-translate-y-[1px] transition-transform">
              <Plus className="h-4 w-4 mr-1.5" /> Yeni Sabit Gider
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">{editing ? "Sabit Gideri Düzenle" : "Yeni Aylık Sabit Gider"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Başlık</Label>
                  <Input data-testid="fixed-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ofis Kirası" />
                </div>
                <div className="space-y-1.5">
                  <Label>Kategori</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger data-testid="fixed-category-select"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Aylık Tutar</Label>
                  <Input data-testid="fixed-amount-input" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0,00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Para Birimi</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v, account_id: "none" })}>
                    <SelectTrigger data-testid="fixed-currency-select"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="TRY">TRY ₺</SelectItem>
                      <SelectItem value="USD">USD $</SelectItem>
                      <SelectItem value="EUR">EUR €</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Ödeme Günü (1-28)</Label>
                  <Input data-testid="fixed-day-input" type="number" min={1} max={28} value={form.day_of_month} onChange={(e) => setForm({ ...form, day_of_month: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Ödeme Hesabı (opsiyonel)</Label>
                <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                  <SelectTrigger data-testid="fixed-account-select"><SelectValue placeholder="Seçilmedi" /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="none">Seçilmedi</SelectItem>
                    {accounts.filter((a) => a.currency === form.currency).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name} · {a.currency}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Notlar</Label>
                <Textarea data-testid="fixed-notes-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <div className="text-sm font-medium">Aktif</div>
                  <div className="text-xs text-muted-foreground">Kapalıysa gelecekteki tekrarlı giderler oluşturulmaz.</div>
                </div>
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} data-testid="fixed-active-switch" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
              <Button data-testid="submit-fixed-btn" onClick={submit} className="bg-brand text-white hover:bg-brand/90">
                {editing ? "Güncelle" : "Ekle"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground border border-dashed border-border rounded-md p-10">
            Henüz aylık sabit gider yok — kira, personel, aidat gibi tekrarlı giderleri buradan tanımlayın.
          </div>
        )}
        {items.map((f) => (
          <div key={f.id} className="bg-card border border-border rounded-md p-5 hover:border-zinc-700 transition-colors" data-testid={`fixed-card-${f.id}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-secondary flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <div className="font-display font-semibold">{f.title}</div>
                  <div className="text-xs text-muted-foreground">{f.category}</div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button data-testid={`fixed-menu-${f.id}`} className="text-muted-foreground hover:text-foreground p-1">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-border">
                  <DropdownMenuItem onClick={() => startEdit(f)}>
                    <Pencil className="h-4 w-4 mr-2" /> Düzenle
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => remove(f.id)} className="text-expense focus:text-expense">
                    <Trash2 className="h-4 w-4 mr-2" /> Sil
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="mt-5 flex items-baseline justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Aylık</div>
                <div className="font-mono text-2xl font-semibold mt-1 text-expense">
                  −{formatCurrency(f.amount, f.currency)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Ödeme Günü</div>
                <div className="font-mono text-lg mt-1">{f.day_of_month}.</div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs">
              {f.active ? (
                <><CircleDot className="h-3 w-3 text-income" /> <span className="text-income">Aktif · Tekrarlı</span></>
              ) : (
                <><CircleSlash className="h-3 w-3 text-muted-foreground" /> <span className="text-muted-foreground">Pasif</span></>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
