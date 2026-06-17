<?php

class Box
{
    public const TAG = 'x';

    public static function id(): string
    {
        return self::TAG;
    }
}

echo Box::id();
