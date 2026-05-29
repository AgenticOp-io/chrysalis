<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Component\Routing\Attribute\Route;

final class MetaController
{
    #[Route('/meta', name: 'meta', methods: ['GET'])]
    public function __invoke(): void
    {
        header('Content-Type: application/json');
        echo json_encode(['service' => 'hub-flagship-symfony', 'version' => 1]);
    }
}
