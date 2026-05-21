<?php

declare(strict_types=1);

require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/helpers.php';

$method = get_method();
$id     = get_param('id');
$db     = get_db();

if (basename($_SERVER['SCRIPT_FILENAME']) === 'places.php') {
    match ($method) {
    'GET'    => $id ? get_place($db, $id) : list_places($db),
    'POST'   => create_place($db),
    'PUT'    => update_place($db, $id),
    'DELETE' => delete_place($db, $id),
    default  => error_response('Method not allowed', 405),
};
}

// ----------------------------------------------------------------

function list_places(PDO $db): void
{
    $status   = get_param('status');
    $query    = get_param('query');
    $wheres   = [];
    $params   = [];

    if ($status) {
        $wheres[] = 'status = ?';
        $params[] = $status;
    }

    if ($query) {
        $wheres[] = '(name LIKE ? OR description LIKE ? OR type LIKE ?)';
        $like     = '%' . $query . '%';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    $sql = 'SELECT * FROM places';
    if ($wheres) {
        $sql .= ' WHERE ' . implode(' AND ', $wheres);
    }
    $sql .= ' ORDER BY created_at DESC';

    $stmt  = $db->prepare($sql);
    $stmt->execute($params);
    $places = $stmt->fetchAll();

    $placeIds = array_column($places, 'id');
    $batchData = prefetch_place_data($db, $placeIds);

    json_response(array_map(fn($p) => format_place($p, $batchData), $places));
}

function get_place(PDO $db, string $id): void
{
    $stmt = $db->prepare("SELECT * FROM places WHERE id = ?");
    $stmt->execute([$id]);
    $place = $stmt->fetch();

    if (!$place) {
        error_response('Place not found', 404);
    }

    json_response(format_place($place));
}

function create_place(PDO $db): void
{
    $userId = require_auth($db);
    $body = get_json_body();
    $id = generate_uuid_v4();

    $photoUrls = null;
    if (isset($body['photoUrls'])) {
        $photoUrls = json_encode($body['photoUrls']);
    } elseif (isset($body['bestSeller']['imageUrl'])) {
        $photoUrls = json_encode([$body['bestSeller']['imageUrl']]);
    }

    $stmt = $db->prepare(
        "INSERT INTO places (id, name, type, description, lat, lng, address, hours_json, price_range, photo_urls, contact, submitted_by, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')"
    );

    $stmt->execute([
        $id,
        $body['name'] ?? null,
        $body['type'] ?? null,
        $body['description'] ?? null,
        $body['lat'] ?? $body['coordinates'][1] ?? null,
        $body['lng'] ?? $body['coordinates'][0] ?? null,
        $body['address'] ?? null,
        isset($body['hours']) ? json_encode($body['hours']) : null,
        $body['priceRange'] ?? null,
        $photoUrls,
        $body['contact'] ?? null,
        $userId,
    ]);

    if ($stmt->rowCount() === 0) {
        error_response('Failed to create place', 500);
    }

    get_place($db, $id);
}

function generate_uuid_v4(): string
{
    $data = random_bytes(16);
    // Set version 4 (0100 in binary)
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    // Set variant (10xx in binary)
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function update_place(PDO $db, ?string $id): void
{
    require_auth($db);
    if (!$id) {
        error_response('id is required', 400);
    }

    $body = get_json_body();
    $fields = [];
    $params = [];

    foreach ([
        'name'        => 'name',
        'type'        => 'type',
        'description' => 'description',
        'address'     => 'address',
        'hours_json'  => 'hours',
        'price_range' => 'priceRange',
        'contact'     => 'contact',
        'status'      => 'status',
    ] as $col => $key) {
        if (array_key_exists($key, $body)) {
            $fields[] = "$col = ?";
            $params[] = ($col === 'hours_json')
                ? json_encode($body[$key])
                : $body[$key];
        }
    }

    if (isset($body['coordinates'])) {
        $fields[] = 'lat = ?';
        $fields[] = 'lng = ?';
        $params[] = $body['coordinates'][1];
        $params[] = $body['coordinates'][0];
    } else {
        if (array_key_exists('lat', $body)) {
            $fields[] = 'lat = ?';
            $params[] = $body['lat'];
        }
        if (array_key_exists('lng', $body)) {
            $fields[] = 'lng = ?';
            $params[] = $body['lng'];
        }
    }

    $photoUrls = null;
    if (isset($body['photoUrls'])) {
        $photoUrls = $body['photoUrls'];
    } elseif (isset($body['bestSeller']['imageUrl'])) {
        $photoUrls = [$body['bestSeller']['imageUrl']];
    }

    if ($photoUrls !== null) {
        $fields[] = 'photo_urls = ?';
        $params[] = json_encode($photoUrls);
    }

    if (empty($fields)) {
        error_response('No fields to update', 400);
    }

    $params[] = $id;
    $db->prepare(
        "UPDATE places SET " . implode(', ', $fields) . " WHERE id = ?"
    )->execute($params);

    get_place($db, $id);
}

function delete_place(PDO $db, ?string $id): void
{
    require_auth($db);
    if (!$id) {
        error_response('id is required', 400);
    }

    $stmt = $db->prepare("DELETE FROM places WHERE id = ?");
    $stmt->execute([$id]);

    json_response(['ok' => true]);
}

// ----------------------------------------------------------------
// Format helpers

function format_place(array $place, ?array $batchData = null): array
{
    $placeId = $place['id'];

    if ($batchData !== null) {
        $avg_rating  = $batchData['avg_ratings'][$placeId] ?? 0.0;
        $review_cnt  = $batchData['review_counts'][$placeId] ?? 0;
        $menu_items  = $batchData['menu_items'][$placeId] ?? [];
        $reviews     = $batchData['recent_reviews'][$placeId] ?? [];
    } else {
        $avg_rating  = get_avg_rating($placeId);
        $review_cnt  = get_review_count($placeId);
        $menu_items  = get_menu_items($placeId);
        $reviews     = get_recent_reviews($placeId);
    }
    $best_seller = get_best_seller($menu_items, $place['photo_urls'] ?? null);

    return [
        'id'             => $place['id'],
        'name'           => $place['name'],
        'type'           => $place['type'],
        'description'    => $place['description'] ?? '',
        'coordinates'    => [(float) $place['lng'], (float) $place['lat']],
        'address'        => $place['address'] ?? '',
        'priceRange'     => $place['price_range'] ?? '',
        'rating'         => (float) $avg_rating,
        'reviews'        => (int) $review_cnt,
        'walkTime'       => estimate_walk_time($place['lat'], $place['lng']),
        'hours'          => decode_json_string($place['hours_json'] ?? ''),
        'tags'           => extract_tags($menu_items),
        'menuHighlights' => array_slice(array_map(fn($m) => $m['name'], $menu_items), 0, 3),
        'menuItems'      => $menu_items,
        'bestSeller'     => $best_seller,
        'contact'        => $place['contact'] ?? '',
        'submittedBy'    => $place['submitted_by'] ?? '',
        'recentReviews'  => $reviews,
        'status'         => $place['status'] ?? 'pending',
    ];
}

function prefetch_place_data(PDO $db, array $placeIds): array
{
    if (empty($placeIds)) {
        return [
            'avg_ratings' => [],
            'review_counts' => [],
            'menu_items' => [],
            'recent_reviews' => [],
        ];
    }

    $placeholders = implode(',', array_fill(0, count($placeIds), '?'));

    // 1. Fetch avg ratings and review counts from optimized view/database
    $stmt = $db->prepare("SELECT id, avg_rating, review_count FROM place_summary_view WHERE id IN ($placeholders)");
    $stmt->execute($placeIds);
    $summaries = $stmt->fetchAll();

    $avgRatings = [];
    $reviewCounts = [];
    foreach ($summaries as $row) {
        $avgRatings[$row['id']] = (float) $row['avg_rating'];
        $reviewCounts[$row['id']] = (int) $row['review_count'];
    }

    // 2. Fetch menu items in batch
    $stmt = $db->prepare(
        "SELECT * FROM menu_items 
         WHERE place_id IN ($placeholders) 
         ORDER BY is_best_seller DESC, created_at ASC"
    );
    $stmt->execute($placeIds);
    $menuRows = $stmt->fetchAll();

    $menuItems = [];
    foreach ($placeIds as $id) {
        $menuItems[$id] = [];
    }
    foreach ($menuRows as $row) {
        $menuItems[$row['place_id']][] = [
            'name'        => $row['name'],
            'category'    => $row['category'] ?? '',
            'price'       => (float) ($row['price'] ?? 0),
            'prepNote'    => $row['description'] ?? '',
            'isBestSeller' => (bool) $row['is_best_seller'],
            'tags'        => json_decode($row['tags'] ?? '[]', true),
        ];
    }

    // 3. Fetch recent reviews in batch using window function to limit to 5 per place
    $stmt = $db->prepare(
        "SELECT r.*, p.display_name,
                ROW_NUMBER() OVER (PARTITION BY r.place_id ORDER BY r.created_at DESC) as rn
         FROM reviews r
         JOIN profiles p ON p.id = r.user_id
         WHERE r.place_id IN ($placeholders)"
    );
    $stmt->execute($placeIds);
    $reviewRows = $stmt->fetchAll();

    $recentReviews = [];
    foreach ($placeIds as $id) {
        $recentReviews[$id] = [];
    }
    foreach ($reviewRows as $row) {
        if ((int)$row['rn'] <= 5) {
            $recentReviews[$row['place_id']][] = [
                'author' => $row['display_name'],
                'rating' => (int) $row['rating'],
                'body'   => $row['body'] ?? '',
                'date'   => date('F Y', strtotime($row['created_at'])),
            ];
        }
    }

    return [
        'avg_ratings' => $avgRatings,
        'review_counts' => $reviewCounts,
        'menu_items' => $menuItems,
        'recent_reviews' => $recentReviews,
    ];
}

function get_avg_rating(string $place_id): float
{
    $db = get_db();
    $stmt = $db->prepare("SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE place_id = ?");
    $stmt->execute([$place_id]);
    return (float) $stmt->fetchColumn();
}

function get_review_count(string $place_id): int
{
    $db = get_db();
    $stmt = $db->prepare("SELECT COUNT(*) FROM reviews WHERE place_id = ?");
    $stmt->execute([$place_id]);
    return (int) $stmt->fetchColumn();
}

function get_menu_items(string $place_id): array
{
    $db = get_db();
    $stmt = $db->prepare(
        "SELECT * FROM menu_items WHERE place_id = ? ORDER BY is_best_seller DESC, created_at ASC"
    );
    $stmt->execute([$place_id]);
    $rows = $stmt->fetchAll();

    return array_map(function ($row) {
        return [
            'name'        => $row['name'],
            'category'    => $row['category'] ?? '',
            'price'       => (float) ($row['price'] ?? 0),
            'prepNote'    => $row['description'] ?? '',
            'isBestSeller' => (bool) $row['is_best_seller'],
            'tags'        => json_decode($row['tags'] ?? '[]', true),
        ];
    }, $rows);
}

function get_recent_reviews(string $place_id): array
{
    $db = get_db();
    $stmt = $db->prepare(
        "SELECT r.*, p.display_name FROM reviews r
         JOIN profiles p ON p.id = r.user_id
         WHERE r.place_id = ?
         ORDER BY r.created_at DESC
         LIMIT 5"
    );
    $stmt->execute([$place_id]);
    $rows = $stmt->fetchAll();

    return array_map(function ($row) {
        return [
            'author' => $row['display_name'],
            'rating' => (int) $row['rating'],
            'body'   => $row['body'] ?? '',
            'date'   => date('F Y', strtotime($row['created_at'])),
        ];
    }, $rows);
}

function get_best_seller(array $menu_items, ?string $photoUrlsJson = null): array
{
    $imageUrl = '';

    if ($photoUrlsJson) {
        $photos = json_decode($photoUrlsJson, true);
        if (is_array($photos) && !empty($photos)) {
            $imageUrl = is_string($photos[0]) ? $photos[0] : '';
        }
    }

    foreach ($menu_items as $item) {
        if ($item['isBestSeller']) {
            return [
                'name'     => $item['name'],
                'imageUrl' => $imageUrl,
            ];
        }
    }

    return [
        'name'     => $menu_items[0]['name'] ?? '',
        'imageUrl' => $imageUrl,
    ];
}

function extract_tags(array $menu_items): array
{
    $tags = [];

    foreach ($menu_items as $item) {
        foreach ($item['tags'] as $tag) {
            $tags[$tag] = true;
        }
    }

    return array_keys($tags);
}

function estimate_walk_time(?string $lat, ?string $lng): string
{
    if (!$lat || !$lng) {
        return 'N/A';
    }

    // CvSU campus center
    $cx = 120.8807;
    $cy = 14.1959;

    $dx = ((float) $lng - $cx) * 111320 * cos(deg2rad($cy));
    $dy = ((float) $lat - $cy) * 111320;
    $meters = sqrt($dx * $dx + $dy * $dy);

    $minutes = round($meters / 80);  // ~80m/min average walk speed

    if ($minutes <= 0) {
        return '1 min walk';
    }

    return "{$minutes} min walk";
}
