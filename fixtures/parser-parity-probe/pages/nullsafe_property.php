<?php

declare(strict_types=1);

/** Parser parity: nullsafe property access (`?->`). */
$user = null;
$label = $user?->name ?? "anon";
echo $label;
