<?php

function sum_ids(array $items): int
{
    $n = 0;
    foreach ($items as $id) {
        $n += $id;
    }
    return $n;
}

echo sum_ids([1, 2, 3]);
