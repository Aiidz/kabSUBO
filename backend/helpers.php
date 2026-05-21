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
