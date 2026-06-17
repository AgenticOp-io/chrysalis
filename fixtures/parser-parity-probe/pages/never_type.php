<?php

declare(strict_types=1);

function never_route(): never
{
    throw new Exception('stop');
}
