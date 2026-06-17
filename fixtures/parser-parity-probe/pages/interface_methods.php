<?php

interface Labelled
{
    public function label(): string;

    public static function kind(): string;
}

class Tag implements Labelled
{
    public function label(): string
    {
        return 'tag';
    }

    public static function kind(): string
    {
        return 'Tag';
    }
}

echo Tag::kind();
echo (new Tag())->label();
