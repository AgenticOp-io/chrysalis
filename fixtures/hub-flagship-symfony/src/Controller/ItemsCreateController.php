<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Component\Routing\Attribute\Route;

#[Route('/items', name: 'items_')]
final class ItemsCreateController
{
    #[Route('', name: 'create', methods: ['POST'])]
    public function __invoke(): void
    {
        http_response_code(201);
        header('Content-Type: application/json');
        echo json_encode(['created' => true]);
    }
}
