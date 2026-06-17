<?php

function safe(): string
{
    try {
        return 'ok';
    } catch (Throwable $e) {
        return 'err';
    }
}

echo safe();
