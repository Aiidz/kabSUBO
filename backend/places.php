<?php

declare(strict_types=1);

require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/helpers.php';

if (basename($_SERVER['SCRIPT_FILENAME']) === 'places.php') {
    $db = get_db();
    $method = get_method();
    $id = get_param('id');

    match ($method) {
        'GET' => $id ? get_place($db, $id) : list_places($db),
        'POST' => create_place_endpoint($db),
        'PUT' => update_place_endpoint($db, $id),
        'DELETE' => delete_place_endpoint($db, $id),
        default => error_response('Method not allowed', 405),
    };
}

function list_places(PDO $db): void
{
    $status = get_param('status');
    $query = trim((string) get_param('query', ''));
    $where = [];
    $params = [];

    if ($status) {
        $where[] = 'status = ?';
        $params[] = $status;
    }

    if ($query !== '') {
        $where[] = '(name LIKE ? OR type LIKE ? OR description LIKE ? OR tags_json LIKE ? OR menu_highlights_json LIKE ?)';
        $like = "%{$query}%";
        array_push($params, $like, $like, $like, $like, $like);
    }

    $sql = 'SELECT * FROM places';

    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    $sql .= ' ORDER BY FIELD(status, "pending", "approved", "rejected"), created_at DESC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    json_response(array_map(fn(array $place) => format_place($db, $place), $stmt->fetchAll()));
}

function get_place(PDO $db, string $id): void
{
    $place = find_place($db, $id);

    if (!$place) {
        error_response('Place not found', 404);
    }

    json_response(format_place($db, $place));
}

function create_place_endpoint(PDO $db): void
{
    $user = require_auth($db);
    $place = create_place_from_body($db, get_json_body(), $user);
    json_response(format_place($db, $place), 201);
}

function update_place_endpoint(PDO $db, ?string $id): void
{
    require_admin($db);

    if (!$id) {
        error_response('id is required', 400);
    }

    $place = update_place_from_body($db, $id, get_json_body());
    json_response(format_place($db, $place));
}

function delete_place_endpoint(PDO $db, ?string $id): void
{
    require_admin($db);

    if (!$id) {
        error_response('id is required', 400);
    }

    $stmt = $db->prepare('DELETE FROM places WHERE id = ?');
    $stmt->execute([$id]);

    json_response(['ok' => true]);
}

function find_place(PDO $db, string $id): ?array
{
    $stmt = $db->prepare('SELECT * FROM places WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $place = $stmt->fetch();

    return $place ?: null;
}

function create_place_from_body(PDO $db, array $body, ?array $user = null): array
{
    $id = unique_place_id($db, (string) ($body['name'] ?? 'place'));
    $coordinates = normalize_coordinates($body);
    $submittedBy = trim((string) ($body['submittedBy'] ?? $user['name'] ?? ''));

    $stmt = $db->prepare(
        'INSERT INTO places (
            id, name, type, description, longitude, latitude, address, price_range,
            rating, reviews_count, walk_time, hours, tags_json, menu_highlights_json,
            best_seller_name, best_seller_image_url, contact, submitted_by, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, "pending")'
    );
    $stmt->execute([
        $id,
        trim((string) ($body['name'] ?? '')),
        trim((string) ($body['type'] ?? 'Food place')),
        trim((string) ($body['description'] ?? '')),
        $coordinates[0],
        $coordinates[1],
        trim((string) ($body['address'] ?? '')),
        trim((string) ($body['priceRange'] ?? '')),
        trim((string) ($body['walkTime'] ?? '')),
        trim((string) ($body['hours'] ?? '')),
        encode_json($body['tags'] ?? []),
        encode_json($body['menuHighlights'] ?? []),
        trim((string) ($body['bestSeller']['name'] ?? '')),
        trim((string) ($body['bestSeller']['imageUrl'] ?? '')),
        trim((string) ($body['contact'] ?? '')),
        $submittedBy,
    ]);

    replace_menu_items($db, $id, $body['menuItems'] ?? []);

    return find_place($db, $id);
}

