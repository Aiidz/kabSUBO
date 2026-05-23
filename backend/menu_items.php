<?php

declare(strict_types=1);

require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/places.php';

$db = get_db();
$method = get_method();
$placeId = get_param('place_id');
$itemName = get_param('name');

match ($method) {
    'GET' => list_menu_items($db, $placeId),
    'POST' => create_menu_item($db),
    'PUT' => update_menu_item($db, $placeId, $itemName),
    'DELETE' => delete_menu_item($db, $placeId, $itemName),
    default => error_response('Method not allowed', 405),
};

function list_menu_items(PDO $db, ?string $placeId): void
{
    if (!$placeId) {
        error_response('place_id is required', 400);
    }

    json_response(get_menu_items_for_place($db, $placeId));
}

function create_menu_item(PDO $db): void
{
    require_admin($db);
    $body = get_json_body();
    $placeId = $body['place_id'] ?? $body['placeId'] ?? null;

    if (!$placeId) {
        error_response('place_id is required', 400);
    }

    $stmt = $db->prepare(
        'INSERT INTO menu_items (place_id, name, category, price, prep_note, is_best_seller, tags_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $placeId,
        trim((string) ($body['name'] ?? '')),
        trim((string) ($body['category'] ?? '')),
        (float) ($body['price'] ?? 0),
        trim((string) ($body['prepNote'] ?? '')),
        !empty($body['isBestSeller']) ? 1 : 0,
        encode_json($body['tags'] ?? []),
    ]);

    json_response($body, 201);
}

function update_menu_item(PDO $db, ?string $placeId, ?string $itemName): void
{
    require_admin($db);

    if (!$placeId || !$itemName) {
        error_response('place_id and name are required', 400);
    }

    $body = get_json_body();
    $fields = [];
    $params = [];
    $map = [
        'name' => 'name',
        'category' => 'category',
        'price' => 'price',
        'prepNote' => 'prep_note',
        'isBestSeller' => 'is_best_seller',
    ];

    foreach ($map as $input => $column) {
        if (array_key_exists($input, $body)) {
            $fields[] = "{$column} = ?";
            $params[] = $input === 'isBestSeller'
                ? (!empty($body[$input]) ? 1 : 0)
                : $body[$input];
        }
    }

    if (array_key_exists('tags', $body)) {
        $fields[] = 'tags_json = ?';
        $params[] = encode_json($body['tags']);
    }

    if (!$fields) {
        error_response('No fields to update', 400);
    }

    array_push($params, $placeId, $itemName);
    $stmt = $db->prepare(
        'UPDATE menu_items SET ' . implode(', ', $fields) . ' WHERE place_id = ? AND name = ?'
    );
    $stmt->execute($params);

    json_response(['ok' => true]);
}

function delete_menu_item(PDO $db, ?string $placeId, ?string $itemName): void
{
    require_admin($db);

    if (!$placeId || !$itemName) {
        error_response('place_id and name are required', 400);
    }

    $stmt = $db->prepare('DELETE FROM menu_items WHERE place_id = ? AND name = ?');
    $stmt->execute([$placeId, $itemName]);

    json_response(['ok' => true]);
}
