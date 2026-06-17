<?php

class Counter
{
    public static int $n = 0;

    public static function bump(): int
    {
        self::$n++;
        return self::$n;
    }
}

echo Counter::bump();