function update_place_from_body(PDO $db, string $id, array $body): array
{
    $place = find_place($db, $id);

    if (!$place) {
        error_response('Place not found', 404);
    }

    $fields = [];
    $params = [];
    $map = [
        'name' => 'name',
        'type' => 'type',
        'description' => 'description',
        'address' => 'address',
        'priceRange' => 'price_range',
        'walkTime' => 'walk_time',
        'hours' => 'hours',
        'contact' => 'contact',
        'submittedBy' => 'submitted_by',
        'status' => 'status',
    ];

    foreach ($map as $inputKey => $column) {
        if (array_key_exists($inputKey, $body)) {
            $fields[] = "{$column} = ?";
            $params[] = trim((string) $body[$inputKey]);
        }
    }

    if (array_key_exists('coordinates', $body)) {
        $coordinates = normalize_coordinates($body);
        $fields[] = 'longitude = ?';
        $fields[] = 'latitude = ?';
        array_push($params, $coordinates[0], $coordinates[1]);
    }

    if (array_key_exists('tags', $body)) {
        $fields[] = 'tags_json = ?';
        $params[] = encode_json($body['tags']);
    }

    if (array_key_exists('menuHighlights', $body)) {
        $fields[] = 'menu_highlights_json = ?';
        $params[] = encode_json($body['menuHighlights']);
    }

    if (array_key_exists('bestSeller', $body)) {
        $fields[] = 'best_seller_name = ?';
        $fields[] = 'best_seller_image_url = ?';
        $params[] = trim((string) ($body['bestSeller']['name'] ?? ''));
        $params[] = trim((string) ($body['bestSeller']['imageUrl'] ?? ''));
    }

    if ($fields) {
        $params[] = $id;
        $stmt = $db->prepare('UPDATE places SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);
    }

    if (array_key_exists('menuItems', $body)) {
        replace_menu_items($db, $id, $body['menuItems']);
    }

    return find_place($db, $id);
}

function replace_menu_items(PDO $db, string $placeId, array $menuItems): void
{
    $db->prepare('DELETE FROM menu_items WHERE place_id = ?')->execute([$placeId]);

    $stmt = $db->prepare(
        'INSERT INTO menu_items (place_id, name, category, price, prep_note, is_best_seller, tags_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    foreach ($menuItems as $item) {
        $stmt->execute([
            $placeId,
            trim((string) ($item['name'] ?? '')),
            trim((string) ($item['category'] ?? '')),
            (float) ($item['price'] ?? 0),
            trim((string) ($item['prepNote'] ?? '')),
            !empty($item['isBestSeller']) ? 1 : 0,
            encode_json($item['tags'] ?? []),
        ]);
    }
}

function normalize_coordinates(array $body): array
{
    if (isset($body['coordinates']) && is_array($body['coordinates'])) {
        return [(float) $body['coordinates'][0], (float) $body['coordinates'][1]];
    }

    return [(float) ($body['longitude'] ?? 0), (float) ($body['latitude'] ?? 0)];
}

function unique_place_id(PDO $db, string $name): string
{
    $base = slugify($name);
    $id = $base;
    $suffix = 2;

    while (find_place($db, $id)) {
        $id = "{$base}-{$suffix}";
        $suffix++;
    }

    return $id;
}

function format_place(PDO $db, array $place): array
{
    $menuItems = get_menu_items_for_place($db, $place['id']);
    $reviews = get_recent_reviews_for_place($db, $place['id']);
    $ratingData = get_rating_data($db, $place);
    $bestSeller = [
        'name' => $place['best_seller_name'] ?: ($menuItems[0]['name'] ?? ''),
        'imageUrl' => $place['best_seller_image_url'] ?: '',
    ];

    return [
        'id' => $place['id'],
        'name' => $place['name'],
        'type' => $place['type'],
        'description' => $place['description'] ?? '',
        'coordinates' => [(float) $place['longitude'], (float) $place['latitude']],
        'address' => $place['address'] ?? '',
        'priceRange' => $place['price_range'] ?? '',
        'rating' => $ratingData['rating'],
        'reviews' => $ratingData['reviews'],
        'walkTime' => $place['walk_time'] ?? '',
        'hours' => $place['hours'] ?? '',
        'tags' => decode_json_list($place['tags_json'] ?? null),
        'menuHighlights' => decode_json_list($place['menu_highlights_json'] ?? null),
        'menuItems' => $menuItems,
        'bestSeller' => $bestSeller,
        'contact' => $place['contact'] ?? '',
        'submittedBy' => $place['submitted_by'] ?? '',
        'recentReviews' => $reviews,
        'status' => $place['status'] ?? 'pending',
    ];
}

function get_menu_items_for_place(PDO $db, string $placeId): array
{
    $stmt = $db->prepare(
        'SELECT * FROM menu_items WHERE place_id = ? ORDER BY is_best_seller DESC, id ASC'
    );
    $stmt->execute([$placeId]);

    return array_map(fn(array $item) => [
        'name' => $item['name'],
        'category' => $item['category'] ?? '',
        'price' => (float) $item['price'],
        'prepNote' => $item['prep_note'] ?? '',
        'isBestSeller' => (bool) $item['is_best_seller'],
        'tags' => decode_json_list($item['tags_json'] ?? null),
    ], $stmt->fetchAll());
}

function get_recent_reviews_for_place(PDO $db, string $placeId): array
{
    $stmt = $db->prepare(
        'SELECT author, rating, body, created_at FROM reviews WHERE place_id = ? ORDER BY created_at DESC LIMIT 5'
    );
    $stmt->execute([$placeId]);

    return array_map(fn(array $review) => [
        'author' => $review['author'],
        'rating' => (int) $review['rating'],
        'body' => $review['body'] ?? '',
        'date' => date('F Y', strtotime($review['created_at'])),
    ], $stmt->fetchAll());
}

function get_rating_data(PDO $db, array $place): array
{
    $stmt = $db->prepare('SELECT COUNT(*) reviews, AVG(rating) rating FROM reviews WHERE place_id = ?');
    $stmt->execute([$place['id']]);
    $row = $stmt->fetch();
    $reviewCount = (int) ($row['reviews'] ?? 0);
    $storedReviewCount = (int) $place['reviews_count'];

    if ($reviewCount === 0 || $storedReviewCount > $reviewCount) {
        return [
            'rating' => (float) $place['rating'],
            'reviews' => $storedReviewCount,
        ];
    }

    return [
        'rating' => round((float) $row['rating'], 1),
        'reviews' => $reviewCount,
    ];
}
