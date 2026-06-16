<?php
$code = 200;
$label = match ($code) {
    200 => 'ok',
    404 => 'missing',
    default => 'other',
};
echo $label;
