<?php

class Node
{
    public static function kind(): string
    {
        return 'node';
    }

    public static function label(): string
    {
        return static::kind();
    }
}

echo Node::label();
