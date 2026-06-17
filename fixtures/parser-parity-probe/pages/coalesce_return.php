<?php

function pick_flag(int $active): int
{
    return $active ?? 1;
}

echo pick_flag(2);
