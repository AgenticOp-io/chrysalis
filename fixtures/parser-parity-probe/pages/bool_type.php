<?php

function flag(bool $on): bool
{
    return $on;
}

echo flag(true) ? 'yes' : 'no';
