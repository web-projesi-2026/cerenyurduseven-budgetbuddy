<?php
// backend/routes/reports.php
require_once __DIR__ . '/../config.php';

$auth   = requireAuth();
$uid    = $auth['id'];
$action = $_GET['action'] ?? 'ozet';

match ($action) {
    'ozet'       => ozet($uid),
    'aylik'      => aylik($uid),
    'kategoriler' => kategoriler($uid),
    'haftalik'   => haftalik($uid),
    'tasarruf'   => tasarruf($uid),
    default      => jsonResponse(['error' => 'Geçersiz rapor tipi'], 404),
};

// ============================================
// GENEL ÖZET (bakiye, bu ay)
// ============================================
function ozet(int $uid): void {
    $db  = getDB();
    $yil = (int)date('Y');
    $ay  = (int)date('m');

    // Tüm zamanlar
    $stmt = $db->prepare(
        'SELECT tur, SUM(miktar) AS toplam FROM transactions WHERE user_id = ? GROUP BY tur'
    );
    $stmt->execute([$uid]);
    $rows = $stmt->fetchAll();

    $gelir = $gider = 0.0;
    foreach ($rows as $r) {
        if ($r['tur'] === 'gelir') $gelir = (float)$r['toplam'];
        else $gider = (float)$r['toplam'];
    }

    // Bu ay
    $stmt2 = $db->prepare(
        'SELECT tur, SUM(miktar) AS toplam FROM transactions
         WHERE user_id = ? AND YEAR(tarih) = ? AND MONTH(tarih) = ?
         GROUP BY tur'
    );
    $stmt2->execute([$uid, $yil, $ay]);
    $bu_ay_gelir = $bu_ay_gider = 0.0;
    foreach ($stmt2->fetchAll() as $r) {
        if ($r['tur'] === 'gelir') $bu_ay_gelir = (float)$r['toplam'];
        else $bu_ay_gider = (float)$r['toplam'];
    }

    // Son 5 işlem
    $son = $db->prepare(
        'SELECT t.id, t.tur, t.miktar, t.aciklama, t.tarih, c.ad AS kategori, c.ikon, c.renk
         FROM transactions t JOIN categories c ON c.id = t.category_id
         WHERE t.user_id = ? ORDER BY t.tarih DESC, t.id DESC LIMIT 5'
    );
    $son->execute([$uid]);

    jsonResponse([
        'bakiye'       => $gelir - $gider,
        'toplam_gelir' => $gelir,
        'toplam_gider' => $gider,
        'bu_ay' => [
            'gelir'  => $bu_ay_gelir,
            'gider'  => $bu_ay_gider,
            'bakiye' => $bu_ay_gelir - $bu_ay_gider,
        ],
        'son_islemler' => $son->fetchAll(),
    ]);
}

// ============================================
// AYLIK GELİR/GİDER (son 6 ay)
// ============================================
function aylik(int $uid): void {
    $db   = getDB();
    $stmt = $db->prepare(
        'SELECT YEAR(tarih) AS yil, MONTH(tarih) AS ay, tur, SUM(miktar) AS toplam
         FROM transactions
         WHERE user_id = ? AND tarih >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
         GROUP BY yil, ay, tur
         ORDER BY yil, ay'
    );
    $stmt->execute([$uid]);
    $rows = $stmt->fetchAll();

    // Son 6 ay listesi oluştur
    $aylar = [];
    for ($i = 5; $i >= 0; $i--) {
        $ts     = strtotime("-$i months");
        $aylar[] = [
            'yil'   => (int)date('Y', $ts),
            'ay'    => (int)date('n', $ts),
            'etiket'=> strftime('%b %Y', $ts) ?: date('M Y', $ts),
            'gelir' => 0.0,
            'gider' => 0.0,
        ];
    }

    foreach ($rows as $r) {
        foreach ($aylar as &$a) {
            if ($a['yil'] === (int)$r['yil'] && $a['ay'] === (int)$r['ay']) {
                $a[$r['tur']] = (float)$r['toplam'];
            }
        }
    }

    jsonResponse(['aylik' => $aylar]);
}

// ============================================
// KATEGORİ DAĞILIMI
// ============================================
function kategoriler(int $uid): void {
    $db   = getDB();
    $tur  = $_GET['tur'] ?? 'gider';
    $yil  = $_GET['yil'] ?? date('Y');
    $ay   = $_GET['ay']  ?? date('n');

    $stmt = $db->prepare(
        'SELECT c.ad AS kategori, c.renk, SUM(t.miktar) AS toplam
         FROM transactions t JOIN categories c ON c.id = t.category_id
         WHERE t.user_id = ? AND t.tur = ? AND YEAR(t.tarih) = ? AND MONTH(t.tarih) = ?
         GROUP BY c.id, c.ad, c.renk
         ORDER BY toplam DESC'
    );
    $stmt->execute([$uid, $tur, $yil, $ay]);
    $rows = $stmt->fetchAll();

    $genel_toplam = array_sum(array_column($rows, 'toplam'));
    foreach ($rows as &$r) {
        $r['yuzde'] = $genel_toplam > 0 ? round(($r['toplam'] / $genel_toplam) * 100, 1) : 0;
    }

    jsonResponse(['kategoriler' => $rows, 'genel_toplam' => $genel_toplam]);
}

// ============================================
// HAFTALİK (son 4 hafta)
// ============================================
function haftalik(int $uid): void {
    $db   = getDB();
    $stmt = $db->prepare(
        'SELECT YEARWEEK(tarih, 1) AS hafta_no,
                MIN(tarih) AS hafta_bas,
                tur, SUM(miktar) AS toplam
         FROM transactions
         WHERE user_id = ? AND tarih >= DATE_SUB(CURDATE(), INTERVAL 4 WEEK)
         GROUP BY hafta_no, tur
         ORDER BY hafta_no'
    );
    $stmt->execute([$uid]);
    $rows = $stmt->fetchAll();

    $haftalar = [];
    foreach ($rows as $r) {
        $k = $r['hafta_no'];
        if (!isset($haftalar[$k])) {
            $haftalar[$k] = ['hafta' => $r['hafta_bas'], 'gelir' => 0.0, 'gider' => 0.0];
        }
        $haftalar[$k][$r['tur']] = (float)$r['toplam'];
    }

    jsonResponse(['haftalik' => array_values($haftalar)]);
}

// ============================================
// TASARRUF HEDEFLERİ
// ============================================
function tasarruf(int $uid): void {
    $db   = getDB();
    $stmt = $db->prepare(
        'SELECT *, ROUND((mevcut_miktar / hedef_miktar) * 100, 1) AS yuzde
         FROM savings_goals WHERE user_id = ? AND durum = "devam" ORDER BY bitis_tarihi'
    );
    $stmt->execute([$uid]);
    jsonResponse(['hedefler' => $stmt->fetchAll()]);
}
