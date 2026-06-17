<?php

final class Sealed
{
    public static function id(): string
    {
        return 'sealed';
    }
}

echo Sealed::id();
