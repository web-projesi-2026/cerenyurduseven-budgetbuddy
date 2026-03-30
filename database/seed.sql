-- ============================================
-- BudgetBuddy Test Verisi
-- Önce schema.sql çalıştırın
-- ============================================
USE budgetbuddy;

-- Test kullanıcısı (şifre: Test1234!)
INSERT INTO users (ad, soyad, email, sifre) VALUES
('Ali', 'Yılmaz', 'ali@test.com', '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

SET @uid = LAST_INSERT_ID();

-- İşlemler - son 3 ay
INSERT INTO transactions (user_id, category_id, tur, miktar, aciklama, tarih) VALUES
(@uid, 1,  'gelir', 15000.00, 'Ocak Maaşı',         DATE_FORMAT(NOW() - INTERVAL 2 MONTH, '%Y-%m-01')),
(@uid, 4,  'gelir',  2500.00, 'Burs ödemesi',        DATE_FORMAT(NOW() - INTERVAL 2 MONTH, '%Y-%m-05')),
(@uid, 8,  'gider',  4500.00, 'Kira',                DATE_FORMAT(NOW() - INTERVAL 2 MONTH, '%Y-%m-03')),
(@uid, 6,  'gider',  1200.00, 'Market alışverişi',   DATE_FORMAT(NOW() - INTERVAL 2 MONTH, '%Y-%m-10')),
(@uid, 9,  'gider',   350.00, 'Elektrik faturası',   DATE_FORMAT(NOW() - INTERVAL 2 MONTH, '%Y-%m-12')),
(@uid, 7,  'gider',   280.00, 'Otobüs kartı',        DATE_FORMAT(NOW() - INTERVAL 2 MONTH, '%Y-%m-15')),
(@uid, 10, 'gider',   750.00, 'Kitaplar',            DATE_FORMAT(NOW() - INTERVAL 2 MONTH, '%Y-%m-20')),

(@uid, 1,  'gelir', 15000.00, 'Şubat Maaşı',         DATE_FORMAT(NOW() - INTERVAL 1 MONTH, '%Y-%m-01')),
(@uid, 4,  'gelir',  2500.00, 'Burs ödemesi',         DATE_FORMAT(NOW() - INTERVAL 1 MONTH, '%Y-%m-05')),
(@uid, 8,  'gider',  4500.00, 'Kira',                 DATE_FORMAT(NOW() - INTERVAL 1 MONTH, '%Y-%m-03')),
(@uid, 6,  'gider',  1450.00, 'Market + dışarıda yeme', DATE_FORMAT(NOW() - INTERVAL 1 MONTH, '%Y-%m-08')),
(@uid, 12, 'gider',   600.00, 'Sinema + konser',      DATE_FORMAT(NOW() - INTERVAL 1 MONTH, '%Y-%m-14')),
(@uid, 13, 'gider',  2200.00, 'Kıyafet alışverişi',  DATE_FORMAT(NOW() - INTERVAL 1 MONTH, '%Y-%m-18')),
(@uid, 9,  'gider',   420.00, 'Su + internet',        DATE_FORMAT(NOW() - INTERVAL 1 MONTH, '%Y-%m-20')),

(@uid, 1,  'gelir', 15000.00, 'Mart Maaşı',           DATE_FORMAT(NOW(), '%Y-%m-01')),
(@uid, 2,  'gelir',  3500.00, 'Freelance proje',      DATE_FORMAT(NOW(), '%Y-%m-05')),
(@uid, 8,  'gider',  4500.00, 'Kira',                 DATE_FORMAT(NOW(), '%Y-%m-03')),
(@uid, 6,  'gider',   980.00, 'Market',               DATE_FORMAT(NOW(), '%Y-%m-09')),
(@uid, 7,  'gider',   150.00, 'Taksi',                DATE_FORMAT(NOW(), '%Y-%m-11')),
(@uid, 11, 'gider',   300.00, 'Eczane',               DATE_FORMAT(NOW(), '%Y-%m-13'));

-- Bütçe limitleri
INSERT INTO budgets (user_id, category_id, yil, ay, limit_miktar) VALUES
(@uid, 6,  YEAR(NOW()), MONTH(NOW()), 2000.00),
(@uid, 7,  YEAR(NOW()), MONTH(NOW()),  500.00),
(@uid, 8,  YEAR(NOW()), MONTH(NOW()), 4500.00),
(@uid, 12, YEAR(NOW()), MONTH(NOW()),  800.00),
(@uid, 13, YEAR(NOW()), MONTH(NOW()), 1500.00);

-- Tasarruf hedefleri
INSERT INTO savings_goals (user_id, baslik, hedef_miktar, mevcut_miktar, bitis_tarihi) VALUES
(@uid, 'Yeni Laptop',      15000.00, 4500.00, DATE_ADD(NOW(), INTERVAL 4 MONTH)),
(@uid, 'Yaz Tatili',        8000.00, 1200.00, DATE_ADD(NOW(), INTERVAL 5 MONTH)),
(@uid, 'Acil Durum Fonu',  20000.00, 8000.00, DATE_ADD(NOW(), INTERVAL 8 MONTH));
