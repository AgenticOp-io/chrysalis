<?php

function pick(?string $value): string
{
    return $value ?? 'none';
}

echo pick(null);
