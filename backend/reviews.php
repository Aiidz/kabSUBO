<?php

declare(strict_types=1);

require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/helpers.php';

$method  = get_method();
$placeId = get_param('place_id');
$author  = get_param('author');
$db      = get_db();

match ($method) {
    'GET'    => list_reviews($db, $placeId),
    'POST'   => create_review($db),
    'PUT'    => update_review($db, $placeId, $author),
    'DELETE' => delete_review($db, $placeId, $author),
    default  => error_response('Method not allowed', 405),
};

function list_reviews(PDO $db, ?string $placeId): void
{
    if (!$placeId) {
        error_response('place_id is required', 400);
    }

    $stmt = $db->prepare(
        "SELECT r.*, p.display_name
         FROM reviews r
         JOIN profiles p ON p.id = r.user_id
         WHERE r.place_id = ?
         ORDER BY r.created_at DESC
         LIMIT 5"
    );
    $stmt->execute([$placeId]);
    $rows = $stmt->fetchAll();

    json_response(array_map('format_review', $rows));
}

function create_review(PDO $db): void
{
    $body = get_json_body();
    $placeId = $body['placeId'] ?? null;
    $author  = $body['author'] ?? null;

    if (!$placeId || !$author) {
        error_response('placeId and author are required', 400);
    }

    $rating = (int) ($body['rating'] ?? 0);
    if ($rating < 1 || $rating > 5) {
        error_response('rating must be between 1 and 5', 422);
    }

    $userId = resolve_user($db, $author);

    $stmt = $db->prepare(
        "INSERT INTO reviews (id, place_id, user_id, rating, body)
         VALUES (UUID(), ?, ?, ?, ?)"
    );
    $stmt->execute([$placeId, $userId, $rating, $body['body'] ?? null]);

    $stmt = $db->prepare(
        "SELECT r.*, p.display_name
         FROM reviews r
         JOIN profiles p ON p.id = r.user_id
         WHERE r.place_id = ? AND r.user_id = ?
         ORDER BY r.created_at DESC
         LIMIT 1"
    );
    $stmt->execute([$placeId, $userId]);
    $review = $stmt->fetch();

    json_response(format_review($review));
}

function update_review(PDO $db, ?string $placeId, ?string $author): void
{
    if (!$placeId || !$author) {
        error_response('place_id and author are required', 400);
    }

    $body = get_json_body();
    $userId = resolve_user($db, $author);

    $fields = [];
    $params = [];

    if (array_key_exists('rating', $body)) {
        $rating = (int) $body['rating'];
        if ($rating < 1 || $rating > 5) {
            error_response('rating must be between 1 and 5', 422);
        }
        $fields[] = 'rating = ?';
        $params[] = $rating;
    }

    if (array_key_exists('body', $body)) {
        $fields[] = 'body = ?';
        $params[] = $body['body'];
    }

    if (empty($fields)) {
        error_response('No fields to update', 400);
    }

    $params[] = $placeId;
    $params[] = $userId;

    $stmt = $db->prepare(
        "UPDATE reviews SET " . implode(', ', $fields) . " WHERE place_id = ? AND user_id = ?"
    );
    $stmt->execute($params);

    if ($stmt->rowCount() === 0) {
        error_response('Review not found', 404);
    }

    $stmt = $db->prepare(
        "SELECT r.*, p.display_name
         FROM reviews r
         JOIN profiles p ON p.id = r.user_id
         WHERE r.place_id = ? AND r.user_id = ?"
    );
    $stmt->execute([$placeId, $userId]);
    $review = $stmt->fetch();

    json_response(format_review($review));
}

function delete_review(PDO $db, ?string $placeId, ?string $author): void
{
    if (!$placeId || !$author) {
        error_response('place_id and author are required', 400);
    }

    $userId = resolve_user($db, $author);

    $stmt = $db->prepare("DELETE FROM reviews WHERE place_id = ? AND user_id = ?");
    $stmt->execute([$placeId, $userId]);

    json_response(['ok' => true]);
}

function resolve_user(PDO $db, string $displayName): string
{
    $stmt = $db->prepare("SELECT id FROM profiles WHERE display_name = ?");
    $stmt->execute([$displayName]);
    $user = $stmt->fetch();

    if ($user) {
        return $user['id'];
    }

    $id = sprintf(
        'user-%s',
        strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $displayName))
    );

    $stmt = $db->prepare(
        "INSERT IGNORE INTO profiles (id, display_name) VALUES (?, ?)"
    );
    $stmt->execute([$id, $displayName]);

    return $id;
}

function format_review(array $row): array
{
    return [
        'author' => $row['display_name'],
        'rating' => (int) $row['rating'],
        'body'   => $row['body'] ?? '',
        'date'   => date('F Y', strtotime($row['created_at'])),
    ];
}
