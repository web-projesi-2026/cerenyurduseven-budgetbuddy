<?php
// backend/routes/transactions.php
// GET    /api/transactions        → Listele (filtreli)
// POST   /api/transactions        → Ekle
// PUT    /api/transactions/:id    → Güncelle
// DELETE /api/transactions/:id    → Sil

require_once __DIR__ . '/../config.php';

$auth   = requireAuth();
$uid    = $auth['id'];
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

match ($method) {
    'GET'    => listele($uid),
    'POST'   => ekle($uid),
    'PUT'    => guncelle($uid, $id),
    'DELETE' => sil($uid, $id),
    default  => jsonResponse(['error' => 'Method Not Allowed'], 405),
};

// ============================================
// LİSTELE
// ============================================
function listele(int $uid): void {
    $db = getDB();

    // Filtreler
    $where  = ['t.user_id = :uid'];
    $params = [':uid' => $uid];

    if (!empty($_GET['tur'])) {
        $where[] = 't.tur = :tur';
        $params[':tur'] = $_GET['tur'];
    }
    if (!empty($_GET['category_id'])) {
        $where[] = 't.category_id = :cat';
        $params[':cat'] = (int)$_GET['category_id'];
    }
    if (!empty($_GET['baslangic'])) {
        $where[] = 't.tarih >= :bas';
        $params[':bas'] = $_GET['baslangic'];
    }
    if (!empty($_GET['bitis'])) {
        $where[] = 't.tarih <= :bit';
        $params[':bit'] = $_GET['bitis'];
    }
    if (!empty($_GET['ay'])) {
        $where[] = 'MONTH(t.tarih) = :ay';
        $params[':ay'] = (int)$_GET['ay'];
    }
    if (!empty($_GET['yil'])) {
        $where[] = 'YEAR(t.tarih) = :yil';
        $params[':yil'] = (int)$_GET['yil'];
    }

    $sql = 'SELECT t.id, t.tur, t.miktar, t.aciklama, t.tarih,
                   c.id AS category_id, c.ad AS kategori, c.ikon, c.renk,
                   t.olusturma_tarihi
            FROM transactions t
            JOIN categories c ON c.id = t.category_id
            WHERE ' . implode(' AND ', $where) . '
            ORDER BY t.tarih DESC, t.olusturma_tarihi DESC
            LIMIT 500';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    // Özet
    $ozet = ['toplam_gelir' => 0, 'toplam_gider' => 0, 'bakiye' => 0];
    foreach ($rows as $r) {
        if ($r['tur'] === 'gelir') $ozet['toplam_gelir'] += $r['miktar'];
        else                        $ozet['toplam_gider'] += $r['miktar'];
    }
    $ozet['bakiye'] = $ozet['toplam_gelir'] - $ozet['toplam_gider'];

    jsonResponse(['transactions' => $rows, 'ozet' => $ozet, 'toplam' => count($rows)]);
}

// ============================================
// EKLE
// ============================================
function ekle(int $uid): void {
    $body = getRequestBody();

    $category_id = (int)($body['category_id'] ?? 0);
    $tur         = $body['tur']         ?? '';
    $miktar      = (float)($body['miktar'] ?? 0);
    $aciklama    = sanitize($body['aciklama'] ?? '');
    $tarih       = $body['tarih'] ?? date('Y-m-d');

    if (!$category_id || !in_array($tur, ['gelir','gider'], true) || $miktar <= 0) {
        jsonResponse(['error' => 'Kategori, tür ve pozitif miktar zorunludur'], 422);
    }

    // Tarihi doğrula
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $tarih)) {
        jsonResponse(['error' => 'Geçersiz tarih formatı (YYYY-MM-DD)'], 422);
    }

    $db   = getDB();
    $stmt = $db->prepare(
        'INSERT INTO transactions (user_id, category_id, tur, miktar, aciklama, tarih)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$uid, $category_id, $tur, $miktar, $aciklama, $tarih]);
    $newId = (int)$db->lastInsertId();

    // Eklenen kaydı geri dön
    $row = $db->prepare(
        'SELECT t.*, c.ad AS kategori, c.ikon, c.renk
         FROM transactions t JOIN categories c ON c.id = t.category_id
         WHERE t.id = ?'
    );
    $row->execute([$newId]);

    jsonResponse(['success' => true, 'transaction' => $row->fetch()], 201);
}

// ============================================
// GÜNCELLE
// ============================================
function guncelle(int $uid, ?int $id): void {
    if (!$id) jsonResponse(['error' => 'ID zorunludur'], 400);

    $body = getRequestBody();
    $db   = getDB();

    // Sahiplik kontrolü
    $own = $db->prepare('SELECT id FROM transactions WHERE id = ? AND user_id = ?');
    $own->execute([$id, $uid]);
    if (!$own->fetch()) jsonResponse(['error' => 'Kayıt bulunamadı'], 404);

    $fields = [];
    $params = [];

    if (isset($body['category_id'])) { $fields[] = 'category_id = ?'; $params[] = (int)$body['category_id']; }
    if (isset($body['tur']))         { $fields[] = 'tur = ?';         $params[] = $body['tur']; }
    if (isset($body['miktar']))      { $fields[] = 'miktar = ?';      $params[] = (float)$body['miktar']; }
    if (isset($body['aciklama']))    { $fields[] = 'aciklama = ?';    $params[] = sanitize($body['aciklama']); }
    if (isset($body['tarih']))       { $fields[] = 'tarih = ?';       $params[] = $body['tarih']; }

    if (empty($fields)) jsonResponse(['error' => 'Güncellenecek alan bulunamadı'], 422);

    $params[] = $id;
    $params[] = $uid;

    $db->prepare('UPDATE transactions SET ' . implode(', ', $fields) . ' WHERE id = ? AND user_id = ?')
       ->execute($params);

    jsonResponse(['success' => true, 'message' => 'Kayıt güncellendi']);
}

// ============================================
// SİL
// ============================================
function sil(int $uid, ?int $id): void {
    if (!$id) jsonResponse(['error' => 'ID zorunludur'], 400);

    $db  = getDB();
    $del = $db->prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?');
    $del->execute([$id, $uid]);

    if ($del->rowCount() === 0) jsonResponse(['error' => 'Kayıt bulunamadı'], 404);
    jsonResponse(['success' => true, 'message' => 'Kayıt silindi']);
}
