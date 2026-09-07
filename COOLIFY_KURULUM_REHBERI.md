# 🟣 Digiloq - Sıfırdan Coolify Kurulum Rehberi (Adım Adım & Başlangıç Seviyesi)

Bu rehber, **Coolify sunucunuzda kurulu olduğu** ve daha önce hiç Coolify veya Docker kullanmadığınız varsayılarak hazırlanmıştır. Hiçbir karmaşık terime boğulmadan, adım adım Digiloq sistemini canlıya nasıl alacağınızı anlatır.

---

## 🧠 Önce Mantığı Anlayalım (Ne Kuruyoruz?)

Digiloq sistemi 3 temel parçadan oluşur:
1. **Frontend (React):** Kullanıcının tarayıcıda gördüğü panel, butonlar ve tablolar.
2. **Backend (Python FastAPI):** Arka planda verileri işleyen, hesaplamaları yapan akıl.
3. **Veritabanı (MongoDB):** Kullanıcıların, kasaların ve işlemlerin güvenle saklandığı dijital depo.

Bunları tek tek elle kurup birbirine bağlamakla uğraşmıyoruz. Projenin içindeki [`docker-compose.yml`](file:///c:/Users/monster/Desktop/Yazılım/projeler/Digiloq/docker-compose.yml) dosyası bu 3 parçayı tek bir paket haline getirir ve birbirine otomatik olarak bağlar.

---

## 📋 Kurulum Öncesi Hazırlık (2 Dakika)

1. **GitHub Reposu:** Proje kodlarınızın GitHub (veya GitLab) üzerinde bir depoda olduğundan emin olun.
2. **Alan Adı (Domain - Opsiyonel):**
   - Eğer bir alan adınız varsa (Örn: `panel.siteniz.com`), DNS yönetiminizden bir **A Kaydı** açıp sunucunuzun IP adresine yönlendirin.
   - Eğer henüz bir alan adınız yoksa üzülmeyin, sunucu IP adresiniz üzerinden de çalıştırabilirsiniz (Örn: `http://SUNUCU_IP:3000`).

---

## 🚀 8 Adımda Sıfırdan Kurulum

### 1. Adım: Coolify Paneline Giriş Yapın
- Tarayıcınızdan Coolify adresinize gidin (Örn: `http://SUNUCU_IP:8000` veya `https://coolify.siteniz.com`).
- Kullanıcı adı ve şifrenizle giriş yapın.

---

### 2. Adım: Proje Alanına Geçin
1. Sol taraftaki menüden **Projects** (Projeler) butonuna tıklayın.
2. Ekranda hazır gelen **Default** projeye (veya varsa kendi projenize) tıklayın.
3. Karşınıza çıkan **production** kutusuna tıklayın.

---

### 3. Adım: Yeni Kaynak (Resource) Ekleyin
1. Sayfanın sağ üstünde veya ortasında yer alan **+ New** (veya **+ Add Resource**) butonuna tıklayın.
2. Karşınıza birçok seçenek çıkacaktır (Application, Database, Service, Docker Compose vb.).
3. Buradan **Docker Compose** seçeneğini seçin.

---

### 4. Adım: Git Reponuzu Bağlayın
1. Karşınıza çıkan ekranda **Based on Git repository** (Git deposuna dayalı) seçeneğini seçin.
2. GitHub hesabınızı seçin ve **Digiloq** reposunu işaretleyin.
3. **Branch** (Dal) kısmında genellikle `main` veya `master` seçilidir, projeniz hangi daldaysa onu bırakın.
4. **Save** veya **Continue** diyerek ilerleyin.

> 💡 **Alternatif (Git Reposu Olmadan):** Eğer doğrudan kodu yapıştırmak isterseniz "Docker Compose Empty" seçip [`docker-compose.yml`](file:///c:/Users/monster/Desktop/Yazılım/projeler/Digiloq/docker-compose.yml) dosyasının içeriğini yapıştırabilirsiniz. Ancak Git reposu bağlamak güncellemeleri otomatik çekebilmek için en sağlıklı yöntemdir.

---

### 5. Adım: Port ve Compose Ayarını Kontrol Edin
Coolify kendi içinde gelen **Traefik/Caddy** ters vekilini (Reverse Proxy) kullanır ve 80/443 portlarını dinler.
Bu nedenle `docker-compose.yml` içinde `frontend` servisinin port ayarını şu şekilde kullanmanız önerilir:

```yaml
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: digiloq-frontend
    restart: always
    depends_on:
      - backend
    ports:
      - "3000:80"  # <- Hostta 3000 portuna yönlendirilir, Coolify ile çakışmaz!
    networks:
      - digiloq-network
```

- **Eğer Alan Adı Kullanacaksanız:** Coolify üzerinden alan adınızı frontend servisine bağlayacaksınız (bir sonraki adım).
- **Eğer Sadece IP Kullanacaksanız:** Uygulamanıza doğrudan `http://SUNUCU_IP:3000` adresinden erişebilirsiniz.

---

### 6. Adım: Ortam Değişkenlerini (Şifreleri) Ekleyin
Coolify ekranında üst sekmelerden **Environment Variables** (Ortam Değişkenleri) sekmesine gelin.
Burada **"Developer View"** veya **"Bulk Edit"** butonuna basarak aşağıdaki 4 satırı yapıştırın:

```env
JWT_SECRET=super_gizli_ve_uzun_bir_jwt_anahtari_2026_xyz
OWNER_EMAIL=admin@digiloq.com
OWNER_PASSWORD=GucluSifreniz123!
OWNER_NAME=Digiloq Yöneticisi
```

> 🔒 **Bu Değişkenler Ne İşe Yarar?**
> - `JWT_SECRET`: Kullanıcı oturumlarının çalınmaması için kullanılan gizli güvenlik anahtarıdır.
> - `OWNER_EMAIL` ve `OWNER_PASSWORD`: Sisteme ilk kez giriş yaparken kullanacağınız **Süper Admin** hesabıdır. Sistem ilk başladığında bu hesabı otomatik olarak oluşturur.
> - MongoDB adresi (`MONGO_URL`) ve Backend bağlantısı Compose dosyasında zaten otomatik bağlıdır, ekstra bir şey yazmanıza gerek yoktur!

---

### 7. Adım: Alan Adı (Domain) ve Otomatik SSL (HTTPS) Tanımlama
Eğer bir alan adınız varsa:
1. Kaynak sayfasında servis listesinden **frontend** servisini seçin.
2. **Domains (FQDN)** kutucuğuna alan adınızı yazın:
   - Örnek: `https://panel.sirketiniz.com`
3. Başında `https://` yazdığınız anda Coolify otomatik olarak **Let's Encrypt Ücretsiz SSL Sertifikası** oluşturacaktır.
4. Kaydedin (**Save**).

*(Eğer alan adınız yoksa bu adımı boş bırakıp doğrudan `http://SUNUCU_IP:3000` üzerinden kullanabilirsiniz).*

---

### 8. Adım: "Deploy" Butonuna Basın (Canlıya Alış!)
1. Sağ üst köşedeki yeşil **Deploy** butonuna tıklayın.
2. Ekranda log akışı başlayacaktır:
   - MongoDB veritabanı indirilir.
   - Python Backend paketleri kurulur.
   - React Frontend derlenir ve Nginx içine yerleştirilir.
3. Yaklaşık 2-3 dakika içinde durum yeşil renkte **Running** (Çalışıyor) durumuna geçecektir.
4. Artık belirlediğiniz alan adına (veya `http://SUNUCU_IP:3000` adresine) gidip, 6. adımda belirlediğiniz `admin@digiloq.com` ve şifrenizle giriş yapabilirsiniz!

---

## ❓ Sık Karşılaşılan Sorunlar ve Çözümleri

### 1. "Port 80 is already allocated" Hatası Alıyorum
- **Neden Olur?** Coolify'ın kendi ters vekili (Traefik/Caddy) sunucudaki 80 ve 443 portlarını dinler. Eğer Compose dosyanızda `80:80` portu doğrudan verilmişse çakışma yaşanır.
- **Çözüm:** `docker-compose.yml` içindeki `frontend` portunu `3000:80` olarak değiştirin ve Coolify üzerinden alan adınızı tanımlayın.

### 2. Giriş Yapamıyorum veya "Giriş Başarısız" Diyor
- **Kontrol Edin:** Coolify'dan **digiloq-backend** servisinin **Logs** (Günlükler) sekmesine bakın.
- İlk açılışta `Super admin user verified: admin@digiloq.com` yazısını görmelisiniz. Eğer şifrenizi unuttuysanız Environment Variables sekmesinden `OWNER_PASSWORD` değerini değiştirip yeniden **Restart / Deploy** yapmanız yeterlidir.

### 3. Sunucuyu Kapatıp Açarsam Verilerim Silinir mi?
- **Hayır!** [`docker-compose.yml`](file:///c:/Users/monster/Desktop/Yazılım/projeler/Digiloq/docker-compose.yml) içinde tanımlı olan `mongo_data` adlı Docker Volume sayesinde tüm kasa kayıtları, kullanıcılar ve veriler sunucu diskinde kalıcı olarak saklanır.

### 4. Yeni Bir Güncelleme Yaptığımda Nasıl Yüklerim?
- Kodunuzu GitHub'a `git push` ettikten sonra Coolify paneline gelip sadece **Redeploy** (Yeniden Dağıt) butonuna basmanız yeterlidir. Coolify en güncel kodları çeker, yeniden derler ve kesintisiz yayına alır.
