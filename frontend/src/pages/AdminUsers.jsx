import { useEffect, useState, useRef } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckCircle2, XCircle, Undo2, Trash2, ShieldCheck, User as UserIcon,
  KeyRound, Pencil, Download, Upload, Sliders, Database, UserPlus, AlertTriangle
} from "lucide-react";

const STATUS = {
  pending: { label: "Onay Bekliyor", cls: "bg-warn/10 text-warn border-warn/20" },
  approved: { label: "Onaylı", cls: "bg-income/10 text-income border-income/20" },
  rejected: { label: "Reddedildi", cls: "bg-expense/10 text-expense border-expense/20" },
};

function AvatarSmall({ user }) {
  if (user?.avatar) {
    return <img src={user.avatar} alt={user.name} className="h-9 w-9 rounded-xl object-cover border border-border" />;
  }
  return (
    <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center border border-border shrink-0">
      {user?.role === "owner" ? <ShieldCheck className="h-4 w-4 text-brand" /> : <UserIcon className="h-4 w-4 text-brand" />}
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users"); // "users" | "settings" | "database"
  const [userStatusFilter, setUserStatusFilter] = useState("all");

  // System settings state
  const [settings, setSettings] = useState({
    default_interest_rate: 0.039,
    default_min_payment_pct: 0.20,
    default_currency: "TRY",
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Manual User Creation state
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "member",
  });

  // Edit User state
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "" });

  // Password reset state
  const [resetting, setResetting] = useState(null);
  const [newPw, setNewPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Delete User Confirmation Modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // DB Backup file input ref
  const fileInputRef = useRef(null);
  const [exportingDb, setExportingDb] = useState(false);
  const [importingDb, setImportingDb] = useState(false);

  const loadData = async () => {
    try {
      const [uRes, sRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/settings").catch(() => ({ data: {} })),
      ]);
      setUsers(uRes.data || []);
      if (sRes.data?.default_interest_rate !== undefined) {
        setSettings({
          default_interest_rate: sRes.data.default_interest_rate,
          default_min_payment_pct: sRes.data.default_min_payment_pct,
          default_currency: sRes.data.default_currency || "TRY",
        });
      }
    } catch (e) {
      toast.error(formatApiError(e, "Admin verileri yüklenemedi"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUserAction = async (uid, action) => {
    try {
      await api.post(`/admin/users/${uid}/${action}`);
      toast.success("İşlem başarıyla tamamlandı");
      loadData();
    } catch (e) {
      toast.error(formatApiError(e, "İşlem başarısız"));
      loadData();
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    const uid = deleteTarget.id || deleteTarget._id;
    setDeleting(true);
    // Optimistic instantaneous UI update
    setUsers((prev) => prev.filter((u) => u.id !== uid && u._id !== uid));
    try {
      await api.delete(`/admin/users/${uid}`);
      toast.success("Kullanıcı ve ilişkili tüm verileri silindi");
      setDeleteTarget(null);
      loadData();
    } catch (e) {
      toast.error(formatApiError(e, "Kullanıcı silinemedi"));
      loadData();
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateUser = async () => {
    if (!createForm.name.trim() || !createForm.email.trim()) {
      return toast.error("Ad ve e-posta zorunludur");
    }
    if (createForm.password.length < 8) {
      return toast.error("Şifre en az 8 karakter olmalıdır");
    }

    try {
      await api.post("/admin/users", {
        name: createForm.name.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        role: createForm.role,
      });
      toast.success("Yeni kullanıcı başarıyla oluşturuldu ve onaylandı");
      setCreateOpen(false);
      setCreateForm({ name: "", email: "", password: "", role: "member" });
      loadData();
    } catch (e) {
      toast.error(formatApiError(e, "Kullanıcı oluşturulamadı"));
    }
  };

  const saveSettings = async () => {
    setSettingsLoading(true);
    try {
      await api.patch("/admin/settings", settings);
      toast.success("Sistem varsayılanları kaydedildi");
    } catch (e) {
      toast.error(formatApiError(e, "Ayarlar kaydedilemedi"));
    } finally {
      setSettingsLoading(false);
    }
  };

  const openEdit = (u) => {
    setEditing(u);
    setEditForm({ name: u.name, email: u.email });
  };

  const saveEdit = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) return toast.error("Ad ve e-posta zorunludur");
    try {
      await api.patch(`/admin/users/${editing.id}`, {
        name: editForm.name.trim(),
        email: editForm.email.trim().toLowerCase(),
      });
      toast.success("Kullanıcı güncellendi");
      setEditing(null);
      loadData();
    } catch (e) {
      toast.error(formatApiError(e, "Kaydedilemedi"));
    }
  };

  const openReset = (u) => {
    setResetting(u);
    setNewPw("");
  };

  const doReset = async () => {
    if (newPw.length < 8) return toast.error("Şifre en az 8 karakter olmalıdır");
    setPwLoading(true);
    try {
      await api.post(`/admin/users/${resetting.id}/reset-password`, { new_password: newPw });
      toast.success("Şifre sıfırlandı");
      setResetting(null);
      setNewPw("");
    } catch (e) {
      toast.error(formatApiError(e, "Sıfırlanamadı"));
    } finally {
      setPwLoading(false);
    }
  };

  // Export DB
  const handleExportDatabase = async () => {
    setExportingDb(true);
    try {
      const res = await api.get("/admin/export-database");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `digiloq_db_backup_${new Date().toISOString().slice(0, 10)}.digiloq`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Sistem veritabanı yedeği indirildi (.digiloq HMAC korumalı)");
    } catch (e) {
      toast.error(formatApiError(e, "Yedekleme başarısız"));
    } finally {
      setExportingDb(false);
    }
  };

  // Import DB
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("Dikkat! Bu işlem mevcut veritabanını yedek dosyasındaki verilerle değiştirecektir. Devam edilsin mi?")) {
      e.target.value = "";
      return;
    }

    setImportingDb(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const payload = JSON.parse(reader.result);
        await api.post("/admin/restore-database", payload);
        toast.success("Veritabanı başarıyla geri yüklendi");
        loadData();
      } catch (err) {
        toast.error(formatApiError(err, "Yedekten geri yükleme başarısız"));
      } finally {
        setImportingDb(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const filteredUsers = users.filter((u) => {
    if (u.role === "owner") return userStatusFilter === "all";
    if (userStatusFilter === "all") return true;
    return u.status === userStatusFilter;
  });

  const counts = users.reduce(
    (acc, u) => {
      if (u.role === "owner") return acc;
      acc[u.status] = (acc[u.status] || 0) + 1;
      return acc;
    },
    { pending: 0, approved: 0, rejected: 0 }
  );

  return (
    <div className="space-y-5" data-testid="admin-users-page">
      {/* Tab Selector Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap gap-1.5 bg-card/60 p-1 border border-border rounded-xl">
          <button
            onClick={() => setActiveTab("users")}
            data-testid="admin-tab-users-nav"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "users"
                ? "bg-secondary text-foreground border border-border shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            <UserIcon className="h-3.5 w-3.5 text-brand" />
            <span>Kullanıcı Yönetimi</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            data-testid="admin-tab-settings-nav"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "settings"
                ? "bg-secondary text-foreground border border-border shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            <Sliders className="h-3.5 w-3.5 text-brand" />
            <span>Sistem Varsayılanları</span>
          </button>

          <button
            onClick={() => setActiveTab("database")}
            data-testid="admin-tab-db-nav"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "database"
                ? "bg-secondary text-foreground border border-border shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            <Database className="h-3.5 w-3.5 text-brand" />
            <span>Veritabanı Yedek & Taşıma</span>
          </button>
        </div>

        {activeTab === "users" && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="admin-create-user-btn"
                className="bg-brand text-white hover:bg-brand/90 text-xs h-9 rounded-xl shadow-xs"
              >
                <UserPlus className="h-4 w-4 mr-1.5" /> Kullanıcı Oluştur
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-display">Yeni Kullanıcı Hesabı</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Ad Soyad</Label>
                  <Input
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Örn. Ahmet Yılmaz"
                    data-testid="admin-new-user-name"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">E-posta</Label>
                  <Input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="ahmet@example.com"
                    data-testid="admin-new-user-email"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Şifre (En az 8 karakter)</Label>
                  <Input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="••••••••"
                    data-testid="admin-new-user-password"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Rol</Label>
                  <Select
                    value={createForm.role}
                    onValueChange={(v) => setCreateForm({ ...createForm, role: v })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border rounded-xl">
                      <SelectItem value="member">Üye (Member)</SelectItem>
                      <SelectItem value="owner">Yönetici (Owner)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">
                  İptal
                </Button>
                <Button
                  onClick={handleCreateUser}
                  data-testid="admin-new-user-submit"
                  className="bg-brand text-white hover:bg-brand/90 rounded-xl"
                >
                  Hesabı Oluştur
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tab 1: Users List */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1 bg-card/60 border border-border rounded-xl p-1 w-fit">
            {[
              { k: "all", l: "Tümü" },
              { k: "pending", l: `Onay Bekleyen (${counts.pending})` },
              { k: "approved", l: `Onaylı (${counts.approved})` },
              { k: "rejected", l: `Reddedilen (${counts.rejected})` },
            ].map((t) => (
              <button
                key={t.k}
                data-testid={`admin-filter-${t.k}`}
                onClick={() => setUserStatusFilter(t.k)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  userStatusFilter === t.k
                    ? "bg-secondary text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.l}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {loading && <div className="text-muted-foreground text-xs col-span-full">Yükleniyor…</div>}
            {!loading && filteredUsers.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground border border-dashed border-border rounded-2xl p-10 text-xs">
                Bu sekmede kullanıcı kaydı bulunmamaktadır.
              </div>
            )}

            {filteredUsers.map((u) => {
              const uid = u.id || u._id;
              return (
                <div
                  key={uid}
                  className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-xs hover:border-zinc-700 transition-all"
                  data-testid={`admin-user-${uid}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AvatarSmall user={u} />
                      <div className="min-w-0">
                        <div className="font-display text-sm font-semibold truncate text-foreground">{u.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] rounded-lg ${STATUS[u.status]?.cls || ""}`}>
                      {u.role === "owner" ? "Sahibi" : STATUS[u.status]?.label}
                    </Badge>
                  </div>

                  {u.role !== "owner" && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-border/50">
                      {u.status !== "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); handleUserAction(uid, "approve"); }}
                          data-testid={`approve-${uid}`}
                          className="border-income/40 text-income hover:bg-income/10 hover:text-income text-xs h-7 px-2 rounded-lg"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Onayla
                        </Button>
                      )}

                      {u.status === "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); openReset(u); }}
                          data-testid={`reset-pw-${uid}`}
                          className="border-brand/40 text-brand hover:bg-brand/10 hover:text-brand text-xs h-7 px-2 rounded-lg"
                        >
                          <KeyRound className="h-3 w-3 mr-1" /> Şifre
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); openEdit(u); }}
                        data-testid={`edit-${uid}`}
                        className="text-xs h-7 px-2 rounded-lg"
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Düzenle
                      </Button>

                      {u.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); handleUserAction(uid, "reject"); }}
                          data-testid={`reject-${uid}`}
                          className="border-expense/40 text-expense hover:bg-expense/10 hover:text-expense text-xs h-7 px-2 rounded-lg"
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Reddet
                        </Button>
                      )}

                      {u.status === "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); handleUserAction(uid, "revoke"); }}
                          data-testid={`revoke-${uid}`}
                          className="text-xs h-7 px-2 rounded-lg text-muted-foreground"
                        >
                          <Undo2 className="h-3 w-3 mr-1" /> Yetkiyi Kaldır
                        </Button>
                      )}

                      {/* Delete User Button triggering confirmation modal */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(u); }}
                        data-testid={`delete-user-${uid}`}
                        className="ml-auto text-muted-foreground hover:text-expense hover:border-expense/40 text-xs h-7 px-2 rounded-lg"
                        title="Kullanıcıyı Sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: System & Financial Defaults */}
      {activeTab === "settings" && (
        <div className="bg-card border border-border rounded-2xl p-5 max-w-2xl space-y-5 shadow-xs">
          <div>
            <h3 className="font-display text-base font-bold">Genel Finans & Kredi Borç Varsayılanları</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kullanıcılar yeni kredi borcu veya işlem oluştururken boş bıraktıklarında uygulanacak sistem varsayılanlarıdır.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Varsayılan Faiz Oranı (%)</Label>
              <Input
                type="number"
                step="0.1"
                data-testid="admin-setting-interest-rate"
                value={(settings.default_interest_rate * 100).toFixed(1)}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    default_interest_rate: Number(e.target.value) / 100,
                  })
                }
                className="rounded-xl"
              />
              <span className="text-[10px] text-muted-foreground">
                Sistem varsayılanı: %3.9 (0.039)
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Varsayılan Asgari Ödeme Yüzdesi (%)</Label>
              <Input
                type="number"
                step="1"
                data-testid="admin-setting-min-payment"
                value={(settings.default_min_payment_pct * 100).toFixed(0)}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    default_min_payment_pct: Number(e.target.value) / 100,
                  })
                }
                className="rounded-xl"
              />
              <span className="text-[10px] text-muted-foreground">
                Sistem varsayılanı: %20 (0.20)
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Varsayılan Para Birimi</Label>
              <Select
                value={settings.default_currency}
                onValueChange={(v) =>
                  setSettings({ ...settings, default_currency: v })
                }
              >
                <SelectTrigger data-testid="admin-setting-currency" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-xl">
                  <SelectItem value="TRY">TRY ₺</SelectItem>
                  <SelectItem value="USD">USD $</SelectItem>
                  <SelectItem value="EUR">EUR €</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              onClick={saveSettings}
              disabled={settingsLoading}
              data-testid="admin-save-settings-btn"
              className="bg-brand text-white hover:bg-brand/90 rounded-xl"
            >
              {settingsLoading ? "Kaydediliyor…" : "Varsayılanları Kaydet"}
            </Button>
          </div>
        </div>
      )}

      {/* Tab 3: Database Encrypted Export & Migration */}
      {activeTab === "database" && (
        <div className="bg-card border border-border rounded-2xl p-5 max-w-2xl space-y-5 shadow-xs">
          <div>
            <h3 className="font-display text-base font-bold">Taşınabilir Veritabanı Yedekleme & Geri Yükleme</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tüm MongoDB koleksiyonlarını HMAC-SHA256 imzalı taşınabilir JSON yedeği olarak dışa aktarın veya geri yükleyin.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Export Card */}
            <div className="border border-border rounded-2xl p-4 bg-[#16181d] flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                  <Download className="h-4 w-4 text-brand" /> Yedeği İndir
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Kullanıcılar, gelirler, giderler, hesaplar ve iş akışı kartlarını güvenli imzalı dosyaya aktarır.
                </p>
              </div>

              <Button
                onClick={handleExportDatabase}
                disabled={exportingDb}
                data-testid="admin-export-db-btn"
                className="bg-brand text-white hover:bg-brand/90 w-full rounded-xl text-xs"
              >
                {exportingDb ? "Yedekleniyor…" : "Yedek Dosyasını İndir (.digiloq)"}
              </Button>
            </div>

            {/* Import Card */}
            <div className="border border-border rounded-2xl p-4 bg-[#16181d] flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                  <Upload className="h-4 w-4 text-income" /> Yedekten Geri Yükle
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  İmzalanmış geçerli bir yedek dosyasını yükleyerek veritabanını senkronize eder.
                </p>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept=".json,.digiloq"
                className="hidden"
                onChange={handleImportFile}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importingDb}
                data-testid="admin-import-db-btn"
                className="border-income/40 text-income hover:bg-income/10 w-full rounded-xl text-xs"
              >
                {importingDb ? "Geri Yükleniyor…" : "Yedek Dosyası Seç (.digiloq)"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="bg-card border-border max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-expense text-base">
              <AlertTriangle className="h-5 w-5" /> Kullanıcıyı Sil
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 text-xs text-muted-foreground">
            <p>
              <strong className="text-foreground">{deleteTarget?.name}</strong> ({deleteTarget?.email}) kullanıcısını ve bu kullanıcıya ait tüm gelir, gider, hesap ve görev kayıtlarını kalıcı olarak silmek istediğinize emin misiniz?
            </p>
            <p className="text-expense/90 font-medium">Bu işlem geri alınamaz.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="rounded-xl text-xs">
              İptal
            </Button>
            <Button
              onClick={confirmDeleteUser}
              disabled={deleting}
              data-testid="confirm-delete-user-btn"
              className="bg-expense text-white hover:bg-expense/90 rounded-xl text-xs"
            >
              {deleting ? "Siliniyor…" : "Kullanıcıyı Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-card border-border rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Kullanıcıyı Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Ad Soyad</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                data-testid="admin-edit-name"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">E-posta</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                data-testid="admin-edit-email"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} className="rounded-xl">
              İptal
            </Button>
            <Button
              onClick={saveEdit}
              data-testid="admin-edit-save"
              className="bg-brand text-white hover:bg-brand/90 rounded-xl"
            >
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={!!resetting} onOpenChange={(o) => !o && setResetting(null)}>
        <DialogContent className="bg-card border-border rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Şifreyi Sıfırla</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="text-xs text-muted-foreground">
              <span className="text-foreground font-medium">{resetting?.name}</span> için yeni şifre belirleyin.
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Yeni Şifre (en az 8 karakter)</Label>
              <Input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                data-testid="admin-reset-pw-input"
                autoComplete="new-password"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetting(null)} className="rounded-xl">
              İptal
            </Button>
            <Button
              onClick={doReset}
              disabled={pwLoading}
              data-testid="admin-reset-pw-save"
              className="bg-brand text-white hover:bg-brand/90 rounded-xl"
            >
              {pwLoading ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
