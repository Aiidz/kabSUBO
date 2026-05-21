<?php

declare(strict_types=1);

function cors(): void
{
    header('Access-Control-Allow-Origin: http://localhost:3000');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Credentials: true');

    if (get_method() === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function json_response(mixed $data, int $status = 200): void
{
    cors();
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

function error_response(string $message, int $status = 400): void
{
    cors();
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function get_json_body(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        error_response('Invalid JSON body', 400);
    }

    return $data ?? [];
}

function get_method(): string
{
    return $_SERVER['REQUEST_METHOD'];
}

function get_param(string $key, mixed $default = null): mixed
{
    return $_GET[$key] ?? $default;
}

function decode_json_string(?string $value, string $default = ''): string
{
    if ($value === null || $value === '') {
        return $default;
    }

    $decoded = json_decode($value, true);
    return is_string($decoded) ? $decoded : $value;
}

function get_session_token(): ?string
{
    $auth = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? '';

    if (preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) {
        return $m[1];
    }

    return $_COOKIE['session_token'] ?? null;
}

function require_auth(PDO $db): string
{
    $token = get_session_token();
    if (!$token) {
        error_response('Unauthorized: Missing session token', 401);
    }

    $stmt = $db->prepare("SELECT user_id FROM sessions WHERE token = ?");
    $stmt->execute([$token]);
    $userId = $stmt->fetchColumn();

    if (!$userId) {
        error_response('Unauthorized: Invalid or expired session token', 401);
    }

    return $userId;
}

function require_role(PDO $db, string $userId, array $allowedRoles): void
{
    $stmt = $db->prepare("SELECT role FROM user_roles WHERE user_id = ?");
    $stmt->execute([$userId]);
    $role = $stmt->fetchColumn();

    if (!$role || !in_array($role, $allowedRoles, true)) {
        error_response('Forbidden: You do not have the required permissions', 403);
    }
}
