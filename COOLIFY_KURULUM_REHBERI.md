# 🟣 Digiloq Coolify Kurulum Rehberi

Coolify üzerinden Digiloq uygulamasını kurarken 2 seçeneğiniz vardır. **1. Yöntem (Docker Compose)** açık ara en kolay, en hızlı ve sıfır hata veren yöntemdir.

---

## 🌟 1. YÖNTEM: Docker Compose ile Tek Tıkla Kurulum (En Çok Önerilen)

Bu yöntemle **MongoDB + Python FastAPI Backend + React Frontend** tek bir komutla veya tek tıkla ayağa kalkar, Nginx ters vekili sayesinde CORS ve SSL problemleri tamamen ortadan kalkar.

### Adımlar:
1. **Coolify Paneline Giriş Yapın.**
2. Sol menüden **Projects** > İlgili Projenizi seçin (veya **Default**).
3. **+ New Resource** (Yeni Kaynak Ekle) butonuna tıklayın.
4. Kaynak türü olarak **Docker Compose** seçin:
   - Eğer projeniz GitHub / Git deposundaysa: **Docker Compose based on Git repository** seçip deponuzu bağlayın.
   - Eğer dosyaları kopyalayarak kurmak isterseniz: **Docker Compose Empty** seçin ve açılan alana projedeki `docker-compose.yml` içeriğini yapıştırın.
5. **Environment Variables (Ortam Değişkenleri)** sekmesine sadece şunları eklemeniz yeterlidir:
   - `JWT_SECRET`: `super_secret_jwt_key_digiloq_2026_xyz`
   - `OWNER_EMAIL`: `admin@digiloq.com` (Giriş yapacağınız ilk yönetici maili)
   - `OWNER_PASSWORD`: `Admin123456!` (Yönetici şifreniz)
   - `OWNER_NAME`: `Digiloq Admin`
6. **Domains** kısmına alan adınızı yazın (Örn: `https://digiloq.com` veya `http://SUNUCU_IP`).
7. **Deploy** butonuna basın. Birkaç dakika içinde her şey hazır olacaktır!

---

## 🛠️ 2. YÖNTEM: Servisleri Ayrı Ayrı Kurma (Şu an ekranda olduğunuz yöntem)

Eğer Coolify'da bir **Application** açtıysanız ve ekran görüntüsündeki **"New Environment Variable"** ekranındaysanız:

### A) Eğer şu an BACKEND (FastAPI) servisini kuruyorsanız:
Aşağıdaki değişkenleri **"Add variable"** diyerek tek tek ekleyin:

| Name (Değişken Adı) | Value (Değer) | Açıklama |
| :--- | :--- | :--- |
| **`MONGO_URL`** | `mongodb://...` | Coolify'da kurduğunuz MongoDB'nin Internal Bağlantı Linki |
| **`DB_NAME`** | `kasa_takip` | Veritabanı adı |
| **`JWT_SECRET`** | `super_gizli_jwt_anahtari_digiloq_2026` | Token şifreleme anahtarı |
| **`OWNER_EMAIL`** | `admin@digiloq.com` | İlk süper admin e-postası |
| **`OWNER_PASSWORD`** | `GucluSifre2026!` | İlk süper admin şifresi |
| **`OWNER_NAME`** | `Digiloq Admin` | Süper admin adı |
| **`CORS_ORIGINS`** | `*` veya `https://digiloq.com` | İzin verilen frontend domaini |

*Not: Backend için Port ayarını `8000` yapmayı unutmayın.*

---

### B) Eğer şu an FRONTEND (React) servisini kuruyorsanız:

| Name (Değişken Adı) | Value (Değer) | Seçenekler |
| :--- | :--- | :--- |
| **`REACT_APP_BACKEND_URL`** | `https://api.digiloq.com` *(veya backend domaininiz)* | **Build time:** `Available during build` mutlaka SEÇİLİ OLMALI |

> ⚠️ **DİKKAT (Frontend İçin Önemli Kural):**
> React istemci taraflı (tarayıcıda) çalıştığı için `REACT_APP_BACKEND_URL` değişkeninin **Build time (Available during build)** kutucuğunun açık olması zorunludur! Aksi takdirde React derlenirken backend adresini alamaz ve istekler başarısız olur.
