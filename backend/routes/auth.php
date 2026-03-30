<?php
// backend/routes/auth.php
// POST /api/auth/kayit  → Kayıt
// POST /api/auth/giris  → Giriş
// POST /api/auth/cikis  → Çıkış
// GET  /api/auth/ben    → Mevcut kullanıcı

require_once __DIR__ . '/../config.php';

startSession();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

match ($action) {
    'kayit'  => handleKayit($method),
    'giris'  => handleGiris($method),
    'cikis'  => handleCikis($method),
    'ben'    => handleBen($method),
    'profil' => handleProfil($method),
    'sifre'  => handleSifre($method),
    default  => jsonResponse(['error' => 'Geçersiz endpoint'], 404),
};

// ============================================
// KAYIT
// ============================================
function handleKayit(string $method): void {
    if ($method !== 'POST') jsonResponse(['error' => 'Method Not Allowed'], 405);

    $body = getRequestBody();
    $ad     = sanitize($body['ad']     ?? '');
    $soyad  = sanitize($body['soyad']  ?? '');
    $email  = filter_var($body['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $sifre  = $body['sifre'] ?? '';

    if (!$ad || !$soyad || !$email) {
        jsonResponse(['error' => 'Ad, soyad ve geçerli e-posta zorunludur'], 422);
    }
    if (strlen($sifre) < 6) {
        jsonResponse(['error' => 'Şifre en az 6 karakter olmalıdır'], 422);
    }

    $db = getDB();

    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'Bu e-posta adresi zaten kayıtlı'], 409);
    }

    $hash = password_hash($sifre, PASSWORD_BCRYPT, ['cost' => 12]);
    $ins  = $db->prepare('INSERT INTO users (ad, soyad, email, sifre) VALUES (?, ?, ?, ?)');
    $ins->execute([$ad, $soyad, $email, $hash]);

    $userId = (int)$db->lastInsertId();
    $_SESSION['user_id'] = $userId;
    $_SESSION['email']   = $email;

    jsonResponse([
        'success' => true,
        'message' => 'Hesabınız oluşturuldu',
        'user'    => ['id' => $userId, 'ad' => $ad, 'soyad' => $soyad, 'email' => $email],
    ], 201);
}

// ============================================
// GİRİŞ
// ============================================
function handleGiris(string $method): void {
    if ($method !== 'POST') jsonResponse(['error' => 'Method Not Allowed'], 405);

    $body  = getRequestBody();
    $email = filter_var($body['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $sifre = $body['sifre'] ?? '';

    if (!$email || !$sifre) {
        jsonResponse(['error' => 'E-posta ve şifre zorunludur'], 422);
    }

    $db   = getDB();
    $stmt = $db->prepare('SELECT id, ad, soyad, email, sifre FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($sifre, $user['sifre'])) {
        jsonResponse(['error' => 'E-posta veya şifre hatalı'], 401);
    }

    $_SESSION['user_id'] = $user['id'];
    $_SESSION['email']   = $user['email'];

    unset($user['sifre']);
    jsonResponse(['success' => true, 'user' => $user]);
}

// ============================================
// ÇIKIŞ
// ============================================
function handleCikis(string $method): void {
    session_destroy();
    jsonResponse(['success' => true, 'message' => 'Çıkış yapıldı']);
}

// ============================================
// MEVCUt KULLANICI
// ============================================
function handleBen(string $method): void {
    if ($method !== 'GET') jsonResponse(['error' => 'Method Not Allowed'], 405);
    $auth = requireAuth();

    $db   = getDB();
    $stmt = $db->prepare('SELECT id, ad, soyad, email, para_birimi, olusturma_tarihi FROM users WHERE id = ?');
    $stmt->execute([$auth['id']]);
    $user = $stmt->fetch();

    if (!$user) jsonResponse(['error' => 'Kullanıcı bulunamadı'], 404);
    jsonResponse(['user' => $user]);
}

// ============================================
// PROFİL GÜNCELLE
// ============================================
function handleProfil(string $method): void {
    if ($method !== 'PUT') jsonResponse(['error' => 'Method Not Allowed'], 405);
    $auth = requireAuth();
    $body = getRequestBody();

    $ad           = sanitize($body['ad']           ?? '');
    $soyad        = sanitize($body['soyad']        ?? '');
    $para_birimi  = sanitize($body['para_birimi']  ?? 'TRY');

    if (!$ad || !$soyad) jsonResponse(['error' => 'Ad ve soyad zorunludur'], 422);

    $allowed = ['TRY','USD','EUR','GBP'];
    if (!in_array($para_birimi, $allowed, true)) $para_birimi = 'TRY';

    $db = getDB();
    $db->prepare('UPDATE users SET ad = ?, soyad = ?, para_birimi = ? WHERE id = ?')
       ->execute([$ad, $soyad, $para_birimi, $auth['id']]);

    jsonResponse(['success' => true, 'message' => 'Profil güncellendi']);
}

// ============================================
// ŞİFRE DEĞİŞTİR
// ============================================
function handleSifre(string $method): void {
    if ($method !== 'PUT') jsonResponse(['error' => 'Method Not Allowed'], 405);
    $auth = requireAuth();
    $body = getRequestBody();

    $mevcut = $body['mevcut_sifre'] ?? '';
    $yeni   = $body['yeni_sifre']   ?? '';

    if (!$mevcut || strlen($yeni) < 6) {
        jsonResponse(['error' => 'Mevcut şifre ve en az 6 karakter yeni şifre zorunludur'], 422);
    }

    $db   = getDB();
    $stmt = $db->prepare('SELECT sifre FROM users WHERE id = ?');
    $stmt->execute([$auth['id']]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($mevcut, $user['sifre'])) {
        jsonResponse(['error' => 'Mevcut şifre hatalı'], 401);
    }

    $hash = password_hash($yeni, PASSWORD_BCRYPT, ['cost' => 12]);
    $db->prepare('UPDATE users SET sifre = ? WHERE id = ?')->execute([$hash, $auth['id']]);

    jsonResponse(['success' => true, 'message' => 'Şifre güncellendi']);
}
