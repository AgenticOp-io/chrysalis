<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Component\Routing\Attribute\Route;

final class UserShowController
{
    #[Route('/users/{userId}', name: 'user_show', methods: ['GET'])]
    public function __invoke(): void
    {
        header('Content-Type: text/plain; charset=utf-8');
        echo (string) $userId;
    }
}
