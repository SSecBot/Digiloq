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
import { Plus, MoreVertical, Trash2, Pencil, User, CircleDot, CircleSlash } from "lucide-react";
import { formatCurrency } from "@/lib/format";

const emptyForm = {
  name: "", contact: "", default_amount: "", currency: "TRY",
  day_of_month: 1, commitment_end_date: "", account_id: "none", description: "", active: true,
};

export default function Customers() {
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    try {
      const [c, a] = await Promise.all([api.get("/customers"), api.get("/accounts")]);
      setItems(c.data);
      setAccounts(a.data);
    } catch { toast.error("Yüklenemedi"); }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Müşteri adı zorunlu");
    if (!form.default_amount || Number(form.default_amount) <= 0) return toast.error("Aylık tutar geçersiz");
    const day = Number(form.day_of_month);
    if (day < 1 || day > 28) return toast.error("Vade günü 1-28 arasında olmalı");
    const payload = {
      name: form.name.trim(),
      contact: form.contact,
      default_amount: Number(form.default_amount),
      currency: form.currency,
      day_of_month: day,
      commitment_end_date: form.commitment_end_date || null,
      account_id: form.account_id === "none" ? null : form.account_id,
      description: form.description,
      active: form.active,
    };
    try {
      if (editing) {
        await api.patch(`/customers/${editing}`, payload);
        toast.success("Müşteri güncellendi · alacaklar yeniden hesaplandı");
      } else {
        await api.post("/customers", payload);
        toast.success("Müşteri eklendi · 12 ay için alacaklar oluşturuldu");
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
      await api.delete(`/customers/${encodeURIComponent(targetId)}`);
      toast.success("Müşteri ve gelecek planları silindi");
      load();
    } catch {
      toast.error("Silinemedi");
      load();
    }
  };

  const startEdit = (c) => {
    setEditing(c.id);
    setForm({
      name: c.name, contact: c.contact || "",
      default_amount: String(c.default_amount), currency: c.currency,
      day_of_month: c.day_of_month, commitment_end_date: c.commitment_end_date || "",
      account_id: c.account_id || "none",
      description: c.description || "", active: c.active,
    });
    setOpen(true);
  };

  const totalsByCurrency = items.reduce((acc, c) => {
    if (!c.active) return acc;
    acc[c.currency] = (acc[c.currency] || 0) + Number(c.default_amount);
    return acc;
  }, {});

  return (
    <div className="space-y-6" data-testid="customers-page">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div className="flex flex-wrap gap-3">
          {Object.entries(totalsByCurrency).map(([cur, val]) => (
            <div key={cur} className="border border-border rounded-md bg-card px-4 py-2.5">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Aylık Beklenen · {cur}
              </div>
              <div className="font-mono text-lg font-semibold text-income">
                +{formatCurrency(val, cur)}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Müşteri ekleyin — her ay otomatik alacak kaydı oluşur.
            </div>
          )}
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(emptyForm); setEditing(null); } }}>
          <DialogTrigger asChild>
            <Button data-testid="add-customer-btn" className="bg-brand text-white hover:bg-brand/90 hover:-translate-y-[1px] transition-transform">
              <Plus className="h-4 w-4 mr-1.5" /> Yeni Müşteri
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">{editing ? "Müşteriyi Düzenle" : "Yeni Müşteri"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Müşteri Adı</Label>
                  <Input data-testid="customer-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ABC Ltd." />
                </div>
                <div className="space-y-1.5">
                  <Label>İletişim</Label>
                  <Input data-testid="customer-contact-input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="E-posta / telefon" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Aylık Tutar</Label>
                  <Input data-testid="customer-amount-input" type="number" step="0.01" value={form.default_amount} onChange={(e) => setForm({ ...form, default_amount: e.target.value })} placeholder="0,00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Para Birimi</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v, account_id: "none" })}>
                    <SelectTrigger data-testid="customer-currency-select"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="TRY">TRY ₺</SelectItem>
                      <SelectItem value="USD">USD $</SelectItem>
                      <SelectItem value="EUR">EUR €</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Vade Günü (1-28)</Label>
                  <Input data-testid="customer-day-input" type="number" min={1} max={28} value={form.day_of_month} onChange={(e) => setForm({ ...form, day_of_month: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Yatırılacak Hesap (opsiyonel)</Label>
                  <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                    <SelectTrigger data-testid="customer-account-select"><SelectValue placeholder="Seçilmedi" /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="none">Seçilmedi</SelectItem>
                      {accounts.filter((a) => a.currency === form.currency).map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name} · {a.currency}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Taahhüt Bitiş Tarihi (opsiyonel)</Label>
                  <Input type="date" value={form.commitment_end_date} onChange={(e) => setForm({ ...form, commitment_end_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Açıklama</Label>
                <Textarea data-testid="customer-description-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Örn. Aylık danışmanlık ücreti" />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <div className="text-sm font-medium">Aktif</div>
                  <div className="text-xs text-muted-foreground">Kapalıysa gelecekteki tekrarlı alacaklar oluşturulmaz.</div>
                </div>
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} data-testid="customer-active-switch" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl text-xs">İptal</Button>
              <Button data-testid="submit-customer-btn" onClick={submit} className="bg-brand text-white hover:bg-brand/90 rounded-xl text-xs">
                {editing ? "Güncelle" : "Ekle"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {items.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground border border-dashed border-border rounded-2xl p-10 text-xs">
            Henüz müşteri yok. Sağ üstten ekleyin — sonraki 12 ay için otomatik alacak kaydı oluşur.
          </div>
        )}
        {items.map((c) => (
          <div key={c.id} className="bg-card border border-border rounded-2xl p-4 hover:border-zinc-700 transition-all shadow-xs flex flex-col justify-between gap-3" data-testid={`customer-card-${c.id}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center border border-border shrink-0">
                  <User className="h-4 w-4 text-brand" />
                </div>
                <div className="min-w-0">
                  <div className="font-display font-semibold text-xs text-foreground truncate">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{c.contact || "—"}</div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    data-testid={`customer-menu-${c.id}`}
                    className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-border rounded-xl">
                  <DropdownMenuItem onClick={() => startEdit(c)} className="rounded-lg text-xs">
                    <Pencil className="h-3.5 w-3.5 mr-2 text-brand" /> Düzenle
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    data-testid={`customer-delete-${c.id}`}
                    onClick={(ev) => remove(c.id, ev)}
                    className="text-expense focus:text-expense cursor-pointer rounded-lg text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Sil
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="mt-2 flex items-baseline justify-between pt-2 border-t border-border/40">
              <div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Aylık</div>
                <div className="font-mono text-xl font-bold text-income">
                  +{formatCurrency(c.default_amount, c.currency)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Vade Günü</div>
                <div className="font-mono text-base font-semibold">{c.day_of_month}.</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              {c.active ? (
                <><CircleDot className="h-3 w-3 text-income" /> <span className="text-income font-medium">Aktif · Tekrarlı</span></>
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
