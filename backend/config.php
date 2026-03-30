<?php
// ============================================
// BudgetBuddy - Veritabanı Yapılandırması
// ============================================

define('DB_HOST', 'localhost');
define('DB_NAME', 'budgetbuddy');
define('DB_USER', 'root');        // XAMPP default
define('DB_PASS', '');            // XAMPP default (boş)
define('DB_CHARSET', 'utf8mb4');

define('SESSION_LIFETIME', 3600 * 24 * 7); // 7 gün

// ============================================
// PDO Bağlantısı
// ============================================
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=%s',
            DB_HOST, DB_NAME, DB_CHARSET
        );
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            jsonResponse(['error' => 'Veritabanı bağlantı hatası: ' . $e->getMessage()], 500);
        }
    }
    return $pdo;
}

// ============================================
// Yardımcı Fonksiyonlar
// ============================================
function jsonResponse(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function getRequestBody(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

function sanitize(string $val): string {
    return htmlspecialchars(strip_tags(trim($val)), ENT_QUOTES, 'UTF-8');
}

// ============================================
// Session & Auth
// ============================================
function startSession(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'lifetime' => SESSION_LIFETIME,
            'path'     => '/',
            'secure'   => false, // Canlıda true yapın (HTTPS)
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
        session_start();
    }
}

function requireAuth(): array {
    startSession();
    if (empty($_SESSION['user_id'])) {
        jsonResponse(['error' => 'Oturum açmanız gerekiyor', 'redirect' => '/pages/giris.html'], 401);
    }
    return ['id' => (int)$_SESSION['user_id'], 'email' => $_SESSION['email']];
}

// ============================================
// CORS (geliştirme için)
// ============================================
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
