<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Component\Routing\Attribute\Route;

#[Route('/api', name: 'api_')]
final class ApiItemsShowController
{
    #[Route('/items/{id}', name: 'items_show', methods: ['GET'])]
    public function __invoke(): void
    {
        header('Content-Type: application/json');
        echo json_encode(['id' => (int) $id]);
    }
}
