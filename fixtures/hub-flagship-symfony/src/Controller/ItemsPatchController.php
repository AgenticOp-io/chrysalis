<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Component\Routing\Attribute\Route;

#[Route('/items', name: 'items_')]
final class ItemsPatchController
{
    #[Route('/{id}', name: 'patch', methods: ['PATCH'])]
    public function __invoke(): void
    {
        header('Content-Type: application/json');
        echo json_encode(['patched' => true, 'id' => (int) $id]);
    }
}
