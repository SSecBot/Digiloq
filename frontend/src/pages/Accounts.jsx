import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Trash2, Pencil, Landmark } from "lucide-react";
import { formatCurrency } from "@/lib/format";

const emptyForm = { name: "", bank: "", balance: "", currency: "TRY" };

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get("/accounts");
      setAccounts(data);
    } catch {
      toast.error("Hesaplar yüklenemedi");
    }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Hesap adı zorunlu");
    const payload = {
      name: form.name.trim(),
      bank: form.bank.trim(),
      balance: Number(form.balance || 0),
      currency: form.currency,
    };
    try {
      if (editing) {
        await api.patch(`/accounts/${editing}`, payload);
        toast.success("Hesap güncellendi");
      } else {
        await api.post("/accounts", payload);
        toast.success("Hesap eklendi");
      }
      setOpen(false);
      setForm(emptyForm);
      setEditing(null);
      load();
    } catch {
      toast.error("Kaydedilemedi");
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/accounts/${id}`);
      toast.success("Silindi");
      load();
    } catch {
      toast.error("Silinemedi");
    }
  };

  const startEdit = (a) => {
    setEditing(a.id);
    setForm({ name: a.name, bank: a.bank || "", balance: String(a.balance), currency: a.currency });
    setOpen(true);
  };

  const totals = accounts.reduce((acc, a) => {
    acc[a.currency] = (acc[a.currency] || 0) + Number(a.balance || 0);
    return acc;
  }, {});

  return (
    <div className="space-y-6" data-testid="accounts-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          {Object.entries(totals).map(([cur, val]) => (
            <div key={cur} className="border border-border rounded-md bg-card px-4 py-2.5">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Toplam · {cur}
              </div>
              <div className="font-mono text-lg font-semibold">
                {formatCurrency(val, cur)}
              </div>
            </div>
          ))}
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(emptyForm); setEditing(null); } }}>
          <DialogTrigger asChild>
            <Button
              data-testid="add-account-btn"
              className="bg-brand text-white hover:bg-brand/90 hover:-translate-y-[1px] transition-transform"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Yeni Hesap
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">{editing ? "Hesabı Düzenle" : "Yeni Banka Hesabı"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Hesap Adı</Label>
                <Input
                  data-testid="account-name-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ana TL Hesap"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Banka</Label>
                <Input
                  data-testid="account-bank-input"
                  value={form.bank}
                  onChange={(e) => setForm({ ...form, bank: e.target.value })}
                  placeholder="Örn. Garanti BBVA"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Başlangıç Bakiyesi</Label>
                  <Input
                    data-testid="account-balance-input"
                    type="number"
                    step="0.01"
                    value={form.balance}
                    onChange={(e) => setForm({ ...form, balance: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Para Birimi</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                    <SelectTrigger data-testid="account-currency-select"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="TRY">TRY ₺</SelectItem>
                      <SelectItem value="USD">USD $</SelectItem>
                      <SelectItem value="EUR">EUR €</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
              <Button data-testid="submit-account-btn" onClick={submit} className="bg-brand text-white hover:bg-brand/90">
                {editing ? "Güncelle" : "Ekle"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground border border-dashed border-border rounded-md p-10">
            Henüz hesap yok. Sağ üstten ekleyin.
          </div>
        )}
        {accounts.map((a) => (
          <div key={a.id} className="bg-card border border-border rounded-md p-5 hover:border-zinc-700 transition-colors" data-testid={`account-card-${a.id}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-secondary flex items-center justify-center">
                  <Landmark className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <div className="font-display font-semibold">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.bank || "—"}</div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button data-testid={`account-menu-${a.id}`} className="text-muted-foreground hover:text-foreground p-1">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-border">
                  <DropdownMenuItem onClick={() => startEdit(a)}>
                    <Pencil className="h-4 w-4 mr-2" /> Düzenle
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => remove(a.id)} className="text-expense focus:text-expense">
                    <Trash2 className="h-4 w-4 mr-2" /> Sil
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="mt-5">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Bakiye</div>
              <div className="font-mono text-2xl font-semibold mt-1">
                {formatCurrency(a.balance, a.currency)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
