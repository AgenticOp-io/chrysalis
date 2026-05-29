<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Component\Routing\Attribute\Route;

#[Route('/items', name: 'items_')]
final class ItemsUpdateController
{
    #[Route('/{id}', name: 'update', methods: ['PUT'])]
    public function __invoke(): void
    {
        header('Content-Type: application/json');
        echo json_encode(['updated' => true, 'id' => (int) $id]);
    }
}
