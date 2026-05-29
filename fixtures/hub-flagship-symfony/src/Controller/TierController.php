<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Component\Routing\Attribute\Route;

final class TierController
{
    #[Route('/tier', name: 'tier', methods: ['GET'])]
    public function __invoke(): void
    {
        header('Content-Type: text/plain; charset=utf-8');
    }
}
