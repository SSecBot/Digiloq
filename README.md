# Kapsamlı VPS (Sanal Sunucu) Kurulum Rehberi

Bu rehber, hayatında daha önce hiç sunucu kurmamış biri için adım adım her detayı açıklayacak şekilde hazırlanmıştır.

---

## 1. Alınması Gereken Sunucu Özellikleri
Hosting firmanızdan (hosting.com.tr, Turhost vb.) bir **Linux Sanal Sunucu (VPS / VDS)** satın alırken şu özelliklere dikkat edin:
- **İşletim Sistemi:** **Ubuntu 22.04 LTS** (veya 24.04). Kesinlikle Ubuntu seçin, komutlar buna göre verilmiştir.
- **RAM:** Minimum **2 GB** (MongoDB ve React derleme işlemi bellek tüketir, 1 GB yetersiz kalabilir).
- **İşlemci (CPU):** 1 veya 2 Çekirdek yeterlidir.
- **Disk:** 20 - 30 GB SSD (veya NVMe) yeterli olacaktır.
- **Kontrol Paneli:** "Panelsiz" (No Panel) seçin. cPanel veya Plesk kurmanıza gerek yoktur, kaynak tüketir.

> Sunucuyu satın aldıktan sonra firma e-posta adresinize sunucunun **IP Adresini** ve **root (yönetici) Şifresini** gönderecektir.

---

## 2. Sunucuya Bağlanma
Sunucuya komut göndermek için SSH bağlantısı kurmalısınız.

**Windows kullanıyorsanız:**
1. Başlat menüsüne "PowerShell" veya "CMD" yazıp açın.
2. Şu komutu yazın ve Enter'a basın:
   `ssh root@SUNUCU_IP_ADRESINIZ` *(Örn: ssh root@192.168.1.1)*
