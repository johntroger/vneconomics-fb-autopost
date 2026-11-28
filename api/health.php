<?php
/**
 * HEALTH CHECK ENDPOINT (KIỂM TRA PHP 8, CACHE & MYSQL)
 */

require_once __DIR__ . '/core/bootstrap.php';

vneBootstrapApi();
$pdo = getDbConnection();

vneJsonSuccess([
    'service'     => 'vneconomics-api',
    'php_version' => PHP_VERSION,
    'db_status'   => $pdo ? 'connected' : 'disconnected',
    'timestamp'   => gmdate('c'),
]);
