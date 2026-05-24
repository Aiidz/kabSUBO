<?php

declare(strict_types=1);

require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/helpers.php';

$method  = get_method();
$placeId = get_param('place_id');
$name    = get_param('name');
$db      = get_db();

match ($method) {
    'GET'    => list_menu_items($db, $placeId),
    'POST'   => create_menu_item($db),
    'PUT'    => update_menu_item($db, $placeId, $name),
    'DELETE' => delete_menu_item($db, $placeId, $name),
    default  => error_response('Method not allowed', 405),
};

function list_menu_items(PDO $db, ?string $placeId): void
{
    if (!$placeId) {
        error_response('place_id is required', 400);
    }

    $stmt = $db->prepare(
        "SELECT * FROM menu_items WHERE place_id = ? ORDER BY is_best_seller DESC, created_at ASC"
    );
    $stmt->execute([$placeId]);
    $items = $stmt->fetchAll();

    json_response(array_map('format_menu_item', $items));
}

function create_menu_item(PDO $db): void
{
    require_auth($db);
    $body = get_json_body();
    $placeId = $body['place_id'] ?? null;

    if (!$placeId) {
        error_response('place_id is required', 400);
    }

    $stmt = $db->prepare(
        "INSERT INTO menu_items (id, place_id, name, category, description, price, is_best_seller, tags)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)"
    );

    $stmt->execute([
        $placeId,
        $body['name'] ?? null,
        $body['category'] ?? null,
        $body['prepNote'] ?? null,
        $body['price'] ?? null,
        isset($body['isBestSeller']) ? ($body['isBestSeller'] ? 1 : 0) : 0,
        json_encode($body['tags'] ?? [], JSON_UNESCAPED_UNICODE),
    ]);

    $stmt = $db->prepare("SELECT * FROM menu_items WHERE place_id = ? AND name = ? ORDER BY created_at DESC LIMIT 1");
    $stmt->execute([$placeId, $body['name'] ?? '']);
    $item = $stmt->fetch();

    if (!$item) {
        error_response('Failed to create menu item', 500);
    }

    json_response(format_menu_item($item));
}

function update_menu_item(PDO $db, ?string $placeId, ?string $name): void
{
    require_auth($db);
    if (!$placeId || !$name) {
        error_response('place_id and name are required', 400);
    }

    $body = get_json_body();
    $fields = [];
    $params = [];

    foreach ([
        'name'         => 'name',
        'category'     => 'category',
        'description'  => 'prepNote',
        'price'        => 'price',
    ] as $col => $key) {
        if (array_key_exists($key, $body)) {
            $fields[] = "$col = ?";
            $params[] = $body[$key];
        }
    }

    if (array_key_exists('isBestSeller', $body)) {
        $fields[] = 'is_best_seller = ?';
        $params[] = $body['isBestSeller'] ? 1 : 0;
    }

    if (array_key_exists('tags', $body)) {
        $fields[] = 'tags = ?';
        $params[] = json_encode($body['tags'], JSON_UNESCAPED_UNICODE);
    }

    if (empty($fields)) {
        error_response('No fields to update', 400);
    }

    $params[] = $placeId;
    $params[] = $name;

    $db->prepare(
        "UPDATE menu_items SET " . implode(', ', $fields) . " WHERE place_id = ? AND name = ?"
    )->execute($params);

    $stmt = $db->prepare("SELECT * FROM menu_items WHERE place_id = ? AND name = ?");
    $stmt->execute([$placeId, $body['name'] ?? $name]);
    $item = $stmt->fetch();

    if (!$item) {
        error_response('Menu item not found', 404);
    }

    json_response(format_menu_item($item));
}

function delete_menu_item(PDO $db, ?string $placeId, ?string $name): void
{
    require_auth($db);
    if (!$placeId || !$name) {
        error_response('place_id and name are required', 400);
    }

    $stmt = $db->prepare("DELETE FROM menu_items WHERE place_id = ? AND name = ?");
    $stmt->execute([$placeId, $name]);

    json_response(['ok' => true]);
}

function format_menu_item(array $item): array
{
    return [
        'name'         => $item['name'],
        'category'     => $item['category'] ?? '',
        'price'        => (float) ($item['price'] ?? 0),
        'prepNote'     => $item['description'] ?? '',
        'isBestSeller' => (bool) $item['is_best_seller'],
        'tags'         => json_decode($item['tags'] ?? '[]', true),
    ];
}
