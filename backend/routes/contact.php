<?php
// backend/routes/contact.php
require_once __DIR__ . '/../config.php';

$auth   = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') jsonResponse(['error' => 'Method Not Allowed'], 405);

$body = getRequestBody();
$konu  = sanitize($body['konu']  ?? '');
$mesaj = sanitize($body['mesaj'] ?? '');

if (!$konu || strlen($mesaj) < 10) {
    jsonResponse(['error' => 'Konu ve en az 10 karakter mesaj zorunludur'], 422);
}

// Kullanıcı bilgilerini çek
$db   = getDB();
$user = $db->prepare('SELECT ad, soyad, email FROM users WHERE id = ?');
$user->execute([$auth['id']]);
$u = $user->fetch();

$ins = $db->prepare(
    'INSERT INTO contact_messages (user_id, ad_soyad, email, konu, mesaj) VALUES (?, ?, ?, ?, ?)'
);
$ins->execute([$auth['id'], "{$u['ad']} {$u['soyad']}", $u['email'], $konu, $mesaj]);

jsonResponse(['success' => true, 'message' => 'Mesajınız alındı'], 201);
