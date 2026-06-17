<?php

class Factory
{
    public static function make(): self
    {
        return new self();
    }
}

echo 'ok';
