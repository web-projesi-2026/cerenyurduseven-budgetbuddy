<?php
// backend/index.php  →  Tek giriş noktası (Front Controller)
// Tüm /api/* isteklerini doğru route dosyasına yönlendirir.
// .htaccess'te: RewriteRule ^api/(.*)$ backend/index.php [QSA,L]

require_once __DIR__ . '/config.php';

$uri    = $_SERVER['REQUEST_URI'] ?? '/';
$path   = parse_url($uri, PHP_URL_PATH);
$path   = preg_replace('#^/BudgetBuddy#', '', $path); // alt klasör desteği
$parts  = explode('/', trim($path, '/'));
// parts[0] = 'api', parts[1] = route adı

$route = $parts[1] ?? '';

// ID varsa GET parametresine ekle
if (!empty($parts[2]) && is_numeric($parts[2])) {
    $_GET['id'] = $parts[2];
}

match ($route) {
    'auth'         => require __DIR__ . '/routes/auth.php',
    'transactions' => require __DIR__ . '/routes/transactions.php',
    'categories'   => require __DIR__ . '/routes/categories.php',
    'reports'      => require __DIR__ . '/routes/reports.php',
    'budgets'      => require __DIR__ . '/routes/budgets.php',
    'contact'      => require __DIR__ . '/routes/contact.php',
    default        => jsonResponse(['error' => "Route bulunamadı: /$route", 'path' => $path], 404),
};
