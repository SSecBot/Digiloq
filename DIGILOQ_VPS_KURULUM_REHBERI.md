# 🚀 Digiloq (digiloq.com) VPS Kurulum & Canlıya Alma Rehberi
> **Hiç Sunucu Kurmamış Birinin Bile 15 Dakikada Adım Adım Yapabileceği Master Rehber**

Bu rehber, **Digiloq** uygulamasını (React Frontend + FastAPI Backend + MongoDB) **`digiloq.com`** alan adıyla sıfırdan bir Linux VPS sunucuya kurup HTTPS (SSL) güvenlik kilidiyle yayına almanız için hazırlanmıştır.

---

## 📋 0. Genel Bakış ve Gereksinimler

Kuruluma başlamadan önce elinizde olması gerekenler:
1. **VPS Sunucu:** Ubuntu 22.04 LTS veya 24.04 LTS kurulu sanal sunucu (Örn: Hetzner, DigitalOcean, Turhost, Veridyen vb.)
   - **RAM:** Minimum 2 GB (4 GB önerilir)
   - **CPU:** 1 veya 2 Çekirdek
   - **Disk:** 25 GB SSD/NVMe
   - Sunucu firmasının size verdiği **IP Adresi** (Örn: `185.190.12.34`) ve **root Şifresi**.
2. **Alan Adı:** `digiloq.com` (Satın aldığınız alan adı firması paneli: GoDaddy, Turhost, Natro, Cloudflare vb.)

---

## 🌐 1. ADIM: Alan Adını (Domain) Sunucuya Yönlendirme (DNS)

İlk olarak internet kullanıcıları `digiloq.com` yazdığında sunucunuzu bulabilmesi için DNS kaydı açıyoruz:

