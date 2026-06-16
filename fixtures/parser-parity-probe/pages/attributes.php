<?php

#[\Chrysalis\Probe('parity')]
function tagged(int $n): int {
    return $n + 1;
}

echo tagged(3);
