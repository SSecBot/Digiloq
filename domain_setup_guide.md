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
