<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Component\Routing\Attribute\Route;

#[Route('/items', name: 'items_')]
final class ItemsDeleteController
{
    #[Route('/{id}', name: 'delete', methods: ['DELETE'])]
    public function __invoke(): void
    {
        http_response_code(204);
    }
}
