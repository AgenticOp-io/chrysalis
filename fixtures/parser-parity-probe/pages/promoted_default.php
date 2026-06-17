<?php

class Box
{
    public function __construct(public string $label = 'x')
    {
    }
}

echo (new Box())->label;
