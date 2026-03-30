<?php
// backend/routes/categories.php
require_once __DIR__ . '/../config.php';

$auth   = requireAuth();
$uid    = $auth['id'];
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

match ($method) {
    'GET'    => liste($uid),
    'POST'   => ekle($uid),
    'DELETE' => sil($uid, $id),
    default  => jsonResponse(['error' => 'Method Not Allowed'], 405),
};

function liste(int $uid): void {
    $db   = getDB();
    $stmt = $db->prepare(
        'SELECT id, user_id, ad, tur, ikon, renk,
                IF(user_id IS NULL, 0, 1) AS ozel
         FROM categories
         WHERE user_id IS NULL OR user_id = ?
         ORDER BY tur, ozel, ad'
    );
    $stmt->execute([$uid]);
    jsonResponse(['categories' => $stmt->fetchAll()]);
}

function ekle(int $uid): void {
    $body = getRequestBody();
    $ad   = sanitize($body['ad'] ?? '');
    $tur  = $body['tur'] ?? '';
    $ikon = sanitize($body['ikon'] ?? 'tag');
    $renk = sanitize($body['renk'] ?? '#6366f1');

    if (!$ad || !in_array($tur, ['gelir','gider'], true)) {
        jsonResponse(['error' => 'Ad ve tür zorunludur'], 422);
    }
    $db   = getDB();
    $stmt = $db->prepare('INSERT INTO categories (user_id, ad, tur, ikon, renk) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$uid, $ad, $tur, $ikon, $renk]);
    jsonResponse(['success' => true, 'id' => (int)$db->lastInsertId()], 201);
}

function sil(int $uid, ?int $id): void {
    if (!$id) jsonResponse(['error' => 'ID zorunludur'], 400);
    $db  = getDB();
    $del = $db->prepare('DELETE FROM categories WHERE id = ? AND user_id = ?');
    $del->execute([$id, $uid]);
    if ($del->rowCount() === 0) jsonResponse(['error' => 'Kategori bulunamadı veya sistem kategorisi silinemez'], 404);
    jsonResponse(['success' => true]);
}
