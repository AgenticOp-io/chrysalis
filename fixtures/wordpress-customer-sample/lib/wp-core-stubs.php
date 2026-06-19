<?php

declare(strict_types=1);

/** WordPress core stub for customer-sample fixture (G6280). */

function add_action(string $hook, callable $callback, int $priority = 10, int $accepted_args = 1): void
{
}

function apply_filters(string $tag, mixed $value, mixed ...$args): mixed
{
    return $value;
}

function get_bloginfo(string $show = ''): string
{
    return $show === 'name' ? 'Customer Sample Site' : 'Customer Sample Site';
}

function wp_head(): void
{
    echo "<!-- wp_head stub -->\n";
}

function wp_footer(): void
{
    echo "<!-- wp_footer stub -->\n";
}

function is_admin(): bool
{
    return str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/wp-admin');
}

function wp_die(string $message = '', string $title = '', array $args = []): never
{
    http_response_code(403);
    echo htmlspecialchars($message !== '' ? $message : 'Forbidden');
    exit;
}

function current_user_can(string $capability): bool
{
    return $capability === 'manage_options';
}

function wp_create_nonce(string $action = '-1'): string
{
    return 'customer-sample-nonce-' . $action;
}

function rest_get_server(): object
{
    return new class {
        public function get_routes(): array
        {
            return ['/wp/v2/posts' => []];
        }
    };
}
