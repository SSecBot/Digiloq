import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Camera, User as UserIcon, Save, Lock, Trash2, AlertTriangle } from "lucide-react";

function Avatar({ src, name, size = 96 }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ height: size, width: size }}
        className="rounded-full object-cover border border-border"
      />
    );
  }
  return (
    <div
      style={{ height: size, width: size }}
      className="rounded-full bg-secondary border border-border flex items-center justify-center"
    >
      <span className="font-mono font-bold text-brand" style={{ fontSize: size / 2.5 }}>
        {(name || "?").charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export default function Profile() {
  const { user, updateProfile, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const nameOrEmailChanged = name.trim() !== (user?.name || "") || email.trim().toLowerCase() !== (user?.email || "");

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Lütfen bir görsel dosya seçin");
      return;
    }
    if (file.size > 600 * 1024) {
      toast.error("Dosya çok büyük (max 600KB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setAvatar(dataUrl);
      setSavingAvatar(true);
      try {
        await updateProfile({ avatar: dataUrl });
        toast.success("Profil fotoğrafı güncellendi");
      } catch (err) { toast.error(formatApiError(err, "Yüklenemedi")); }
      finally { setSavingAvatar(false); }
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = async () => {
    setSavingAvatar(true);
    try {
      await updateProfile({ avatar: "" });
      setAvatar("");
      toast.success("Fotoğraf kaldırıldı");
    } catch (err) { toast.error(formatApiError(err, "Kaldırılamadı")); }
    finally { setSavingAvatar(false); }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const payload = { name: name.trim() };
      const emailNorm = email.trim().toLowerCase();
      if (emailNorm !== user.email) {
        if (!currentPassword) {
          toast.error("E-posta değiştirmek için mevcut şifre gerekli");
          setSavingProfile(false);
          return;
        }
        payload.email = emailNorm;
        payload.current_password = currentPassword;
      }
      await updateProfile(payload);
      setCurrentPassword("");
      toast.success("Profil güncellendi");
    } catch (err) { toast.error(formatApiError(err, "Kaydedilemedi")); }
    finally { setSavingProfile(false); }
  };

  const savePassword = async () => {
    if (newPassword.length < 8) return toast.error("Yeni şifre en az 8 karakter olmalı");
    if (newPassword !== confirmPassword) return toast.error("Şifreler eşleşmiyor");
    if (!currentPassword) return toast.error("Mevcut şifre gerekli");
    setSavingPassword(true);
    try {
      await updateProfile({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      toast.success("Şifre güncellendi");
    } catch (err) { toast.error(formatApiError(err, "Şifre güncellenemedi")); }
    finally { setSavingPassword(false); }
  };

  return (
    <div className="max-w-3xl space-y-6" data-testid="profile-page">
      {/* Avatar card */}
      <div className="bg-card border border-border rounded-md p-6">
        <div className="flex items-center gap-6 flex-wrap">
          <Avatar src={avatar} name={user?.name} size={96} />
          <div className="flex-1 min-w-[200px]">
            <div className="font-display text-2xl font-bold">{user?.name}</div>
            <div className="text-sm text-muted-foreground">{user?.email}</div>
            <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-brand">
              <UserIcon className="h-3 w-3" />
              {user?.role === "owner" ? "Sahibi" : "Üye"}
            </div>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
              data-testid="avatar-file-input"
            />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={savingAvatar}
              data-testid="avatar-upload-btn"
              className="border-brand/40 text-brand hover:bg-brand/10 hover:text-brand"
            >
              <Camera className="h-4 w-4 mr-1.5" />
              {savingAvatar ? "Yükleniyor…" : "Fotoğraf Yükle"}
            </Button>
            {avatar && (
              <Button variant="outline" onClick={removeAvatar} disabled={savingAvatar} data-testid="avatar-remove-btn">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Basic info */}
      <div className="bg-card border border-border rounded-md p-6 space-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Profil Bilgileri</div>
          <div className="font-display text-xl font-bold mt-1">Kişisel Bilgiler</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Ad Soyad</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="profile-name-input" />
          </div>
          <div className="space-y-1.5">
            <Label>E-posta</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="profile-email-input" />
          </div>
          {email.trim().toLowerCase() !== (user?.email || "") && (
            <div className="md:col-span-2 space-y-1.5">
              <Label>Mevcut Şifre (e-posta değişikliği için)</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} data-testid="profile-current-pw-input" />
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button
            onClick={saveProfile}
            disabled={savingProfile || !nameOrEmailChanged}
            data-testid="profile-save-btn"
            className="bg-brand text-white hover:bg-brand/90"
          >
            <Save className="h-4 w-4 mr-1.5" /> {savingProfile ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>
      </div>

      {/* Password */}
      <div className="bg-card border border-border rounded-md p-6 space-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Güvenlik</div>
          <div className="font-display text-xl font-bold mt-1">Şifre Değiştir</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Mevcut Şifre</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} data-testid="pw-current-input" />
          </div>
          <div className="space-y-1.5">
            <Label>Yeni Şifre</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} data-testid="pw-new-input" />
          </div>
          <div className="space-y-1.5">
            <Label>Yeni Şifre (tekrar)</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} data-testid="pw-confirm-input" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={savePassword}
            disabled={savingPassword || !newPassword || !currentPassword}
            data-testid="pw-save-btn"
            className="bg-brand text-white hover:bg-brand/90"
          >
            <Lock className="h-4 w-4 mr-1.5" /> {savingPassword ? "Kaydediliyor…" : "Şifreyi Güncelle"}
          </Button>
        </div>
      </div>

      {/* Danger zone */}
      {user?.role !== "owner" && (
        <div className="bg-card border border-expense/30 rounded-md p-6 space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-expense font-semibold">Tehlikeli Alan</div>
            <div className="font-display text-xl font-bold mt-1">Hesabı Sil</div>
            <p className="text-sm text-muted-foreground mt-1">
              Hesabınız ve tüm verileriniz (müşteriler, alacaklar, giderler, banka hesapları) kalıcı olarak silinir. Bu işlem geri alınamaz.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(true)}
              data-testid="delete-account-btn"
              className="border-expense/40 text-expense hover:bg-expense/10 hover:text-expense"
            >
              <Trash2 className="h-4 w-4 mr-1.5" /> Hesabımı Sil
            </Button>
          </div>
        </div>
      )}

      <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) setDeleteConfirm(""); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-expense" /> Hesabı Silmek İstediğinize Emin misiniz?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Bu işlem <span className="text-foreground font-medium">geri alınamaz</span>. Hesabınız ve
              tüm veriniz kalıcı olarak silinecek. Devam etmek için aşağıya <span className="text-expense font-mono">SİL</span> yazın.
            </p>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="SİL"
              data-testid="delete-confirm-input"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>İptal</Button>
            <Button
              onClick={async () => {
                setDeleting(true);
                try {
                  await deleteAccount();
                  toast.success("Hesabınız silindi");
                  navigate("/", { replace: true });
                } catch (err) { toast.error(formatApiError(err, "Silinemedi")); }
                finally { setDeleting(false); }
              }}
              disabled={deleting || deleteConfirm !== "SİL"}
              data-testid="delete-confirm-btn"
              className="bg-expense text-white hover:bg-expense/90"
            >
              {deleting ? "Siliniyor…" : "Hesabımı Kalıcı Olarak Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
