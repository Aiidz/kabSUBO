<?php

declare(strict_types=1);

require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/helpers.php';

$method = get_method();
$id     = get_param('id');
$status = get_param('status');
$db     = get_db();

match ($method) {
    'GET'    => list_submissions($db, $status),
    'POST'   => create_submission($db),
    'PUT'    => update_submission($db, $id),
    'DELETE' => delete_submission($db, $id),
    default  => error_response('Method not allowed', 405),
};

function list_submissions(PDO $db, ?string $status): void
{
    if ($status) {
        $stmt = $db->prepare(
            "SELECT * FROM submissions_audit WHERE action = ? ORDER BY created_at DESC"
        );
        $stmt->execute([$status]);
    } else {
        $stmt = $db->query(
            "SELECT * FROM submissions_audit ORDER BY created_at DESC"
        );
    }

    $rows = $stmt->fetchAll();

    json_response(array_map('format_submission', $rows));
}

function create_submission(PDO $db): void
{
    $body = get_json_body();

    // Create the place first
    $placeId = create_place_from_body($db, $body);

    // Create audit record
    $submittedBy = $body['submittedBy'] ?? null;
    $auditId = generate_uuid_v4();

    $stmt = $db->prepare(
        "INSERT INTO submissions_audit (id, place_id, actor_id, action, notes)
         VALUES (?, ?, ?, 'submitted', 'Pending review')"
    );
    $stmt->execute([$auditId, $placeId, $submittedBy]);

    json_response([
        'id'          => $auditId,
        'placeId'     => $placeId,
        'status'      => 'pending',
        'submittedBy' => $submittedBy ?? '',
    ]);
}

function update_submission(PDO $db, ?string $id): void
{
    if (!$id) {
        error_response('id is required', 400);
    }

    $body    = get_json_body();
    $action  = $body['status'] ?? null;
    $notes   = $body['notes'] ?? null;
    $fields  = [];
    $params  = [];

    if ($action) {
        $fields[] = 'action = ?';
        $params[] = $action;
    }

    if ($notes !== null) {
        $fields[] = 'notes = ?';
        $params[] = $notes;
    }

    if (empty($fields)) {
        error_response('No fields to update', 400);
    }

    $params[] = $id;

    $stmt = $db->prepare(
        "UPDATE submissions_audit SET " . implode(', ', $fields) . " WHERE id = ?"
    );
    $stmt->execute($params);

    // If approved or rejected, sync the place status
    if ($action === 'approved' || $action === 'rejected') {
        $placeId = $db->prepare("SELECT place_id FROM submissions_audit WHERE id = ?");
        $placeId->execute([$id]);
        $pid = $placeId->fetchColumn();

        if ($pid) {
            $placeStatus = $action === 'approved' ? 'approved' : 'rejected';
            $db->prepare("UPDATE places SET status = ? WHERE id = ?")
               ->execute([$placeStatus, $pid]);
        }
    }

    $stmt = $db->prepare("SELECT * FROM submissions_audit WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();

    if (!$row) {
        error_response('Submission not found', 404);
    }

    // Also fetch the associated place status
    $placeStmt = $db->prepare("SELECT status FROM places WHERE id = ?");
    $placeStmt->execute([$row['place_id']]);
    $placeStatus = $placeStmt->fetchColumn();

    json_response([
        'id'          => $row['id'],
        'placeId'     => $row['place_id'],
        'status'      => $placeStatus ?: $row['action'],
        'submittedBy' => $row['actor_id'] ?? '',
        'notes'       => $row['notes'] ?? '',
    ]);
}

function delete_submission(PDO $db, ?string $id): void
{
    if (!$id) {
        error_response('id is required', 400);
    }

    $stmt = $db->prepare("DELETE FROM submissions_audit WHERE id = ?");
    $stmt->execute([$id]);

    json_response(['ok' => true]);
}

function create_place_from_body(PDO $db, array $body): string
{
    $id = generate_uuid_v4();

    $stmt = $db->prepare(
        "INSERT INTO places (id, name, type, description, lat, lng, address, hours_json, price_range, contact, submitted_by, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')"
    );

    $stmt->execute([
        $id,
        $body['name'] ?? null,
        $body['type'] ?? null,
        $body['description'] ?? null,
        $body['lat'] ?? $body['coordinates'][1] ?? null,
        $body['lng'] ?? $body['coordinates'][0] ?? null,
        $body['address'] ?? null,
        $body['hours'] ?? null,
        $body['priceRange'] ?? null,
        $body['contact'] ?? null,
        $body['submittedBy'] ?? null,
    ]);

    return $id;
}

function format_submission(array $row): array
{
    return [
        'id'      => $row['id'],
        'placeId' => $row['place_id'],
        'status'  => $row['action'],
        'submittedBy' => $row['actor_id'] ?? '',
        'notes'   => $row['notes'] ?? '',
    ];
}

function generate_uuid_v4(): string
{
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}
