<?php

declare(strict_types=1);

require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/helpers.php';

$db = get_db();
$action = get_param('action');

if (get_method() !== 'POST') {
    error_response('Method not allowed', 405);
}

match ($action) {
    'signin' => sign_in($db),
    'signup' => sign_up($db),
    'signout' => sign_out(),
    default => error_response('Unknown auth action', 400),
};

function sign_in(PDO $db): void
{
    $body = get_json_body();
    $email = strtolower(trim((string) ($body['email'] ?? '')));
    $password = (string) ($body['password'] ?? '');

    if ($email === '' || $password === '') {
        error_response('Email and password are required', 422);
    }

    $stmt = $db->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        error_response('Invalid email or password', 401);
    }

    $_SESSION['user_id'] = $user['id'];
    json_response(public_user($user));
}

function sign_up(PDO $db): void
{
    $body = get_json_body();
    $name = trim((string) ($body['name'] ?? ''));
    $email = strtolower(trim((string) ($body['email'] ?? '')));
    $password = (string) ($body['password'] ?? '');

    if ($name === '' || $email === '' || $password === '') {
        error_response('Name, email, and password are required', 422);
    }

    if (!is_allowed_cvsu_email($email)) {
        error_response('Please use an approved CvSU email address', 422);
    }

    $existing = $db->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $existing->execute([$email]);

    if ($existing->fetch()) {
        error_response('Email is already registered', 409);
    }

    $id = 'user-' . slugify($email);
    $stmt = $db->prepare(
        'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, "user")'
    );
    $stmt->execute([
        $id,
        $name,
        $email,
        password_hash($password, PASSWORD_DEFAULT),
    ]);

    $user = [
        'id' => $id,
        'name' => $name,
        'email' => $email,
        'role' => 'user',
    ];

    $_SESSION['user_id'] = $id;
    json_response($user, 201);
}

function sign_out(): void
{
    $_SESSION = [];

    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
    }

    json_response(['ok' => true]);
}
