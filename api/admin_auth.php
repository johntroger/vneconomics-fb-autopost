<?php
/**
 * ADMIN AUTHENTICATION VERIFICATION ENDPOINT
 * Supports either X-Admin-Token OR Firebase Google Auth UID in admin_firebase_uids.
 */

require_once __DIR__ . '/core/bootstrap.php';

vneBootstrapApi();
vneEnforceRateLimit('admin_auth_check', 25, 60);

$auth = vneVerifyAdminAccess();
vneJsonSuccess([
    'authenticated' => true,
    'method' => $auth['method'],
    'uid' => $auth['uid'],
    'email' => $auth['email'],
]);
