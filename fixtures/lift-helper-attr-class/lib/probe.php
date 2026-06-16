<?php

class ChrysalisAttrProbe
{
    #[\Chrysalis\Probe('class-static')]
    public static function answer(int $n): int
    {
        return $n + 1;
    }
}
