<?php

declare(strict_types=1);

require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/places.php';

$db = get_db();
$method = get_method();
$placeId = get_param('place_id');
$author = get_param('author');

match ($method) {
    'GET' => list_reviews($db, $placeId),
    'POST' => create_review($db),
    'PUT' => update_review($db, $placeId, $author),
    'DELETE' => delete_review($db, $placeId, $author),
    default => error_response('Method not allowed', 405),
};

function list_reviews(PDO $db, ?string $placeId): void
{
    if (!$placeId) {
        error_response('place_id is required', 400);
    }

    json_response(get_recent_reviews_for_place($db, $placeId));
}

function create_review(PDO $db): void
{
    $user = require_auth($db);
    $body = get_json_body();
    $placeId = $body['placeId'] ?? null;
    $rating = (int) ($body['rating'] ?? 0);

    if (!$placeId || $rating < 1 || $rating > 5) {
        error_response('placeId and a rating from 1 to 5 are required', 422);
    }

    $stmt = $db->prepare(
        'INSERT INTO reviews (place_id, user_id, author, rating, body)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $placeId,
        $user['id'],
        $body['author'] ?? $user['name'],
        $rating,
        trim((string) ($body['body'] ?? '')),
    ]);

    refresh_place_rating($db, $placeId);
    json_response(get_recent_reviews_for_place($db, $placeId)[0] ?? [], 201);
}

function update_review(PDO $db, ?string $placeId, ?string $author): void
{
    $user = require_auth($db);

    if (!$placeId || !$author) {
        error_response('place_id and author are required', 400);
    }

    $review = find_review($db, $placeId, $author);

    if (!$review) {
        error_response('Review not found', 404);
    }

    require_owner_or_admin($user, $review['user_id']);
    $body = get_json_body();
    $fields = [];
    $params = [];

    if (array_key_exists('rating', $body)) {
        $rating = (int) $body['rating'];

        if ($rating < 1 || $rating > 5) {
            error_response('Rating must be from 1 to 5', 422);
        }

        $fields[] = 'rating = ?';
        $params[] = $rating;
    }

    if (array_key_exists('body', $body)) {
        $fields[] = 'body = ?';
        $params[] = trim((string) $body['body']);
    }

    if (!$fields) {
        error_response('No fields to update', 400);
    }

    $params[] = $review['id'];
    $stmt = $db->prepare('UPDATE reviews SET ' . implode(', ', $fields) . ' WHERE id = ?');
    $stmt->execute($params);
    refresh_place_rating($db, $placeId);

    json_response(['ok' => true]);
}

function delete_review(PDO $db, ?string $placeId, ?string $author): void
{
    $user = require_auth($db);

    if (!$placeId || !$author) {
        error_response('place_id and author are required', 400);
    }

    $review = find_review($db, $placeId, $author);

    if (!$review) {
        error_response('Review not found', 404);
    }

    require_owner_or_admin($user, $review['user_id']);
    $db->prepare('DELETE FROM reviews WHERE id = ?')->execute([$review['id']]);
    refresh_place_rating($db, $placeId);

    json_response(['ok' => true]);
}

function find_review(PDO $db, string $placeId, string $author): ?array
{
    $stmt = $db->prepare('SELECT * FROM reviews WHERE place_id = ? AND author = ? ORDER BY created_at DESC LIMIT 1');
    $stmt->execute([$placeId, $author]);
    $review = $stmt->fetch();

    return $review ?: null;
}

function refresh_place_rating(PDO $db, string $placeId): void
{
    $stmt = $db->prepare('SELECT COUNT(*) reviews, COALESCE(AVG(rating), 0) rating FROM reviews WHERE place_id = ?');
    $stmt->execute([$placeId]);
    $row = $stmt->fetch();

    $db->prepare('UPDATE places SET rating = ?, reviews_count = ? WHERE id = ?')
        ->execute([
            round((float) $row['rating'], 1),
            (int) $row['reviews'],
            $placeId,
        ]);
}
