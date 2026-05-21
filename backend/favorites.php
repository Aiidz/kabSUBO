<?php

declare(strict_types=1);

require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/places.php';

$db      = get_db();
$method  = get_method();
$userId  = require_auth($db);
$placeId = get_param('place_id');

match ($method) {
    'GET'    => list_favorites($db, $userId),
    'POST'   => add_favorite($db, $userId),
    'DELETE' => remove_favorite($db, $userId, $placeId),
    default  => error_response('Method not allowed', 405),
};

function list_favorites(PDO $db, string $userId): void
{
    $stmt = $db->prepare(
        "SELECT p.* FROM places p
         JOIN favorites f ON f.place_id = p.id
         WHERE f.user_id = ?
         ORDER BY f.created_at DESC"
    );
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();

    $placeIds = array_column($rows, 'id');
    $batchData = prefetch_place_data($db, $placeIds);

    json_response(array_map(fn($p) => format_place($p, $batchData), $rows));
}

function add_favorite(PDO $db, string $userId): void
{
    $body   = get_json_body();
    $placeId = $body['placeId'] ?? null;

    if (!$placeId) {
        error_response('placeId is required', 400);
    }

    $stmt = $db->prepare(
        "INSERT IGNORE INTO favorites (user_id, place_id) VALUES (?, ?)"
    );
    $stmt->execute([$userId, $placeId]);

    json_response([
        'userId'  => $userId,
        'placeId' => $placeId,
    ]);
}

function remove_favorite(PDO $db, string $userId, ?string $placeId): void
{
    if (!$placeId) {
        error_response('place_id is required', 400);
    }

    $stmt = $db->prepare(
        "DELETE FROM favorites WHERE user_id = ? AND place_id = ?"
    );
    $stmt->execute([$userId, $placeId]);

    json_response(['ok' => true]);
}
