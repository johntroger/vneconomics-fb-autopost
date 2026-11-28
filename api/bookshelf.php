<?php
declare(strict_types=1);

/**
 * MY BOOKSHELF & READING DIARY SYNC API (/tu-sach-cua-toi/)
 * Yêu cầu Firebase JWT RS256 để đồng bộ Tủ sách, tiến độ đọc và Nhật ký ghi chú giữa nhiều thiết bị.
 */

require_once __DIR__ . '/core/bootstrap.php';

vneBootstrapApi();
vneEnforceRateLimit('bookshelf', 40, 60);

$claims = vneRequireAuth();
$pdo = getDbConnection();
if (!$pdo) {
    vneJsonError('Không thể kết nối cơ sở dữ liệu.', 503, 'DB_UNAVAILABLE');
}

$uid = (string)$claims['sub'];
$userStmt = $pdo->prepare("SELECT id FROM users WHERE firebase_uid = :uid LIMIT 1");
$userStmt->execute([':uid' => $uid]);
$user = $userStmt->fetch();
if (!$user) {
    vneJsonError('Tài khoản chưa tồn tại trong hệ thống.', 403, 'USER_NOT_SYNCED');
}
$userId = (int)$user['id'];

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $bStmt = $pdo->prepare(
        "SELECT book_key AS id, book_slug AS bookSlug, title, author_or_category AS authorOrCategory,
                cover_image AS coverImage, status, progress_pct AS progressPct, reading_exp AS readingExp,
                personal_goal AS personalGoal, added_at AS addedAt, last_read_at AS lastReadAt
         FROM user_bookshelf WHERE user_id = :u ORDER BY COALESCE(last_read_at, added_at) DESC"
    );
    $bStmt->execute([':u' => $userId]);
    $books = $bStmt->fetchAll();

    $nStmt = $pdo->prepare(
        "SELECT CONCAT('note_', id) AS id, book_key AS bookId, book_title AS bookTitle,
                tag, note, page_or_chapter AS pageOrChapter, created_at AS createdAt
         FROM user_bookshelf_notes WHERE user_id = :u ORDER BY created_at DESC LIMIT 200"
    );
    $nStmt->execute([':u' => $userId]);
    $notes = $nStmt->fetchAll();

    vneJsonSuccess(['books' => $books, 'notes' => $notes]);
}

if ($method === 'POST') {
    $body = vneReadJsonBody();
    $action = (string)($body['action'] ?? '');

    if ($action === 'sync_book' && isset($body['book']) && is_array($body['book'])) {
        $b = $body['book'];
        $bookKey = vneSanitizePlainText((string)($b['id'] ?? ''), 190);
        $title = vneSanitizePlainText((string)($b['title'] ?? ''), 255);
        if ($bookKey === '' || $title === '') {
            vneJsonError('Thiếu thông tin sách.', 400, 'INVALID_BOOK');
        }
        $status = in_array($b['status'] ?? '', ['want_to_read', 'reading', 'completed'], true)
            ? (string)$b['status']
            : 'reading';
        $progress = max(0, min(100, (int)($b['progressPct'] ?? 0)));
        $exp = max(0, min(100000, (int)($b['readingExp'] ?? 10)));

        $stmt = $pdo->prepare("
            INSERT INTO user_bookshelf (user_id, book_key, book_slug, title, author_or_category, cover_image, status, progress_pct, reading_exp, personal_goal, last_read_at)
            VALUES (:u, :bk, :slug, :t, :ac, :cov, :st, :pr, :exp, :goal, NOW())
            ON DUPLICATE KEY UPDATE
                title = VALUES(title),
                status = VALUES(status),
                progress_pct = VALUES(progress_pct),
                reading_exp = GREATEST(reading_exp, VALUES(reading_exp)),
                personal_goal = VALUES(personal_goal),
                last_read_at = NOW()
        ");
        $stmt->execute([
            ':u'    => $userId,
            ':bk'   => $bookKey,
            ':slug' => vneSanitizePlainText((string)($b['bookSlug'] ?? ''), 190) ?: null,
            ':t'    => $title,
            ':ac'   => vneSanitizePlainText((string)($b['authorOrCategory'] ?? ''), 160),
            ':cov'  => vneSanitizePlainText((string)($b['coverImage'] ?? ''), 512) ?: null,
            ':st'   => $status,
            ':pr'   => $progress,
            ':exp'  => $exp,
            ':goal' => vneSanitizePlainText((string)($b['personalGoal'] ?? ''), 255) ?: null,
        ]);
        vneJsonSuccess(['synced' => true]);
    }

    if ($action === 'delete_book') {
        $bookKey = vneSanitizePlainText((string)($body['book_id'] ?? ''), 190);
        if ($bookKey !== '') {
            $pdo->prepare("DELETE FROM user_bookshelf WHERE user_id = :u AND book_key = :bk")
                ->execute([':u' => $userId, ':bk' => $bookKey]);
        }
        vneJsonSuccess(['deleted' => true]);
    }

    if ($action === 'add_note' && isset($body['note']) && is_array($body['note'])) {
        $n = $body['note'];
        $text = vneSanitizePlainText((string)($n['note'] ?? ''), 2000);
        if ($text === '') {
            vneJsonError('Nội dung ghi chú không được trống.', 400, 'INVALID_NOTE');
        }
        $tag = in_array($n['tag'] ?? '', ['quote', 'insight', 'summary', 'question'], true)
            ? (string)$n['tag']
            : 'insight';
        $stmt = $pdo->prepare("
            INSERT INTO user_bookshelf_notes (user_id, book_key, book_title, tag, note, page_or_chapter)
            VALUES (:u, :bk, :bt, :tag, :note, :pc)
        ");
        $stmt->execute([
            ':u'    => $userId,
            ':bk'   => vneSanitizePlainText((string)($n['bookId'] ?? 'general'), 190),
            ':bt'   => vneSanitizePlainText((string)($n['bookTitle'] ?? 'Ghi chú đọc sách'), 255),
            ':tag'  => $tag,
            ':note' => $text,
            ':pc'   => vneSanitizePlainText((string)($n['pageOrChapter'] ?? ''), 120) ?: null,
        ]);
        vneJsonSuccess(['saved' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    vneJsonError('Hành động không được hỗ trợ.', 400, 'INVALID_ACTION');
}

vneJsonError('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
