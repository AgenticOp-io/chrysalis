<?php

declare(strict_types=1);

namespace App\Controller;

final class ProbeController
{
    public static function helper(int $id): int
    {
        return $id + 1;
    }

    public function __invoke(): void
    {
        header('Content-Type: application/json');
        $id = (int) $_GET['id'];
        echo json_encode(['id' => $id, 'q' => $_GET['q'] ?? '']);
    }

    public function notInvoked(): void
    {
        echo 'ignored';
    }
}
