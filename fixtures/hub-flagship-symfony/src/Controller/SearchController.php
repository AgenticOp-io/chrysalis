<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Component\Routing\Attribute\Route;

final class SearchController
{
    #[Route('/search', name: 'search', methods: ['GET'])]
    public function __invoke(): void
    {
        header('Content-Type: application/json');
        echo json_encode(['q' => $_GET['q'] ?? '']);
    }
}
