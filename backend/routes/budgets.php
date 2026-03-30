<?php
// backend/routes/budgets.php
// GET  /api/budgets          → Bu ay bütçe limitlerini listele
// POST /api/budgets          → Limit ekle / güncelle
// DELETE /api/budgets?id=N   → Limit sil

require_once __DIR__ . '/../config.php';

$auth   = requireAuth();
$uid    = $auth['id'];
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

match ($method) {
    'GET'    => liste($uid),
    'POST'   => kaydet($uid),
    'DELETE' => sil($uid, $id),
    default  => jsonResponse(['error' => 'Method Not Allowed'], 405),
};

// ─── Listele ────────────────────────────────
function liste(int $uid): void {
    $db  = getDB();
    $yil = (int)($_GET['yil'] ?? date('Y'));
    $ay  = (int)($_GET['ay']  ?? date('n'));

    $stmt = $db->prepare(
        'SELECT b.id, b.category_id, c.ad AS kategori, c.ikon, c.renk,
                b.limit_miktar,
                COALESCE(SUM(t.miktar),0) AS harcanan,
                b.limit_miktar - COALESCE(SUM(t.miktar),0) AS kalan
         FROM budgets b
         JOIN categories c ON c.id = b.category_id
         LEFT JOIN transactions t
           ON t.user_id = b.user_id
          AND t.category_id = b.category_id
          AND t.tur = "gider"
          AND YEAR(t.tarih) = b.yil
          AND MONTH(t.tarih) = b.ay
         WHERE b.user_id = ? AND b.yil = ? AND b.ay = ?
         GROUP BY b.id, b.category_id, c.ad, c.ikon, c.renk, b.limit_miktar'
    );
    $stmt->execute([$uid, $yil, $ay]);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
        $r['yuzde'] = $r['limit_miktar'] > 0
            ? round(($r['harcanan'] / $r['limit_miktar']) * 100, 1)
            : 0;
    }
    jsonResponse(['budgets' => $rows, 'yil' => $yil, 'ay' => $ay]);
}

// ─── Ekle / Güncelle ────────────────────────
function kaydet(int $uid): void {
    $body        = getRequestBody();
    $category_id = (int)($body['category_id']  ?? 0);
    $limit       = (float)($body['limit_miktar'] ?? 0);
    $yil         = (int)($body['yil'] ?? date('Y'));
    $ay          = (int)($body['ay']  ?? date('n'));

    if (!$category_id || $limit <= 0) {
        jsonResponse(['error' => 'Kategori ve pozitif limit zorunludur'], 422);
    }

    $db = getDB();
    $db->prepare(
        'INSERT INTO budgets (user_id, category_id, yil, ay, limit_miktar)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE limit_miktar = VALUES(limit_miktar)'
    )->execute([$uid, $category_id, $yil, $ay, $limit]);

    jsonResponse(['success' => true, 'message' => 'Bütçe limiti kaydedildi']);
}

// ─── Sil ────────────────────────────────────
function sil(int $uid, ?int $id): void {
    if (!$id) jsonResponse(['error' => 'ID zorunludur'], 400);
    $db  = getDB();
    $del = $db->prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?');
    $del->execute([$id, $uid]);
    if ($del->rowCount() === 0) jsonResponse(['error' => 'Limit bulunamadı'], 404);
    jsonResponse(['success' => true]);
}
