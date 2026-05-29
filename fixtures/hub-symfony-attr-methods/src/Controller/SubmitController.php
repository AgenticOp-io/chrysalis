<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Component\Routing\Attribute\Route;

final class SubmitController
{
    #[Route('/submit', name: 'submit', methods: 'POST')]
    public function __invoke(): void
    {
        header('Content-Type: application/json');
        echo json_encode(['ok' => true]);
    }
}
