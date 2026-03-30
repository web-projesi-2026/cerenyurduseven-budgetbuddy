<?php
// backend/middleware/auth_check.php
// Tüm korumalı HTML sayfaları bu dosyayı include eder.
// Oturum yoksa giriş sayfasına yönlendirir.
require_once __DIR__ . '/../config.php';
startSession();
if (empty($_SESSION['user_id'])) {
    header('Location: /pages/giris.html');
    exit;
}
?>
