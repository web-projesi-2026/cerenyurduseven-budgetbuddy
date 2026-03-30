[README.md](https://github.com/user-attachments/files/26345174/README.md)
# BudgetBuddy 💰

Kişisel Finans Yönetimi Sistemi — **PHP 8.1+ · MySQL 8 · Vanilla JS**

---

## 📁 Dosya Yapısı

```
BudgetBuddy/
├── index.html               → Ana panel (dashboard)
├── .htaccess                → URL yönlendirme kuralları
├── README.md
│
├── assets/
│   ├── css/
│   │   └── style.css        → Tek birleşik stil dosyası
│   └── js/
│       └── main.js          → API istemcisi + yardımcılar
│
├── pages/
│   ├── project.html         → İşlemler (CRUD tablosu)
│   ├── about.html           → Kullanıcı profili
│   ├── contact.html         → Destek & İletişim
│   ├── giris.html           → Giriş formu
│   └── kayit.html           → Kayıt formu
│
├── backend/
│   ├── index.php            → Front Controller (tüm /api/* istekleri)
│   ├── config.php           → Veritabanı bağlantısı + yardımcı fonksiyonlar
│   ├── middleware/
│   │   ├── auth.php         → Oturum kontrolü (PHP sayfaları için)
│   │   └── auth_check.php   → HTML sayfaları için oturum yönlendirme
│   └── routes/
│       ├── auth.php         → /api/auth/*
│       ├── transactions.php → /api/transactions/*
│       ├── categories.php   → /api/categories/*
│       ├── budgets.php      → /api/budgets/*
│       ├── reports.php      → /api/reports/*
│       └── contact.php      → /api/contact
│
└── database/
    ├── schema.sql           → Tablolar, indexler, view'lar
    ├── seed.sql             → Test verisi
    └── queries.sql          → Referans SQL sorguları
```

---

## 🗄️ Veritabanı Tabloları

| Tablo | Açıklama |
|---|---|
| `users` | Kullanıcılar (bcrypt şifre) |
| `categories` | Sistem + özel kategoriler |
| `transactions` | Gelir / gider işlemleri |
| `budgets` | Aylık bütçe limitleri |
| `savings_goals` | Tasarruf hedefleri |
| `contact_messages` | Destek mesajları |

---

## 🚀 Kurulum (XAMPP)

### 1. Dosyaları yerleştir
```
C:\xampp\htdocs\BudgetBuddy\
```

### 2. Apache & MySQL'i başlat
XAMPP Control Panel'den **Apache** ve **MySQL**'i başlat.

### 3. Veritabanını oluştur
`http://localhost/phpmyadmin` adresine git:
- **Yeni veritabanı oluştur** → `budgetbuddy` (utf8mb4_turkish_ci)
- `database/schema.sql` dosyasını içe aktar
- (İsteğe bağlı) `database/seed.sql` → test verisi için

### 4. Bağlantı ayarları
`backend/config.php` dosyasını düzenle:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'budgetbuddy');
define('DB_USER', 'root');   // XAMPP için varsayılan
define('DB_PASS', '');       // XAMPP için varsayılan (boş)
```

### 5. Uygulamayı aç
```
http://localhost/BudgetBuddy
```

---

## 🔌 API Endpoint'leri

```
POST   /api/auth?action=kayit        Kayıt ol
POST   /api/auth?action=giris        Giriş yap → Session
POST   /api/auth?action=cikis        Çıkış yap
GET    /api/auth?action=ben          Mevcut kullanıcı bilgisi
PUT    /api/auth?action=profil       Profil güncelle
PUT    /api/auth?action=sifre        Şifre değiştir

GET    /api/transactions             Listele (filtreli)
POST   /api/transactions             Ekle
PUT    /api/transactions?id=N        Güncelle
DELETE /api/transactions?id=N        Sil

GET    /api/categories               Listele
POST   /api/categories               Özel kategori ekle
DELETE /api/categories?id=N          Özel kategori sil

GET    /api/budgets                  Bu ay bütçe limitleri
POST   /api/budgets                  Limit ekle/güncelle
DELETE /api/budgets?id=N             Limit sil

GET    /api/reports?action=ozet      Bakiye özeti + son işlemler
GET    /api/reports?action=aylik     Son 6 ay grafik verisi
GET    /api/reports?action=kategoriler  Kategori pasta grafiği
GET    /api/reports?action=haftalik  Son 4 hafta bar grafiği
GET    /api/reports?action=tasarruf  Tasarruf hedefleri

POST   /api/contact                  Destek mesajı gönder
```

### Filtre Parametreleri (/api/transactions)
| Parametre | Tip | Açıklama |
|---|---|---|
| `tur` | string | `gelir` veya `gider` |
| `category_id` | int | Kategori ID |
| `baslangic` | date | YYYY-MM-DD |
| `bitis` | date | YYYY-MM-DD |
| `ay` | int | 1–12 |
| `yil` | int | Yıl (ör. 2025) |

---

## 🔐 Güvenlik

- **Şifreler** `password_hash()` + bcrypt (cost=12) ile saklanır
- **Session** `httponly` + `samesite=Strict` cookie
- **SQL Injection** → PDO prepared statements
- **XSS** → `htmlspecialchars()` ile girdi temizleme
- **PHP kaynak kodu** `.htaccess` ile dışarıdan erişime kapalı
- Sahiplik kontrolü: her işlemde `user_id` eşleşmesi doğrulanır

---

## 🧪 Test Kullanıcısı (seed.sql sonrası)

| Alan | Değer |
|---|---|
| E-posta | `ali@test.com` |
| Şifre | `Test1234!` |

---

## 💡 Teknolojiler

| Katman | Teknoloji |
|---|---|
| Frontend | HTML5, CSS3 (CSS Variables), Vanilla JS (ES2022) |
| İkonlar | Lucide Icons (CDN) |
| Grafikler | Chart.js 4 (CDN) |
| Backend | PHP 8.1+ (PDO, Sessions) |
| Veritabanı | MySQL 8.0 / MariaDB 10.6+ |
| Sunucu | Apache + mod_rewrite (XAMPP/WAMP) |
