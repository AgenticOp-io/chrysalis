<?php

function total(int ...$nums): int
{
    return array_sum($nums);
}

echo total(1, 2, 3);
