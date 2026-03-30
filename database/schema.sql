-- ============================================
-- BudgetBuddy Veritabanı Şeması
-- MySQL 5.7+
-- ============================================

CREATE DATABASE IF NOT EXISTS budgetbuddy CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci;
USE budgetbuddy;

-- ============================================
-- KULLANICILAR
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ad VARCHAR(50) NOT NULL,
    soyad VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    sifre VARCHAR(255) NOT NULL,
    para_birimi VARCHAR(10) DEFAULT 'TRY',
    avatar_url VARCHAR(255) DEFAULT NULL,
    olusturma_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- KATEGORİLER
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL COMMENT 'NULL = sistem kategorisi',
    ad VARCHAR(80) NOT NULL,
    tur ENUM('gelir','gider') NOT NULL,
    ikon VARCHAR(30) DEFAULT 'tag',
    renk VARCHAR(7) DEFAULT '#6366f1',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Sistem kategorileri (user_id = NULL)
INSERT INTO categories (user_id, ad, tur, ikon, renk) VALUES
(NULL, 'Maaş',           'gelir', 'briefcase',   '#22c55e'),
(NULL, 'Serbest Çalışma','gelir', 'laptop',       '#10b981'),
(NULL, 'Yatırım Getirisi','gelir','trending-up',  '#06b6d4'),
(NULL, 'Burs / Yardım',  'gelir', 'gift',         '#84cc16'),
(NULL, 'Diğer Gelir',    'gelir', 'plus-circle',  '#a3e635'),
(NULL, 'Yiyecek & İçecek','gider','coffee',       '#f97316'),
(NULL, 'Ulaşım',         'gider', 'map-pin',      '#fb923c'),
(NULL, 'Kira',           'gider', 'home',         '#ef4444'),
(NULL, 'Faturalar',      'gider', 'zap',          '#dc2626'),
(NULL, 'Eğitim',         'gider', 'book-open',    '#8b5cf6'),
(NULL, 'Sağlık',         'gider', 'heart',        '#ec4899'),
(NULL, 'Eğlence',        'gider', 'smile',        '#f43f5e'),
(NULL, 'Alışveriş',      'gider', 'shopping-bag', '#0ea5e9'),
(NULL, 'Spor',           'gider', 'activity',     '#14b8a6'),
(NULL, 'Diğer Gider',    'gider', 'minus-circle', '#94a3b8');

-- ============================================
-- İŞLEMLER (TRANSACTIONS)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    tur ENUM('gelir','gider') NOT NULL,
    miktar DECIMAL(12,2) NOT NULL,
    aciklama VARCHAR(255) DEFAULT NULL,
    tarih DATE NOT NULL,
    olusturma_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    INDEX idx_user_tarih (user_id, tarih),
    INDEX idx_user_tur (user_id, tur)
) ENGINE=InnoDB;

-- ============================================
-- BÜTÇE LİMİTLERİ
-- ============================================
CREATE TABLE IF NOT EXISTS budgets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    yil YEAR NOT NULL,
    ay TINYINT NOT NULL CHECK (ay BETWEEN 1 AND 12),
    limit_miktar DECIMAL(12,2) NOT NULL,
    UNIQUE KEY unique_budget (user_id, category_id, yil, ay),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- TASARRUF HEDEFLERİ
-- ============================================
CREATE TABLE IF NOT EXISTS savings_goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    baslik VARCHAR(100) NOT NULL,
    hedef_miktar DECIMAL(12,2) NOT NULL,
    mevcut_miktar DECIMAL(12,2) DEFAULT 0.00,
    bitis_tarihi DATE DEFAULT NULL,
    durum ENUM('devam','tamamlandi','iptal') DEFAULT 'devam',
    olusturma_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- İLETİŞİM MESAJLARI
-- ============================================
CREATE TABLE IF NOT EXISTS contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    ad_soyad VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    konu VARCHAR(150) NOT NULL,
    mesaj TEXT NOT NULL,
    durum ENUM('okunmadi','okundu','cevaplandi') DEFAULT 'okunmadi',
    olusturma_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- VIEW: Aylık Özet
-- ============================================
CREATE OR REPLACE VIEW v_aylik_ozet AS
SELECT
    t.user_id,
    YEAR(t.tarih)  AS yil,
    MONTH(t.tarih) AS ay,
    t.tur,
    SUM(t.miktar)  AS toplam
FROM transactions t
GROUP BY t.user_id, yil, ay, t.tur;

-- ============================================
-- VIEW: Kategori Toplamları
-- ============================================
CREATE OR REPLACE VIEW v_kategori_toplamlar AS
SELECT
    t.user_id,
    t.category_id,
    c.ad AS kategori_ad,
    c.tur,
    c.renk,
    c.ikon,
    SUM(t.miktar) AS toplam
FROM transactions t
JOIN categories c ON c.id = t.category_id
GROUP BY t.user_id, t.category_id, c.ad, c.tur, c.renk, c.ikon;
