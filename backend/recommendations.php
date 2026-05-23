<?php

declare(strict_types=1);

require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/places.php';

$db = get_db();
$query = trim((string) get_param('q', ''));

if ($query === '') {
    json_response([]);
}

$stmt = $db->query('SELECT * FROM places WHERE status = "approved" ORDER BY created_at DESC');
$places = $stmt->fetchAll();
$terms = array_values(array_filter(preg_split('/\s+/', strtolower($query)) ?: []));
$results = [];

foreach ($places as $place) {
    $formatted = format_place($db, $place);
    $match = get_place_match($formatted, $terms);

    if ($match['matchScore'] > 0) {
        $results[] = array_merge($formatted, $match);
    }
}

usort($results, fn(array $a, array $b) =>
    ($b['matchScore'] * 10 + $b['rating']) <=> ($a['matchScore'] * 10 + $a['rating'])
);

json_response($results);

function get_place_match(array $place, array $terms): array
{
    $menuItems = $place['menuItems'];
    $searchable = strtolower(implode(' ', [
        $place['name'],
        $place['type'],
        $place['description'],
        ...$place['tags'],
        ...$place['menuHighlights'],
        ...array_map(fn(array $item) => $item['name'], $menuItems),
        ...array_merge([], ...array_map(fn(array $item) => $item['tags'], $menuItems)),
    ]));
    $matchScore = 0;
    $matchedMenuItems = [];

    foreach ($terms as $term) {
        if (str_contains($searchable, $term)) {
            $matchScore++;
        }
    }

    foreach ($menuItems as $item) {
        $itemText = strtolower($item['name'] . ' ' . implode(' ', $item['tags']));

        foreach ($terms as $term) {
            if (str_contains($itemText, $term)) {
                $matchedMenuItems[] = $item['name'];
                break;
            }
        }
    }

    if (!$matchedMenuItems) {
        $matchedMenuItems = array_slice(array_map(fn(array $item) => $item['name'], $menuItems), 0, 2);
    }

    return [
        'matchScore' => $matchScore,
        'matchedMenuItems' => array_values(array_unique($matchedMenuItems)),
    ];
}
