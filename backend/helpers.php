<?php

declare(strict_types=1);

bootstrap_api();

function bootstrap_api(): void
{
    $allowedOrigins = array_filter(array_map(
        'trim',
        explode(',', getenv('KABSUBO_ALLOWED_ORIGINS') ?: 'http://localhost:3000')
    ));
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($origin && in_array($origin, $allowedOrigins, true)) {
        header("Access-Control-Allow-Origin: {$origin}");
        header('Access-Control-Allow-Credentials: true');
        header('Vary: Origin');
    }

    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_set_cookie_params([
            'httponly' => true,
            'samesite' => 'Lax',
            'secure' => is_https(),
        ]);
        session_start();
    }
}

function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

function json_response(mixed $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

function error_response(string $message, int $status = 400): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function get_json_body(): array
{
    $raw = file_get_contents('php://input') ?: '';

    if ($raw === '') {
        return [];
    }

    $data = json_decode($raw, true);

    if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
        error_response('Invalid JSON body', 400);
    }

    return $data;
}

function get_method(): string
{
    return $_SERVER['REQUEST_METHOD'] ?? 'GET';
}

function get_param(string $key, mixed $default = null): mixed
{
    return $_GET[$key] ?? $default;
}

function generate_id(string $prefix = ''): string
{
    $id = bin2hex(random_bytes(16));
    return $prefix ? "{$prefix}-{$id}" : $id;
}

function slugify(string $value): string
{
    $slug = strtolower(trim($value));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?: '';
    $slug = trim($slug, '-');
    return $slug !== '' ? $slug : generate_id('place');
}

function encode_json(mixed $value): string
{
    return json_encode($value, JSON_UNESCAPED_UNICODE);
}

function decode_json_list(?string $value): array
{
    if (!$value) {
        return [];
    }

    $decoded = json_decode($value, true);
    return is_array($decoded) ? $decoded : [];
}

function public_user(array $user): array
{
    return [
        'id' => $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'role' => $user['role'],
    ];
}

function current_user(PDO $db): ?array
{
    $userId = $_SESSION['user_id'] ?? null;

    if (!$userId) {
        return null;
    }

    $stmt = $db->prepare('SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    return $user ?: null;
}

function require_auth(PDO $db): array
{
    $user = current_user($db);

    if (!$user) {
        error_response('Authentication required', 401);
    }

    return $user;
}

function require_admin(PDO $db): array
{
    $user = require_auth($db);

    if ($user['role'] !== 'admin') {
        error_response('Admin role required', 403);
    }

    return $user;
}

function require_owner_or_admin(array $user, ?string $ownerUserId): void
{
    if ($user['role'] !== 'admin' && $ownerUserId !== $user['id']) {
        error_response('You are not allowed to modify this resource', 403);
    }
}

function allowed_cvsu_domains(): array
{
    return array_values(array_filter(array_map(
        fn(string $domain) => strtolower(trim($domain)),
        explode(',', getenv('KABSUBO_ALLOWED_EMAIL_DOMAINS') ?: 'cvsu.edu.ph')
    )));
}

function is_allowed_cvsu_email(string $email): bool
{
    $parts = explode('@', strtolower(trim($email)));

    if (count($parts) !== 2) {
        return false;
    }

    return in_array($parts[1], allowed_cvsu_domains(), true);
}
