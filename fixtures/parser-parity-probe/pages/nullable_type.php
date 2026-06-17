<?php

function accept_null(?int $value): ?int
{
    return $value;
}

echo accept_null(null) ?? 'null';
