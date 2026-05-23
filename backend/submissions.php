<?php

declare(strict_types=1);

require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/places.php';

$db = get_db();
$method = get_method();
$id = get_param('id');
$status = get_param('status');

match ($method) {
    'GET' => list_submissions($db, $status),
    'POST' => create_submission($db),
    'PUT' => update_submission($db, $id),
    'DELETE' => delete_submission($db, $id),
    default => error_response('Method not allowed', 405),
};

function list_submissions(PDO $db, ?string $status): void
{
    $user = require_auth($db);
    $where = [];
    $params = [];

    if ($status) {
        $where[] = 'status = ?';
        $params[] = $status;
    }

    if ($user['role'] !== 'admin') {
        $where[] = 'owner_user_id = ?';
        $params[] = $user['id'];
    }

    $sql = 'SELECT * FROM submissions';

    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    $sql .= ' ORDER BY created_at DESC';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    json_response(array_map('format_submission', $stmt->fetchAll()));
}

function create_submission(PDO $db): void
{
    $user = require_auth($db);
    $body = get_json_body();
    $place = create_place_from_body($db, $body, $user);
    $submission = create_submission_record($db, $place['id'], $body, $user);

    json_response(format_submission($submission), 201);
}

function update_submission(PDO $db, ?string $id): void
{
    require_admin($db);

    if (!$id) {
        error_response('id is required', 400);
    }

    $body = get_json_body();
    $status = $body['status'] ?? null;

    if (!in_array($status, ['approved', 'pending', 'rejected'], true)) {
        error_response('Valid status is required', 422);
    }

    $stmt = $db->prepare(
        'UPDATE submissions SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    $stmt->execute([
        $status,
        $body['notes'] ?? null,
        $id,
    ]);

    $submission = find_submission($db, $id);

    if (!$submission) {
        error_response('Submission not found', 404);
    }

    $db->prepare('UPDATE places SET status = ? WHERE id = ?')
        ->execute([$status, $submission['place_id']]);

    json_response(format_submission($submission));
}

function delete_submission(PDO $db, ?string $id): void
{
    require_admin($db);

    if (!$id) {
        error_response('id is required', 400);
    }

    $stmt = $db->prepare('DELETE FROM submissions WHERE id = ?');
    $stmt->execute([$id]);

    json_response(['ok' => true]);
}

function create_submission_record(PDO $db, string $placeId, array $body, array $user): array
{
    $submissionId = 'submission-' . $placeId;
    $stmt = $db->prepare(
        'INSERT INTO submissions (id, place_id, status, submitted_by, owner_user_id, notes)
         VALUES (?, ?, "pending", ?, ?, ?)'
    );
    $stmt->execute([
        $submissionId,
        $placeId,
        trim((string) ($body['submittedBy'] ?? $user['name'])),
        $user['id'],
        $body['notes'] ?? null,
    ]);

    return find_submission($db, $submissionId);
}

function find_submission(PDO $db, string $id): ?array
{
    $stmt = $db->prepare('SELECT * FROM submissions WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $submission = $stmt->fetch();

    return $submission ?: null;
}

function format_submission(array $submission): array
{
    return [
        'id' => $submission['id'],
        'placeId' => $submission['place_id'],
        'status' => $submission['status'],
        'submittedBy' => $submission['submitted_by'],
        'ownerUserId' => $submission['owner_user_id'] ?? null,
        'notes' => $submission['notes'] ?? null,
    ];
}
