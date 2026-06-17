<?php

class Node
{
    public static function kind(): string
    {
        return 'node';
    }
}

class Leaf extends Node
{
    public static function kind(): string
    {
        return parent::kind();
    }
}

echo Leaf::kind();
