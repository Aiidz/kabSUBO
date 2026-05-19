<?php

declare(strict_types=1);

require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/places.php';

$query = get_param('q', '');
$db    = get_db();

if (!$query) {
    json_response([]);
    exit;
}

$places = $db->query(
    "SELECT * FROM places WHERE status = 'approved' ORDER BY created_at DESC"
)->fetchAll();

$terms = get_query_terms($query);
$results = [];

foreach ($places as $place) {
    $menuItems = get_menu_items($place['id']);
    $placeData = format_place($place);
    $match = get_place_match($placeData, $menuItems, $terms);

    if ($match['matchScore'] > 0) {
        $results[] = array_merge($placeData, $match);
    }
}

usort($results, function ($a, $b) {
    return ($b['matchScore'] * 10 + $b['rating']) <=>
           ($a['matchScore'] * 10 + $a['rating']);
});

json_response($results);

function get_query_terms(string $query): array
{
    return array_values(array_filter(
        explode(' ', mb_strtolower(trim($query)))
    ));
}

function get_place_match(array $place, array $menuItems, array $terms): array
{
    $searchable = mb_strtolower(implode(' ', [
        $place['name'],
        $place['type'],
        $place['description'],
        ...$place['tags'],
        ...array_map(fn($m) => $m['name'], $menuItems),
        ...array_merge(...array_map(fn($m) => $m['tags'], $menuItems)),
    ]));

    $matchScore = 0;
    $matchedMenuItems = [];

    foreach ($terms as $term) {
        if (str_contains($searchable, $term)) {
            $matchScore++;
        }
    }

    foreach ($menuItems as $item) {
        $itemText = mb_strtolower($item['name'] . ' ' . implode(' ', $item['tags']));
        foreach ($terms as $term) {
            if (str_contains($itemText, $term)) {
                $matchedMenuItems[] = $item['name'];
                break;
            }
        }
    }

    if (empty($matchedMenuItems) && !empty($menuItems)) {
        $matchedMenuItems = array_slice(
            array_map(fn($m) => $m['name'], $menuItems),
            0, 2
        );
    }

    return [
        'matchScore'       => $matchScore,
        'matchedMenuItems'  => $matchedMenuItems,
    ];
}
