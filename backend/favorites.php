<?php

declare(strict_types=1);

require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/places.php';

$method  = get_method();
$userId  = get_param('user_id');
$placeId = get_param('place_id');
$db      = get_db();

match ($method) {
    'GET'    => list_favorites($db, $userId),
    'POST'   => add_favorite($db),
    'DELETE' => remove_favorite($db, $userId, $placeId),
    default  => error_response('Method not allowed', 405),
};

function list_favorites(PDO $db, ?string $userId): void
{
    if (!$userId) {
        error_response('user_id is required', 400);
    }

    $stmt = $db->prepare(
        "SELECT p.* FROM places p
         JOIN favorites f ON f.place_id = p.id
         WHERE f.user_id = ?
         ORDER BY f.created_at DESC"
    );
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();

    json_response(array_map('format_place', $rows));
}

function add_favorite(PDO $db): void
{
    $body   = get_json_body();
    $userId = $body['userId'] ?? null;
    $placeId = $body['placeId'] ?? null;

    if (!$userId || !$placeId) {
        error_response('userId and placeId are required', 400);
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

function remove_favorite(PDO $db, ?string $userId, ?string $placeId): void
{
    if (!$userId || !$placeId) {
        error_response('user_id and place_id are required', 400);
    }

    $stmt = $db->prepare(
        "DELETE FROM favorites WHERE user_id = ? AND place_id = ?"
    );
    $stmt->execute([$userId, $placeId]);

    json_response(['ok' => true]);
}
