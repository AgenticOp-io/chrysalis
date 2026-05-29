<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Component\Routing\Attribute\Route;

#[Route('/items', name: 'items_')]
final class ItemsShowController
{
    #[Route('/{id}', name: 'show', methods: ['GET'])]
    public function __invoke(): void
    {
        header('Content-Type: application/json');
        echo json_encode(['id' => (int) $id]);
    }
}
