<?php

function label(bool $on): string
{
    return $on ? 'yes' : 'no';
}

echo label(true);