1. Alan adınızı satın aldığınız firmanın paneline giriş yapın (**DNS Yönetimi / DNS Management** sayfasına gidin).
2. Aşağıdaki iki **A Kaydını (A Record)** ekleyin (Eski A kayıtları varsa silin veya IP'sini güncelleyin):

| Kayıt Türü (Type) | İsim (Host / Name) | Değer (Value / Target IP) | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `@` *(veya boş)* | `SUNUCU_IP_ADRESİNİZ` *(Örn: 185.190.12.34)* | 3600 (veya Auto) |
| **A** | `www` | `SUNUCU_IP_ADRESİNİZ` *(Örn: 185.190.12.34)* | 3600 (veya Auto) |

> ⏳ **Not:** DNS kayıtlarının internete yayılması 5 ila 30 dakika sürebilir. Bu sırada sunucu kurulumuna devam edebilirsiniz.

---

## 💻 2. ADIM: Sunucuya Bağlanma (SSH)

Kendi bilgisayarınızdan sunucuya uzaktan bağlanıp komut vereceğiz.

### Windows Kullanıcıları İçin:
1. Klavyeden `Win + R` yapıp `powershell` yazın ve Enter'a basın (veya PowerShell'i aratıp açın).
2. Şu komutu yazın (kendi sunucu IP'nizle değiştirin):
   ```bash
   ssh root@SUNUCU_IP_ADRESINIZ
   ```
   *(Örnek: `ssh root@185.190.12.34`)*
3. İlk kez bağlanırken gelen `Are you sure you want to continue connecting (yes/no)?` sorusuna `yes` yazıp Enter'a basın.
4. E-postanıza gelen **root şifresini** girin.
   > ⚠️ **Önemli İpucu:** Linux terminallerinde şifre yazarken güvenlik gereği ekranda yıldız `*` veya karakter **görünmez**. Şifrenizi kopyalayıp terminale sağ tıklayarak yapıştırın ve Enter'a basın.

Bağlandığınızda ekranda `root@...:~#` yazısını göreceksiniz. Artık sunucunun içerisindesiniz!

---

## 📦 3. ADIM: Gerekli Paketlerin ve Programların Kurulması

Sunucuya sırayla temel bileşenleri yükleyeceğiz. Aşağıdaki komut bloklarını kopyalayıp terminale yapıştırın:

### 3.1. Sistemi Güncelleyin
```bash
apt update && apt upgrade -y
```

### 3.2. Python, Nginx, Git ve Temel Araçları Kurun
```bash
apt install -y python3 python3-pip python3-venv nginx git curl nano ufw htop
```

### 3.3. Node.js 20 LTS Kurun (Frontend Derlemesi İçin)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```
*(Kontrol için `node -v` ve `npm -v` yazabilirsiniz).*

### 3.4. MongoDB Veritabanını Kurun ve Başlatın
```bash
apt install -y mongodb
systemctl enable mongodb
systemctl start mongodb
```
*(MongoDB durumunu kontrol etmek için: `systemctl status mongodb` -> yeşil "active (running)" görmelisiniz. Çıkmak için `q` tuşuna basın).*

### 3.5. PM2 Yöneticisini Kurun (Arka Planda Kesintisiz Çalışma)
```bash
npm install -g pm2
```

---

## 📂 4. ADIM: Proje Klasörünün Oluşturulması ve Dosyaların Yüklenmesi

Digiloq dosyalarımızı standart web dizinimiz olan `/var/www/digiloq` içine koyacağız.

1. Ana klasörü oluşturun ve içine girin:
   ```bash
   mkdir -p /var/www/digiloq
   cd /var/www/digiloq
   ```

2. **Dosyaları Yükleme (2 Yoldan Biri):**

   * **Yol A (Önerilen - FileZilla ile Yükleme):**
     1. Bilgisayarınıza [FileZilla Client](https://filezilla-project.org/) indirin.
     2. Sol üstten **Dosya > Site Yöneticisi > Yeni Site** deyin.
     3. Protokol: **SFTP - SSH File Transfer Protocol**
     4. Sunucu: `SUNUCU_IP_ADRESINIZ`
     5. Oturum Açma Türü: **Normal**
     6. Kullanıcı: `root`
     7. Parola: `root şifreniz`
     8. Bağlan deyin. Sağ taraftaki sunucu penceresinden `/var/www/digiloq` klasörüne gidin.
     9. Sol taraftaki bilgisayarınızdan projenin tüm klasörlerini (`backend`, `frontend` vb.) sağ tarafa sürükleyip bırakın.

   * **Yol B (Git Reposundan Çekme):**
     Eğer projeniz GitHub / GitLab üzerindeyse:
     ```bash
     git clone REPO_URL_ADRESINIZ .
     ```

---

## ⚙️ 5. ADIM: Backend (FastAPI Python) Kurulumu & Çalıştırılması

1. Backend klasörüne girin:
   ```bash
   cd /var/www/digiloq/backend
   ```

2. Python sanal ortamını (venv) oluşturun ve aktif edin:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Gerekli Python kütüphanelerini yükleyin:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. Ortam Değişkenleri dosyasını (`.env`) oluşturun:
   ```bash
   nano .env
   ```
   Açılan ekrana aşağıdaki ayarları yapıştırın:
   ```env
   MONGO_URL=mongodb://127.0.0.1:27017
   DB_NAME=kasa_takip
   JWT_SECRET=super_gizli_ve_guclu_bir_jwt_anahtari_digiloq_2026_xyz
   OWNER_EMAIL=admin@digiloq.com
   OWNER_PASSWORD=GucluYoneticiSifresi123!
   OWNER_NAME=Digiloq Admin
   CORS_ORIGINS=https://digiloq.com,https://www.digiloq.com,http://digiloq.com,http://www.digiloq.com
   ```
   *(Kaydetmek için: `CTRL + O`, ardından `Enter`. Çıkmak için: `CTRL + X`)*

5. Backend API servisini PM2 ile arka planda kalıcı olarak başlatın:
   ```bash
   pm2 start "/var/www/digiloq/backend/.venv/bin/python -m uvicorn server:app --host 127.0.0.1 --port 8000" --name digiloq-api
   pm2 save
   pm2 startup
   ```
   *(Ekrana gelen komutu kopyalayıp çalıştırın, böylece sunucu yeniden başlasa bile Digiloq otomatik ayağa kalkar).*

6. API'nin çalıştığını test edin:
   ```bash
   curl http://127.0.0.1:8000/api/
   ```
   Ekranda `{"message":"Digiloq API","status":"ok","version":"2.0"}` çıktısını görüyorsanız backend mükemmel çalışıyor demektir!

---

## 🎨 6. ADIM: Frontend (React 19) Derlenmesi

1. Frontend klasörüne geçin:
   ```bash
   cd /var/www/digiloq/frontend
   ```

2. Frontend `.env` dosyasını oluşturun:
   ```bash
   nano .env
   ```
   İçerisine şu tek satırı yapıştırın:
   ```env
   REACT_APP_BACKEND_URL=/api
   ```
   *(Kaydetmek için: `CTRL + O` -> `Enter` -> `CTRL + X`)*

3. NPM paketlerini kurun ve optimize edilmiş canlı sürümü derleyin:
   ```bash
   npm install
   npm run build
   ```
   *(Bu işlem 1-2 dakika sürebilir. Tamamlandığında `/var/www/digiloq/frontend/build` klasörü oluşacaktır).*

---

## 🌍 7. ADIM: Nginx (Web Sunucusu) Yapılandırması (`digiloq.com`)

Nginx; gelen kullanıcı isteklerini karşılayacak, arayüzü (React) anında sunacak ve `/api/` isteklerini arka plandaki Python FastAPI servisimize yönlendirecektir.

1. Digiloq için yeni bir Nginx ayar dosyası açın:
   ```bash
   nano /etc/nginx/sites-available/digiloq.com
   ```

2. İçine aşağıdaki konfigürasyonu eksiksiz yapıştırın:
   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name digiloq.com www.digiloq.com;

       # Frontend React Derleme Dizini
       root /var/www/digiloq/frontend/build;
       index index.html index.htm;

       client_max_body_size 50M;

       # Gzip Sıkıştırma (Hızlı yükleme için)
       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

       # Frontend SPA Yönlendirmesi
       location / {
           try_files $uri $uri/ /index.html;
       }

       # Backend FastAPI Ters Proxy (Reverse Proxy)
       location /api/ {
           proxy_pass http://127.0.0.1:8000/api/;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
           proxy_read_timeout 90;
       }

       # Statik dosyaların önbellek ayarları
       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
           expires 30d;
           add_header Cache-Control "public, no-transform";
       }
   }
   ```
   *(Kaydetmek için: `CTRL + O` -> `Enter` -> `CTRL + X`)*

3. Bu ayarı aktif edin ve varsayılan boş Nginx sayfasını kaldırın:
   ```bash
   ln -s /etc/nginx/sites-available/digiloq.com /etc/nginx/sites-enabled/
   rm -f /etc/nginx/sites-enabled/default
   ```

4. Nginx ayarlarında hata olup olmadığını test edin:
   ```bash
   nginx -t
   ```
   Ekranda `syntax is ok` ve `test is successful` yazmalıdır.

5. Nginx'i yeniden başlatın:
   ```bash
   systemctl restart nginx
   ```

---

## 🔒 8. ADIM: Ücretsiz SSL (HTTPS) Sertifikası Kurulumu (Certbot)

Tarayıcılarda sitenizin yanında yeşil kilit simgesi olması ve tüm veri transferlerinin şifrelenmesi için Let's Encrypt SSL sertifikası kuruyoruz:

1. Certbot aracını çalıştırın:
   ```bash
   certbot --nginx -d digiloq.com -d www.digiloq.com
   ```

2. Karşınıza gelecek sorulara şu şekilde cevap verin:
   - **Email adresi:** Kendi e-postanızı yazın (Örn: `admin@digiloq.com`) ve Enter'a basın.
   - **Hizmet Şartları:** `Y` yazıp Enter'a basın.
   - **Bülten/Haberleşme:** `N` yazıp Enter'a basın.
   - **HTTPS Yönlendirmesi:** Otomatik yönlendirme seçeneği sorarsa `2` (Redirect) seçin.

> 🎉 **Tebrikler!** Artık tarayıcınızdan **`https://digiloq.com`** adresine girdiğinizde Digiloq canlıda, tam güvenlikli ve kullanıma hazır şekilde açılacaktır!

