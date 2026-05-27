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
    $userId = require_auth($db);

    $stmt = $db->prepare("SELECT role FROM user_roles WHERE user_id = ?");
    $stmt->execute([$userId]);
    $role = $stmt->fetchColumn() ?: 'user';
    $isAdmin = in_array($role, ['admin', 'moderator'], true);

    $sql = "SELECT sa.*, p.display_name AS actor_name, pl.name AS place_name
            FROM submissions_audit sa
            LEFT JOIN profiles p ON p.id = sa.actor_id
            JOIN places pl ON pl.id = sa.place_id";
    $where = [];
    $params = [];

    if ($status) {
        $where[] = "sa.action = ?";
        $params[] = $status;
    }

    if (!$isAdmin) {
        $where[] = "pl.submitted_by = ?";
        $params[] = $userId;
    }

    if ($where) {
        $sql .= " WHERE " . implode(' AND ', $where);
    }

    $sql .= " ORDER BY sa.created_at DESC";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    json_response(array_map('format_submission', $rows));
}

function create_submission(PDO $db): void
{
    $userId = require_auth($db);
    $body = get_json_body();

    $placeId = generate_uuid_v4();
    $auditId = generate_uuid_v4();

    // Fallback image URL matching
    $photoUrls = null;
    if (isset($body['photoUrls'])) {
        $photoUrls = json_encode($body['photoUrls']);
    } elseif (isset($body['bestSeller']['imageUrl'])) {
        $photoUrls = json_encode([$body['bestSeller']['imageUrl']]);
    }

    $stmt = $db->prepare("SELECT display_name FROM profiles WHERE id = ?");
    $stmt->execute([$userId]);
    $submittedByName = $stmt->fetchColumn() ?: $userId;

    $stmt = $db->prepare(
        "CALL submit_place_with_audit(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $placeId,
        $auditId,
        $body['name'] ?? null,
        $body['type'] ?? null,
        $body['lat'] ?? $body['coordinates'][1] ?? null,
        $body['lng'] ?? $body['coordinates'][0] ?? null,
        $body['address'] ?? null,
        $userId,
        $body['description'] ?? null,
        isset($body['hours']) ? json_encode($body['hours']) : null,
        $body['priceRange'] ?? null,
        $photoUrls,
        $body['contact'] ?? null
    ]);

    // Insert menu items
    $menuItems = $body['menuItems'] ?? [];
    if (!empty($menuItems)) {
        $stmt = $db->prepare(
            "INSERT INTO menu_items (id, place_id, name, category, description, price, is_best_seller, tags) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        foreach ($menuItems as $item) {
            $stmt->execute([
                generate_uuid_v4(),
                $placeId,
                $item['name'] ?? '',
                $item['category'] ?? '',
                $item['prepNote'] ?? '',
                $item['price'] ?? 0,
                ($item['isBestSeller'] ?? false) ? 1 : 0,
                isset($item['tags']) ? json_encode($item['tags']) : '[]'
            ]);
        }
    }

    json_response([
        'id'          => $auditId,
        'placeId'     => $placeId,
        'placeName'   => $body['name'] ?? $placeId,
        'status'      => 'pending',
        'submittedBy' => $submittedByName,
    ]);
}

function update_submission(PDO $db, ?string $id): void
{
    $userId = require_auth($db);
    require_role($db, $userId, ['admin', 'moderator']);

    if (!$id) {
        error_response('id is required', 400);
    }

    $body    = get_json_body();
    $action  = $body['status'] ?? null;
    $notes   = $body['notes'] ?? null;
    $fields  = [];
    $params  = [];

    $fields[] = 'actor_id = ?';
    $params[] = $userId;

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

    $stmt = $db->prepare(
        "SELECT sa.*, p.display_name AS actor_name
         FROM submissions_audit sa
         LEFT JOIN profiles p ON p.id = sa.actor_id
         WHERE sa.id = ?"
    );
    $stmt->execute([$id]);
    $row = $stmt->fetch();

    if (!$row) {
        error_response('Submission not found', 404);
    }

    // Also fetch the associated place status
    $placeStmt = $db->prepare("SELECT status FROM places WHERE id = ?");
    $placeStmt->execute([$row['place_id']]);
    $placeStatus = $placeStmt->fetchColumn();
    $placeNameStmt = $db->prepare("SELECT name FROM places WHERE id = ?");
    $placeNameStmt->execute([$row['place_id']]);
    $placeName = $placeNameStmt->fetchColumn();

    json_response([
        'id'          => $row['id'],
        'placeId'     => $row['place_id'],
        'placeName'   => $placeName ?? $row['place_id'],
        'status'      => $placeStatus ?: $row['action'],
        'submittedBy' => $row['actor_name'] ?? $row['actor_id'] ?? '',
        'notes'       => $row['notes'] ?? '',
    ]);
}

function delete_submission(PDO $db, ?string $id): void
{
    $userId = require_auth($db);
    require_role($db, $userId, ['admin', 'moderator']);

    if (!$id) {
        error_response('id is required', 400);
    }

    $stmt = $db->prepare("DELETE FROM submissions_audit WHERE id = ?");
    $stmt->execute([$id]);

    json_response(['ok' => true]);
}

// create_place_from_body removed in favor of stored procedure submit_place_with_audit

function format_submission(array $row): array
{
    return [
        'id'      => $row['id'],
        'placeId' => $row['place_id'],
        'placeName' => $row['place_name'] ?? $row['place_id'],
        'status'  => $row['action'],
        'submittedBy' => $row['actor_name'] ?? $row['actor_id'] ?? '',
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
