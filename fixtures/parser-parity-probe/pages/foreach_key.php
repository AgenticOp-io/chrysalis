<?php

function labels(array $items): int
{
    $n = 0;
    foreach ($items as $key => $label) {
        $n += strlen((string) $key) + strlen($label);
    }
    return $n;
}

echo labels(['a' => 'one', 'b' => 'two']);
