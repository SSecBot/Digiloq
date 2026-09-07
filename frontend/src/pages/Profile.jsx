import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { formatApiError, api } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Camera, User as UserIcon, Save, Lock, Trash2, AlertTriangle,
  Globe, FileSpreadsheet, FileText, Download, Printer, ShieldCheck, Upload, Database
} from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency, formatDate } from "@/lib/format";

function Avatar({ src, name, size = 80 }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ height: size, width: size }}
        className="rounded-2xl object-cover border border-border"
      />
    );
  }
  return (
    <div
      style={{ height: size, width: size }}
      className="rounded-2xl bg-secondary border border-border flex items-center justify-center shrink-0"
    >
      <span className="font-mono font-bold text-brand" style={{ fontSize: size / 2.5 }}>
        {(name || "?").charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export default function Profile() {
  const { user, updateProfile, deleteAccount } = useAuth();
  const { activeCurrency, setActiveCurrency } = useCurrency();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const backupFileInputRef = useRef(null);

  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [selectedCurrency, setSelectedCurrency] = useState(user?.display_currency || activeCurrency || "TRY");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingBackup, setExportingBackup] = useState(false);
  const [importingBackup, setImportingBackup] = useState(false);

  // Restore confirmation modal
  const [pendingRestoreData, setPendingRestoreData] = useState(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const nameOrEmailChanged =
    name.trim() !== (user?.name || "") ||
    email.trim().toLowerCase() !== (user?.email || "") ||
    selectedCurrency !== (user?.display_currency || activeCurrency);

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
      } catch (err) {
        toast.error(formatApiError(err, "Yüklenemedi"));
      } finally {
        setSavingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = async () => {
    setSavingAvatar(true);
    try {
      await updateProfile({ avatar: "" });
      setAvatar("");
      toast.success("Fotoğraf kaldırıldı");
    } catch (err) {
      toast.error(formatApiError(err, "Kaldırılamadı"));
    } finally {
      setSavingAvatar(false);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const payload = {
        name: name.trim(),
        display_currency: selectedCurrency,
      };

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
      setActiveCurrency(selectedCurrency);
      setCurrentPassword("");
      toast.success("Profil ve tercihler güncellendi");
    } catch (err) {
      toast.error(formatApiError(err, "Kaydedilemedi"));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (newPassword.length < 8) return toast.error("Yeni şifre en az 8 karakter olmalı");
    if (newPassword !== confirmPassword) return toast.error("Şifreler eşleşmiyor");
    if (!currentPassword) return toast.error("Mevcut şifre gerekli");
    setSavingPassword(true);
    try {
      await updateProfile({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Şifre güncellendi");
    } catch (err) {
      toast.error(formatApiError(err, "Şifre güncellenemedi"));
    } finally {
      setSavingPassword(false);
    }
  };

  // User Encrypted Backup Export (.digiloq)
  const handleExportUserBackup = async () => {
    setExportingBackup(true);
    try {
      const res = await api.get("/user/export-backup");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `digiloq_user_backup_${new Date().toISOString().slice(0, 10)}.digiloq`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Kişisel yedek dosyanız indirildi (.digiloq HMAC korumalı)");
    } catch (e) {
      toast.error(formatApiError(e, "Yedekleme başarısız"));
    } finally {
      setExportingBackup(false);
    }
  };

  // Select Backup File to Restore
  const handleBackupFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result);
        if (!payload.data || !payload.signature) {
          toast.error("Geçersiz yedek dosyası formatı");
          return;
        }
        setPendingRestoreData(payload);
        setRestoreDialogOpen(true);
      } catch {
        toast.error("Yedek dosyası okunamadı veya bozulmuş");
      } finally {
        if (backupFileInputRef.current) backupFileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  // Execute Restore
  const executeUserRestore = async () => {
    if (!pendingRestoreData) return;
    setImportingBackup(true);
    try {
      const res = await api.post("/user/restore-backup", pendingRestoreData);
      const counts = res.data?.restored || {};
      const countSummary = Object.entries(counts)
        .filter(([_, v]) => v > 0)
        .map(([k, v]) => `${v} ${k}`)
        .join(", ");
      toast.success(`Verileriniz başarıyla geri yüklendi (${countSummary || "Tamamlandı"})`);
      setRestoreDialogOpen(false);
      setPendingRestoreData(null);
    } catch (err) {
      toast.error(formatApiError(err, "Yedekten geri yükleme başarısız"));
    } finally {
      setImportingBackup(false);
    }
  };

  // Export to Excel / CSV
  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const res = await api.get("/export/data");
      const { incomes = [], expenses = [] } = res.data;

      let csv = "\uFEFF"; // UTF-8 BOM for Excel Turkish character support
      csv += "TÜR,BAŞLIK/MÜŞTERİ,KATEGORİ/AÇIKLAMA,TUTAR,PARA BİRİMİ,TARİH/VADE,DURUM\n";

      incomes.forEach((i) => {
        const title = `"${(i.customer || "").replace(/"/g, '""')}"`;
        const desc = `"${(i.description || "").replace(/"/g, '""')}"`;
        csv += `GELİR,${title},${desc},${i.amount},${i.currency},${i.due_date},${i.status}\n`;
      });

      expenses.forEach((e) => {
        const title = `"${(e.title || "").replace(/"/g, '""')}"`;
        const cat = `"${(e.category || "").replace(/"/g, '""')}"`;
        csv += `GİDER,${title},${cat},${e.amount},${e.currency},${e.date},${e.status}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `digiloq_finans_kayitlari_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Excel tablosu (.csv) indirildi");
    } catch (e) {
      toast.error("Dışa aktarma başarısız");
    } finally {
      setExportingExcel(false);
    }
  };

  // Export to Printable PDF Report
  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const res = await api.get("/export/data");
      const { incomes = [], expenses = [], accounts = [] } = res.data;

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Açılır pencere engellendi, lütfen izin verin.");
        return;
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Digiloq Finansal Rapor</title>
          <style>
            body { font-family: 'Segoe UI', Roboto, sans-serif; padding: 30px; color: #111; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #ea580c; padding-bottom: 15px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; color: #0f172a; }
            .meta { font-size: 12px; color: #64748b; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; }
            .stat-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; background: #f8fafc; }
            .stat-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; }
            .stat-val { font-size: 18px; font-weight: bold; margin-top: 4px; font-family: monospace; }
            h3 { font-size: 16px; margin-top: 25px; margin-bottom: 10px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
            th { background: #f1f5f9; font-weight: 600; text-transform: uppercase; font-size: 10px; color: #475569; }
            .text-right { text-align: right; }
            .income { color: #16a34a; font-weight: bold; }
            .expense { color: #dc2626; font-weight: bold; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">DIGILOQ</div>
              <div class="meta">Müşteri, Şirket & Finansal Akış Raporu</div>
            </div>
            <div class="text-right">
              <div class="meta">Kullanıcı: ${user?.name || "Kullanıcı"} (${user?.email})</div>
              <div class="meta">Tarih: ${new Date().toLocaleDateString("tr-TR")}</div>
            </div>
          </div>

          <div class="summary">
            <div class="stat-box">
              <div class="stat-label">Toplam Gelir Kaydı</div>
              <div class="stat-val income">${incomes.length} Adet</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Toplam Gider Kaydı</div>
              <div class="stat-val expense">${expenses.length} Adet</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Banka Hesapları</div>
              <div class="stat-val">${accounts.length} Hesap</div>
            </div>
          </div>

          <h3>Gelirler (Alacaklar)</h3>
          <table>
            <thead>
              <tr>
                <th>Müşteri / Kaynak</th>
                <th>Açıklama</th>
                <th>Vade Tarihi</th>
                <th>Durum</th>
                <th class="text-right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              ${incomes.map((i) => `
                <tr>
                  <td>${i.customer || "-"}</td>
                  <td>${i.description || "-"}</td>
                  <td>${i.due_date || "-"}</td>
                  <td>${i.status}</td>
                  <td class="text-right income">+${i.amount} ${i.currency}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <h3>Giderler</h3>
          <table>
            <thead>
              <tr>
                <th>Başlık</th>
                <th>Kategori</th>
                <th>Tarih</th>
                <th>Durum</th>
                <th class="text-right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              ${expenses.map((e) => `
                <tr>
                  <td>${e.title || "-"}</td>
                  <td>${e.category || "-"}</td>
                  <td>${e.date || "-"}</td>
                  <td>${e.status}</td>
                  <td class="text-right expense">−${e.amount} ${e.currency}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      toast.success("Rapor yazdırılmaya hazırlandı");
    } catch (e) {
      toast.error("Rapor oluşturulamadı");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-4 sm:space-y-5" data-testid="profile-page">
      {/* Avatar card */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-5 flex-wrap">
          <Avatar src={avatar} name={user?.name} size={76} />
          <div className="flex-1 min-w-[180px]">
            <div className="font-display text-xl font-bold text-foreground">{user?.name}</div>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
            <div className="mt-1 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-brand font-semibold">
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
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={savingAvatar}
              data-testid="avatar-upload-btn"
              className="border-brand/40 text-brand hover:bg-brand/10 hover:text-brand rounded-xl text-xs"
            >
              <Camera className="h-3.5 w-3.5 mr-1.5" />
              {savingAvatar ? "Yükleniyor…" : "Fotoğraf"}
            </Button>
            {avatar && (
              <Button
                variant="outline"
                size="sm"
                onClick={removeAvatar}
                disabled={savingAvatar}
                data-testid="avatar-remove-btn"
                className="rounded-xl text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Preferences & Personal Info */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-xs">
        <div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
            Profil & Tercihler
          </div>
          <div className="font-display text-base sm:text-lg font-bold mt-0.5">Kişisel Bilgiler</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <Label className="text-xs">Ad Soyad</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="profile-name-input"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">E-posta</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="profile-email-input"
              className="rounded-xl"
            />
          </div>

          {/* Active Display Currency Selector */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <Globe className="h-3.5 w-3.5 text-brand" /> Aktif Görüntüleme Para Birimi
            </Label>
            <Select
              value={selectedCurrency}
              onValueChange={(v) => setSelectedCurrency(v)}
            >
              <SelectTrigger data-testid="profile-display-currency-select" className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border rounded-xl">
                <SelectItem value="TRY">TRY ₺ (Türk Lirası)</SelectItem>
                <SelectItem value="USD">USD $ (Amerikan Doları)</SelectItem>
                <SelectItem value="EUR">EUR € (Euro)</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[10px] text-muted-foreground">
              Tüm bakiye, öngörü ve grafikler bu para birimine dönüştürülür.
            </span>
          </div>

          {email.trim().toLowerCase() !== (user?.email || "") && (
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs">Mevcut Şifre (e-posta değişikliği için)</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                data-testid="profile-current-pw-input"
                className="rounded-xl"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            onClick={saveProfile}
            disabled={savingProfile || !nameOrEmailChanged}
            data-testid="profile-save-btn"
            className="bg-brand text-white hover:bg-brand/90 rounded-xl text-xs"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {savingProfile ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
          </Button>
        </div>
      </div>

      {/* User-Level Encrypted Backup & Restore Card (.digiloq) */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3.5 shadow-xs" data-testid="user-backup-section">
        <div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-brand font-semibold flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Kişisel Şifreli Yedekleme (.digiloq)
          </div>
          <div className="font-display text-base sm:text-lg font-bold mt-0.5">Kullanıcı Veri Yedeği & Geri Yükleme</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tüm kişisel gelir, gider, tekrarlı işlem, banka hesabı, görev ve Kanban sütunlarınızı HMAC-SHA256 imzalı korumalı dosya olarak yedekleyin veya geri yükleyin.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="border border-border rounded-xl p-3.5 bg-[#16181d] flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5 text-brand" /> Kişisel Yedeği İndir
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Tüm verilerinizi tek tıklamayla imzalı `.digiloq` dosyasında saklayın.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleExportUserBackup}
              disabled={exportingBackup}
              data-testid="user-export-backup-btn"
              className="bg-brand text-white hover:bg-brand/90 rounded-xl text-xs w-full"
            >
              {exportingBackup ? "Hazırlanıyor…" : "Yedek Dosyasını İndir (.digiloq)"}
            </Button>
          </div>

          <div className="border border-border rounded-xl p-3.5 bg-[#16181d] flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5 text-income" /> Yedekten Geri Yükle
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Geçerli bir `.digiloq` yedek dosyasını yükleyerek hesabınızı senkronize edin.
              </p>
            </div>

            <input
              ref={backupFileInputRef}
              type="file"
              accept=".digiloq,.json"
              className="hidden"
              onChange={handleBackupFileSelect}
            />

            <Button
              size="sm"
              variant="outline"
              onClick={() => backupFileInputRef.current?.click()}
              disabled={importingBackup}
              data-testid="user-restore-backup-btn"
              className="border-income/40 text-income hover:bg-income/10 rounded-xl text-xs w-full"
            >
              {importingBackup ? "Geri Yükleniyor…" : "Yedek Dosyası Seç (.digiloq)"}
            </Button>
          </div>
        </div>
      </div>

      {/* Restore User Backup Confirmation Modal */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="bg-card border-border max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-income text-base">
              <ShieldCheck className="h-5 w-5" /> Yedekten Geri Yüklemeyi Onayla
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 text-xs text-muted-foreground">
            <p>
              Yedek dosyasındaki veriler hesabınıza geri yüklenecektir.
            </p>
            {pendingRestoreData?.counts && (
              <div className="bg-[#141518] p-2.5 rounded-xl border border-border space-y-1 font-mono text-[11px] text-foreground/90">
                <div>Gelir Kayıtları: {pendingRestoreData.counts.receivables || 0}</div>
                <div>Gider Kayıtları: {pendingRestoreData.counts.expenses || 0}</div>
                <div>Banka Hesapları: {pendingRestoreData.counts.accounts || 0}</div>
                <div>Görevler: {pendingRestoreData.counts.tasks || 0}</div>
                <div>Kanban Sütunları: {pendingRestoreData.counts.kanban_columns || 0}</div>
              </div>
            )}
            <p className="text-[11px]">Mevcut verileriniz bu yedekteki veriler ile güvenle güncellenecektir.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)} className="rounded-xl text-xs">
              İptal
            </Button>
            <Button
              onClick={executeUserRestore}
              disabled={importingBackup}
              data-testid="confirm-user-restore-btn"
              className="bg-income text-black font-semibold hover:bg-income/90 rounded-xl text-xs"
            >
              {importingBackup ? "Geri Yükleniyor…" : "Geri Yüklemeyi Başlat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Data Export Section (Excel & PDF) */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3.5 shadow-xs">
        <div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
            Dışa Aktarma
          </div>
          <div className="font-display text-base sm:text-lg font-bold mt-0.5">Rapor & Elektronik Tablo</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kişisel gelir ve gider kayıtlarınızı Excel elektronik tablosu veya yazdırılabilir PDF raporu olarak indirin.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={exportingExcel}
            data-testid="export-excel-btn"
            className="border-border hover:border-brand hover:text-brand flex items-center justify-center gap-2 h-10 rounded-xl text-xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-income" />
            <span>{exportingExcel ? "Hazırlanıyor…" : "Excel Tablosu (.csv)"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={exportingPdf}
            data-testid="export-pdf-btn"
            className="border-border hover:border-brand hover:text-brand flex items-center justify-center gap-2 h-10 rounded-xl text-xs"
          >
            <Printer className="h-4 w-4 text-brand" />
            <span>{exportingPdf ? "Oluşturuluyor…" : "PDF / Yazdır Raporu"}</span>
          </Button>
        </div>
      </div>

      {/* Password Change */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3.5 shadow-xs">
        <div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
            Güvenlik
          </div>
          <div className="font-display text-base sm:text-lg font-bold mt-0.5">Şifre Değiştir</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Mevcut Şifre</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              data-testid="pw-current-input"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Yeni Şifre</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              data-testid="pw-new-input"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Yeni Şifre (tekrar)</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              data-testid="pw-confirm-input"
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            onClick={savePassword}
            disabled={savingPassword || !newPassword || !currentPassword}
            data-testid="pw-save-btn"
            className="bg-brand text-white hover:bg-brand/90 rounded-xl text-xs"
          >
            <Lock className="h-3.5 w-3.5 mr-1.5" />
            {savingPassword ? "Kaydediliyor…" : "Şifreyi Güncelle"}
          </Button>
        </div>
      </div>

      {/* Danger zone */}
      {user?.role !== "owner" && (
        <div className="bg-card border border-expense/30 rounded-2xl p-5 space-y-3 shadow-xs">
          <div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-expense font-semibold">
              Tehlikeli Alan
            </div>
            <div className="font-display text-base sm:text-lg font-bold mt-0.5">Hesabı Sil</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hesabınız ve tüm verileriniz kalıcı olarak silinir. Bu işlem geri alınamaz.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDeleteOpen(true)}
              data-testid="delete-account-btn"
              className="border-expense/40 text-expense hover:bg-expense/10 hover:text-expense rounded-xl text-xs"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Hesabımı Sil
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          if (!o) setDeleteConfirm("");
        }}
      >
        <DialogContent className="bg-card border-border rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-base text-expense">
              <AlertTriangle className="h-5 w-5" /> Hesabı Silmek İstediğinize Emin misiniz?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-xs text-muted-foreground">
              Bu işlem <span className="text-foreground font-medium">geri alınamaz</span>. Onaylamak için aşağıya{" "}
              <span className="text-expense font-mono font-bold">SİL</span> yazın.
            </p>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="SİL"
              data-testid="delete-confirm-input"
              className="rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="rounded-xl text-xs">
              İptal
            </Button>
            <Button
              onClick={async () => {
                setDeleting(true);
                try {
                  await deleteAccount();
                  toast.success("Hesabınız silindi");
                  navigate("/", { replace: true });
                } catch (err) {
                  toast.error(formatApiError(err, "Silinemedi"));
                } finally {
                  setDeleting(false);
                }
              }}
              disabled={deleting || deleteConfirm !== "SİL"}
              data-testid="delete-confirm-btn"
              className="bg-expense text-white hover:bg-expense/90 rounded-xl text-xs"
            >
              {deleting ? "Siliniyor…" : "Hesabımı Kalıcı Olarak Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