3. Gelen soruya `yes` yazıp Enter'a basın.
4. E-postanıza gelen **root şifresini** yazın (şifreyi yazarken ekranda karakterler görünmez, yazıp Enter'a basın).

---

## 3. Gerekli Programların (Altyapının) Kurulması
Sunucuya bağlandığınızda terminal ekranına sırasıyla aşağıdaki komutları kopyalayıp yapıştırın (her birinin bitmesini bekleyin).

**Sistemi güncelleyin:**
```bash
apt update && apt upgrade -y
```

**Python ve Nginx (Web Sunucusu) kurulumu:**
```bash
apt install python3 python3-pip python3-venv nginx nano curl -y
```

**Node.js Kurulumu (React için):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
```

**MongoDB Kurulumu (Veritabanı):**
```bash
apt install -y mongodb
systemctl enable mongodb
systemctl start mongodb
```
*(Eğer yukarıdaki mongodb komutu hata verirse, Ubuntu sürümünüze göre resmi siteden kurmamız gerekebilir, ancak standart depolarda genelde çalışır).*

**PM2 Kurulumu (Backend'i arka planda açık tutmak için):**
```bash
npm install -g pm2
```

---

## 4. Proje Dosyalarını Sunucuya Atma
Kodlarınızı kendi bilgisayarınızdan sunucuya atmak için **FileZilla** programını kullanabilirsiniz:
1. Bilgisayarınıza FileZilla kurun.
2. Sol üstten "Dosya -> Site Yöneticisi"ni açın.
3. Protokol: **SFTP**, Sunucu: **Sunucu IP Adresiniz**, Kullanıcı Adı: **root**, Parola: **Şifreniz** girip bağlanın.
4. Sağ tarafta (Sunucu) `/root` dizininde olduğunuza emin olun.
5. Sol taraftan bilgisayarınızdaki `Kasa_takip-main` klasörünün içindekileri tutup sağ tarafa sürükleyin.
6. Klasörün sunucudaki adı `/root/Kasa_takip-main` olacaktır.

---

## 5. Backend (API) Kurulumu ve Başlatılması
Terminale geri dönün ve backend'i çalıştıracak adımları yapın:

1. Klasöre girin:
```bash
cd /root/Kasa_takip-main/backend
```

2. Ortam Değişkeni (.env) dosyası oluşturun:
```bash
nano .env
```
Açılan siyah ekrana şunları yapıştırın:
```
MONGO_URL=mongodb://127.0.0.1:27017
DB_NAME=kasa_takip
JWT_SECRET="adminsifre285561_digiloq"
```
(Kaydetmek için: `CTRL+O` ve `Enter`'a basın, çıkmak için `CTRL+X` yapın.)

3. Python bağımlılıklarını kurun ve çalıştırın:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pm2 start "uvicorn server:app --host 127.0.0.1 --port 8000" --name backend
pm2 save
pm2 startup
```
*Backend şu an arka planda 8000 portunda çalışmaya başladı.*

---

## 6. Frontend (React) Kurulumu ve Derlenmesi
Şimdi arayüzü yayına hazırlayalım.

1. Frontend klasörüne girin:
```bash
cd /root/Kasa_takip-main/frontend
```

2. `.env` dosyası oluşturun:
```bash
nano .env
```
Açılan siyah ekrana şunu yapıştırın:
```
REACT_APP_BACKEND_URL=/api
```
*(Kaydetmek için: `CTRL+O`, `Enter`, çıkmak için `CTRL+X`)*

3. React projesini derleyin (Bu işlem 1-2 dakika sürebilir):
```bash
npm install
npm run build
```

4. Çıkan dosyaları web sunucusunun (Nginx) göreceği yere kopyalayın:
```bash
rm -rf /var/www/html/*
cp -r build/* /var/www/html/
```

---

## 7. Nginx (Web Sunucusu) ve Domain Ayarları
Artık dosyalar hazır, Nginx'e alan adımızı (domain.com) tanıtmamız lazım. 
*(Domaininizi aldığınız firmadan A kaydını Sunucu IP'nize yönlendirmiş olduğunuzu varsayıyoruz).*

```bash
nano /etc/nginx/sites-available/default
```

Dosyanın içindeki **her şeyi silip** (CTRL+K tuşuna basılı tutarak hızlıca silebilirsiniz) aşağıdaki kodları yapıştırın. `sizin-domaininiz.com` yazan yerleri kendi alan adınızla değiştirin:

```nginx
server {
    listen 80;
    server_name sizin-domaininiz.com www.sizin-domaininiz.com;
    
    root /var/www/html;
    index index.html index.htm;

    # Frontend (React) ayarı
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend (API) ayarı
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
*(Kaydetmek için: `CTRL+O`, `Enter`, çıkmak için `CTRL+X`)*

Nginx'i yeniden başlatın:
```bash
systemctl restart nginx
```

---

## 8. Ücretsiz SSL (HTTPS) Güvenlik Sertifikası Kurulumu
Sitenizde "Güvenli değil" uyarısı çıkmaması için:
```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx
```
Size sırasıyla şunları soracak:
- Email adresiniz (yazıp Enter'a basın).
- Şartları kabul ediyor musunuz (Y yazıp Enter'a basın).
- Reklam maili ister misiniz (N yazıp Enter'a basın).
- Hangi domainler (Numaralarını seçin veya Enter'a basıp hepsini seçin).

**İşlem Tamam!** Artık tarayıcınıza alan adınızı yazdığınızda uygulamanız güvenli (HTTPS) bir şekilde açılacaktır.









# Alan Adı (Domain) Bağlama Rehberi

Kendi alan adınızı (örneğin `ornekdomain.com`), seçtiğiniz yönteme göre aşağıdaki şekilde projenize bağlayabilirsiniz.

---

## 1. Yöntem: Vercel Üzerinden Alan Adı Bağlama (Önerilen)

Eğer frontend uygulamanızı **Vercel** üzerinden yayınladıysanız, alan adınızı sadece Vercel'e bağlamanız yeterlidir. Backend (Render) arka planda API olarak çalışmaya devam edebilir (ör: `proje-backend.onrender.com`). Özel bir backend alan adına ihtiyacınız yoktur.

**Adım Adım Bağlantı:**

1. **Vercel Paneline Girin:**
   - Vercel'de projenizi açın.
   - Üst menüden **Settings** (Ayarlar) > **Domains** sekmesine gidin.
2. **Alan Adınızı Ekleyin:**
   - Kutuya kendi alan adınızı (örn: `ornekdomain.com`) yazın ve **Add** butonuna basın.
   - Vercel size eklemeniz gereken **DNS kayıtlarını** gösterecektir. Genellikle şu iki kaydı verir:
     - Tür: **A Record**, Name: `@`, Value: `76.76.21.21`
     - Tür: **CNAME**, Name: `www`, Value: `cname.vercel-dns.com`
3. **Domain Firmanıza (hosting.com vs) Gidin:**
   - Alan adınızı satın aldığınız firmanın paneline giriş yapın.
   - **DNS Yönetimi (DNS Management)** sayfasına gidin.
   - Vercel'in size verdiği yukarıdaki A ve CNAME kayıtlarını buraya ekleyin. (Eğer eski A kayıtları varsa silin veya güncelleyin).
4. **SSL (HTTPS) Otomatik Kurulur:**
   - DNS yönlendirmesinin aktif olması bazen birkaç dakika, bazen birkaç saat sürebilir.
   - Vercel yönlendirmeyi algıladığında **ücretsiz SSL (HTTPS) sertifikanızı otomatik olarak kuracaktır.** Artık sitenize alan adınızla girebilirsiniz.

---

## 2. Yöntem: VPS (Sanal Sunucu) Üzerine Alan Adı Bağlama

Eğer kendiniz bir sanal sunucu (VPS) aldıysanız, alan adınızı sunucunuzun IP adresine bağlamanız ve SSL sertifikasını (Let's Encrypt) manuel olarak kurmanız gerekir.

**Adım 1: DNS Ayarları (Domain Firmanızda)**
1. Alan adınızı satın aldığınız firmanın **DNS Yönetimi** sayfasına gidin.
2. Şu kayıtları oluşturun:
   - Tür: **A Record**, Name: `@` (veya boş), Value: **VPS Sunucunuzun IP Adresi**
   - Tür: **A Record** (veya CNAME), Name: `www`, Value: **VPS Sunucunuzun IP Adresi**

**Adım 2: Nginx Ayarlarını Güncelleme (VPS İçinde)**
Sunucunuza SSH ile bağlanıp Nginx ayarlarındaki alan adı kısmını güncelleyin:
```bash
nano /etc/nginx/sites-available/default
```
Açılan dosyada `server_name` satırını bulup kendi alan adınızı yazın:
```nginx
server {
    listen 80;
    server_name ornekdomain.com www.ornekdomain.com;
    
    # ... diğer ayarlar ...
}
```
Kaydedip çıkın (`Ctrl+O`, `Enter`, `Ctrl+X`) ve Nginx'i yeniden başlatın:
```bash
systemctl restart nginx
```

**Adım 3: Ücretsiz SSL (HTTPS) Kurulumu**
Tarayıcılarda "Güvenli Değil" uyarısı almamak için **Certbot** kullanarak ücretsiz SSL sertifikası kuralım. Terminalde şu komutları çalıştırın:
```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d ornekdomain.com -d www.ornekdomain.com
```
Certbot size e-posta adresinizi soracak ve ardından SSL sertifikasını otomatik kurup Nginx ayarlarınızı güvenli hale (HTTPS) getirecektir. 

**Not:** Certbot'un sertifikayı doğrulayabilmesi için Adım 1'deki DNS yönlendirmesinin tamamlanmış olması gerekir. Alan adınız sunucunuza yönlenmemişse hata verebilir, bu durumda 1-2 saat bekleyip tekrar deneyin.
