-- ============================================
-- BudgetBuddy – Referans SQL Sorguları
-- Geliştirme ve debug için
-- ============================================
USE budgetbuddy;

-- ─── Kullanıcı Sorgular ──────────────────────
-- Tüm kullanıcılar
SELECT id, ad, soyad, email, para_birimi, olusturma_tarihi FROM users;

-- Belirli kullanıcı
SELECT * FROM users WHERE id = 1;

-- ─── Kategori Sorgular ───────────────────────
-- Sistem + kişisel kategoriler
SELECT *, IF(user_id IS NULL,'Sistem','Özel') AS tip
FROM categories ORDER BY tur, tip;

-- ─── İşlem Sorgular ─────────────────────────
-- Bir kullanıcının tüm işlemleri (son önce)
SELECT t.id, t.tur, t.miktar, t.aciklama, t.tarih,
       c.ad AS kategori
FROM transactions t
JOIN categories c ON c.id = t.category_id
WHERE t.user_id = 1
ORDER BY t.tarih DESC;

-- Bu ayki gelir/gider toplamları
SELECT tur, SUM(miktar) AS toplam
FROM transactions
WHERE user_id = 1
  AND YEAR(tarih) = YEAR(CURDATE())
  AND MONTH(tarih) = MONTH(CURDATE())
GROUP BY tur;

-- Son 6 ay aylık dağılım
SELECT YEAR(tarih) yil, MONTH(tarih) ay,
       tur, SUM(miktar) toplam
FROM transactions
WHERE user_id = 1
  AND tarih >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
GROUP BY yil, ay, tur
ORDER BY yil, ay;

-- En çok harcanan 5 kategori (bu ay)
SELECT c.ad, c.renk, SUM(t.miktar) AS toplam
FROM transactions t
JOIN categories c ON c.id = t.category_id
WHERE t.user_id = 1
  AND t.tur = 'gider'
  AND YEAR(t.tarih)  = YEAR(CURDATE())
  AND MONTH(t.tarih) = MONTH(CURDATE())
GROUP BY c.id, c.ad, c.renk
ORDER BY toplam DESC
LIMIT 5;

-- Günlük harcama (son 30 gün)
SELECT DATE(tarih) AS gun, SUM(miktar) AS toplam
FROM transactions
WHERE user_id = 1
  AND tur = 'gider'
  AND tarih >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY gun
ORDER BY gun;

-- ─── Bütçe Sorgular ──────────────────────────
-- Bu ayın bütçeleri ve harcama durumu
SELECT b.category_id, c.ad,
       b.limit_miktar,
       COALESCE(SUM(t.miktar),0) AS harcanan,
       b.limit_miktar - COALESCE(SUM(t.miktar),0) AS kalan,
       ROUND(COALESCE(SUM(t.miktar),0) / b.limit_miktar * 100, 1) AS yuzde
FROM budgets b
JOIN categories c ON c.id = b.category_id
LEFT JOIN transactions t
  ON t.user_id = b.user_id
 AND t.category_id = b.category_id
 AND t.tur = 'gider'
 AND YEAR(t.tarih) = b.yil
 AND MONTH(t.tarih) = b.ay
WHERE b.user_id = 1
  AND b.yil  = YEAR(CURDATE())
  AND b.ay   = MONTH(CURDATE())
GROUP BY b.id, b.category_id, c.ad, b.limit_miktar;

-- ─── Özet View Sorgular ───────────────────────
SELECT * FROM v_aylik_ozet WHERE user_id = 1 ORDER BY yil DESC, ay DESC;
SELECT * FROM v_kategori_toplamlar WHERE user_id = 1 ORDER BY toplam DESC;

-- ─── Tasarruf Hedefleri ───────────────────────
SELECT *, ROUND(mevcut_miktar/hedef_miktar*100,1) AS yuzde
FROM savings_goals WHERE user_id = 1;

-- ─── Admin / İstatistik ───────────────────────
-- Toplam kullanıcı sayısı
SELECT COUNT(*) AS kullanici_sayisi FROM users;

-- Toplam işlem sayısı ve hacmi
SELECT COUNT(*) AS islem_sayisi,
       SUM(miktar) AS toplam_hacim,
       tur
FROM transactions GROUP BY tur;

-- İletişim mesajları
SELECT cm.*, u.ad, u.soyad
FROM contact_messages cm
LEFT JOIN users u ON u.id = cm.user_id
ORDER BY cm.olusturma_tarihi DESC;