---

## 🛡️ 9. ADIM: Sunucu Güvenlik Duvarı (UFW Firewall) Açma

Sunucunuzu yetkisiz port saldırılarına karşı korumak için sadece gerekli kapıları açın:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

---

## 🛠️ 10. ADIM: Günlük Yönetim ve Bakım Komutları (El Kitabı)

Gelecekte sunucunuzu yönetirken ihtiyaç duyacağınız tüm pratik komutlar:

### 1. Backend Durumunu Görme ve Log İnceleme
```bash
# Canlı durum tablosu
pm2 status

# Canlı backend logları (hataları veya gelen istekleri görmek için)
pm2 logs digiloq-api

# Backend'i yeniden başlatmak
pm2 restart digiloq-api
```

### 2. Kodlarda Değişiklik Yapınca Sunucuyu Güncelleme (Hızlı 3 Adım)
Kendi bilgisayarınızda yeni bir özellik ekleyip sunucuya attıktan sonra şu komutları vermeniz yeterlidir:

```bash
# Adım 1: Frontend'i yeniden derleyin
cd /var/www/digiloq/frontend && npm run build

# Adım 2: Backend'i yeniden başlatın
pm2 restart digiloq-api

# Adım 3: Nginx önbelleğini yenileyin
systemctl reload nginx
```

### 3. Veritabanı Yedekleme (Manuel MongoDB Dump)
```bash
# Tüm veritabanını tek tıkla yedekle:
mongodump --db kasa_takip --out /root/digiloq_yedek_$(date +%F)
```
*(Ayrıca Digiloq Yönetici Panelindeki **"Veritabanını Dışa Aktar"** butonuyla da tarayıcınızdan şifreli yedek indirebilirsiniz).*

---

### ✨ Özet Erişim Bilgileri
- **Web Sitesi:** [https://digiloq.com](https://digiloq.com)
- **Admin Girişi:** `.env` dosyasında belirlediğiniz `OWNER_EMAIL` ve `OWNER_PASSWORD` bilgileri ile giriş yapabilirsiniz.
