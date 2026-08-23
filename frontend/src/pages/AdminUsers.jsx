import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2, XCircle, Undo2, Trash2, ShieldCheck, User as UserIcon, KeyRound, Pencil, AlertTriangle,
} from "lucide-react";

const STATUS = {
  pending: { label: "Onay Bekliyor", cls: "bg-warn/10 text-warn border-warn/20" },
  approved: { label: "Onaylı", cls: "bg-income/10 text-income border-income/20" },
  rejected: { label: "Reddedildi", cls: "bg-expense/10 text-expense border-expense/20" },
};

function AvatarSmall({ user }) {
  if (user?.avatar) {
    return <img src={user.avatar} alt={user.name} className="h-10 w-10 rounded-md object-cover border border-border" />;
  }
  return (
    <div className="h-10 w-10 rounded-md bg-secondary flex items-center justify-center">
      {user?.role === "owner" ? <ShieldCheck className="h-5 w-5 text-brand" /> : <UserIcon className="h-5 w-5 text-brand" />}
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");

  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "" });

  const [resetting, setResetting] = useState(null);
  const [newPw, setNewPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data);
    } catch (e) { toast.error(formatApiError(e, "Yüklenemedi")); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const act = async (uid, action, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      if (action === "delete") await api.delete(`/admin/users/${uid}`);
      else await api.post(`/admin/users/${uid}/${action}`);
      toast.success("İşlem tamam");
      load();
    } catch (e) { toast.error(formatApiError(e, "İşlem başarısız")); }
  };

  const openEdit = (u) => {
    setEditing(u);
    setEditForm({ name: u.name, email: u.email });
  };

  const saveEdit = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) return toast.error("Ad ve e-posta zorunlu");
    try {
      await api.patch(`/admin/users/${editing.id}`, {
        name: editForm.name.trim(),
        email: editForm.email.trim().toLowerCase(),
      });
      toast.success("Kullanıcı güncellendi");
      setEditing(null);
      load();
    } catch (e) { toast.error(formatApiError(e, "Kaydedilemedi")); }
  };

  const openReset = (u) => {
    setResetting(u);
    setNewPw("");
  };

  const doReset = async () => {
    if (newPw.length < 8) return toast.error("Şifre en az 8 karakter olmalı");
    setPwLoading(true);
    try {
      await api.post(`/admin/users/${resetting.id}/reset-password`, { new_password: newPw });
      toast.success("Şifre sıfırlandı — yeni şifreyi kullanıcıya iletin");
      setResetting(null);
      setNewPw("");
    } catch (e) { toast.error(formatApiError(e, "Sıfırlanamadı")); }
    finally { setPwLoading(false); }
  };

  const filtered = users.filter((u) => {
    if (u.role === "owner") return tab === "all";
    if (tab === "all") return true;
    return u.status === tab;
  });

  const counts = users.reduce((acc, u) => {
    if (u.role === "owner") return acc;
    acc[u.status] = (acc[u.status] || 0) + 1;
    return acc;
  }, { pending: 0, approved: 0, rejected: 0 });

  return (
    <div className="space-y-6" data-testid="admin-users-page">
      <div className="rounded-md border border-brand/30 bg-brand/5 p-3 flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-brand mt-0.5" />
        <div className="text-xs text-muted-foreground">
          <span className="text-foreground font-medium">Güvenlik notu:</span> Şifreler tek yönlü hash'le saklandığı için düz metin şifre görüntülenemez. Bir kullanıcıya erişim vermek için <span className="text-brand">Şifre Sıfırla</span> ile yeni bir şifre belirleyip iletebilirsiniz.
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex gap-1 bg-card border border-border rounded-md p-1">
          {[
            { k: "pending", l: `Onay Bekleyen · ${counts.pending}` },
            { k: "approved", l: `Onaylı · ${counts.approved}` },
            { k: "rejected", l: `Reddedilen · ${counts.rejected}` },
            { k: "all", l: "Tümü" },
          ].map((t) => (
            <button
              key={t.k}
              data-testid={`admin-tab-${t.k}`}
              onClick={() => setTab(t.k)}
              className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                tab === t.k ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && <div className="text-muted-foreground text-sm col-span-full">Yükleniyor…</div>}
        {!loading && filtered.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground border border-dashed border-border rounded-md p-10">
            Bu sekmede kayıt yok.
          </div>
        )}
        {filtered.map((u) => (
          <div key={u.id} className="bg-card border border-border rounded-md p-5 flex flex-col gap-4" data-testid={`admin-user-${u.id}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <AvatarSmall user={u} />
                <div className="min-w-0">
                  <div className="font-display font-semibold truncate">{u.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                </div>
              </div>
              <Badge variant="outline" className={STATUS[u.status]?.cls || ""}>
                {u.role === "owner" ? "Sahibi" : STATUS[u.status]?.label}
              </Badge>
            </div>
            {u.role !== "owner" && (
              <div className="flex flex-wrap gap-2">
                {u.status !== "approved" && (
                  <Button size="sm" variant="outline" onClick={() => act(u.id, "approve")} data-testid={`approve-${u.id}`} className="border-income/40 text-income hover:bg-income/10 hover:text-income">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Onayla
                  </Button>
                )}
                {u.status === "approved" && (
                  <Button size="sm" variant="outline" onClick={() => openReset(u)} data-testid={`reset-pw-${u.id}`} className="border-brand/40 text-brand hover:bg-brand/10 hover:text-brand">
                    <KeyRound className="h-3.5 w-3.5 mr-1" /> Şifre Sıfırla
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => openEdit(u)} data-testid={`edit-${u.id}`}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Düzenle
                </Button>
                {u.status !== "rejected" && (
                  <Button size="sm" variant="outline" onClick={() => act(u.id, "reject")} data-testid={`reject-${u.id}`} className="border-expense/40 text-expense hover:bg-expense/10 hover:text-expense">
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Reddet
                  </Button>
                )}
                {u.status === "approved" && (
                  <Button size="sm" variant="outline" onClick={() => act(u.id, "revoke")} data-testid={`revoke-${u.id}`}>
                    <Undo2 className="h-3.5 w-3.5 mr-1" /> Yetkiyi Kaldır
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => act(u.id, "delete", "Kullanıcı ve tüm verileri silinsin mi? Bu işlem geri alınamaz.")}
                  data-testid={`delete-user-${u.id}`}
                  className="ml-auto text-muted-foreground hover:text-expense hover:border-expense/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">Kullanıcıyı Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Ad Soyad</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} data-testid="admin-edit-name" />
            </div>
            <div className="space-y-1.5">
              <Label>E-posta</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} data-testid="admin-edit-email" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>İptal</Button>
            <Button onClick={saveEdit} data-testid="admin-edit-save" className="bg-brand text-white hover:bg-brand/90">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password reset dialog */}
      <Dialog open={!!resetting} onOpenChange={(o) => !o && setResetting(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">Şifreyi Sıfırla</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">{resetting?.name}</span> için yeni bir şifre belirleyin. Sonra bu şifreyi kullanıcıya iletin.
            </div>
            <div className="space-y-1.5">
              <Label>Yeni Şifre (en az 8 karakter)</Label>
              <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} data-testid="admin-reset-pw-input" autoComplete="new-password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetting(null)}>İptal</Button>
            <Button onClick={doReset} disabled={pwLoading} data-testid="admin-reset-pw-save" className="bg-brand text-white hover:bg-brand/90">
              {pwLoading ? "Kaydediliyor…" : "Yeni Şifreyi Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
