<?php

declare(strict_types=1);

require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/places.php';

$db = get_db();
$method = get_method();
$userId = get_param('user_id');
$placeId = get_param('place_id');

match ($method) {
    'GET' => list_favorites($db, $userId),
    'POST' => add_favorite($db),
    'DELETE' => remove_favorite($db, $userId, $placeId),
    default => error_response('Method not allowed', 405),
};

function list_favorites(PDO $db, ?string $userId): void
{
    $user = require_auth($db);
    $targetUserId = $userId ?: $user['id'];
    require_owner_or_admin($user, $targetUserId);

    $stmt = $db->prepare(
        'SELECT p.* FROM places p
         JOIN favorites f ON f.place_id = p.id
         WHERE f.user_id = ?
         ORDER BY f.created_at DESC'
    );
    $stmt->execute([$targetUserId]);

    json_response(array_map(fn(array $place) => format_place($db, $place), $stmt->fetchAll()));
}

function add_favorite(PDO $db): void
{
    $user = require_auth($db);
    $body = get_json_body();
    $targetUserId = $body['userId'] ?? $user['id'];
    $placeId = $body['placeId'] ?? null;

    if (!$placeId) {
        error_response('placeId is required', 400);
    }

    require_owner_or_admin($user, $targetUserId);

    $stmt = $db->prepare('INSERT IGNORE INTO favorites (user_id, place_id) VALUES (?, ?)');
    $stmt->execute([$targetUserId, $placeId]);

    json_response([
        'userId' => $targetUserId,
        'placeId' => $placeId,
    ], 201);
}

function remove_favorite(PDO $db, ?string $userId, ?string $placeId): void
{
    $user = require_auth($db);
    $targetUserId = $userId ?: $user['id'];

    if (!$placeId) {
        error_response('place_id is required', 400);
    }

    require_owner_or_admin($user, $targetUserId);

    $stmt = $db->prepare('DELETE FROM favorites WHERE user_id = ? AND place_id = ?');
    $stmt->execute([$targetUserId, $placeId]);

    json_response(['ok' => true]);
}
