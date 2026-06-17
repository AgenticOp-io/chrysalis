<?php

declare(strict_types=1);

function takes_mixed(mixed $value): mixed
{
    return $value;
}

echo takes_mixed('probe');
