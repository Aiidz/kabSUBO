<?php

declare(strict_types=1);

require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/helpers.php';

$method = get_method();
$action = get_param('action');
$db     = get_db();

match ($method) {
    'POST' => match ($action) {
        'register' => register($db),
        'login'    => login($db),
        'logout'   => logout($db),
        default    => error_response('Unknown action', 400),
    },
    'GET' => match ($action) {
        'me'   => me($db),
        default => error_response('Unknown action', 400),
    },
    default => error_response('Method not allowed', 405),
};

function register(PDO $db): void
{
    $body        = get_json_body();
    $displayName = trim($body['displayName'] ?? '');
    $password    = $body['password'] ?? '';

    if ($displayName === '' || $password === '') {
        error_response('displayName and password are required', 400);
    }

    if (strlen($password) < 6) {
        error_response('Password must be at least 6 characters', 422);
    }

    $stmt = $db->prepare("SELECT id FROM profiles WHERE display_name = ?");
    $stmt->execute([$displayName]);

    if ($stmt->fetch()) {
        error_response('Display name already taken', 409);
    }

    $id   = generate_uuid_v4();
    $hash = password_hash($password, PASSWORD_BCRYPT);

    $stmt = $db->prepare(
        "INSERT INTO profiles (id, display_name, password_hash) VALUES (?, ?, ?)"
    );
    $stmt->execute([$id, $displayName, $hash]);

    $token = create_session($db, $id);
    set_session_cookie($token);

    json_response([
        'token' => $token,
        'user'  => [
            'id'          => $id,
            'displayName' => $displayName,
        ],
    ]);
}

function login(PDO $db): void
{
    $body        = get_json_body();
    $displayName = trim($body['displayName'] ?? '');
    $password    = $body['password'] ?? '';

    if ($displayName === '' || $password === '') {
        error_response('displayName and password are required', 400);
    }

    $stmt = $db->prepare(
        "SELECT id, display_name, password_hash FROM profiles WHERE display_name = ?"
    );
    $stmt->execute([$displayName]);
    $profile = $stmt->fetch();

    if (!$profile || !$profile['password_hash']) {
        error_response('Invalid credentials', 401);
    }

    if (!password_verify($password, $profile['password_hash'])) {
        error_response('Invalid credentials', 401);
    }

    $token = create_session($db, $profile['id']);
    set_session_cookie($token);

    json_response([
        'token' => $token,
        'user'  => [
            'id'          => $profile['id'],
            'displayName' => $profile['display_name'],
        ],
    ]);
}

function me(PDO $db): void
{
    $token = get_session_token();

    if (!$token) {
        error_response('Not authenticated', 401);
    }

    $stmt = $db->prepare(
        "SELECT p.id, p.display_name, p.avatar_url
         FROM sessions s
         JOIN profiles p ON p.id = s.user_id
         WHERE s.token = ?"
    );
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        error_response('Invalid session', 401);
    }

    json_response([
        'id'          => $user['id'],
        'displayName' => $user['display_name'],
        'avatarUrl'   => $user['avatar_url'] ?? '',
    ]);
}

function logout(PDO $db): void
{
    $token = get_session_token();

    if ($token) {
        $stmt = $db->prepare("DELETE FROM sessions WHERE token = ?");
        $stmt->execute([$token]);
    }

    setcookie('session_token', '', [
        'expires'  => 1,
        'path'     => '/',
        'domain'   => '',
        'secure'   => false,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    json_response(['ok' => true]);
}

function create_session(PDO $db, string $userId): string
{
    $token = bin2hex(random_bytes(32));
    $stmt  = $db->prepare("INSERT INTO sessions (user_id, token) VALUES (?, ?)");
    $stmt->execute([$userId, $token]);

    return $token;
}

function set_session_cookie(string $token): void
{
    setcookie('session_token', $token, [
        'expires'  => 0,
        'path'     => '/',
        'domain'   => '',
        'secure'   => false,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}


function generate_uuid_v4(): string
{
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);

    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}
