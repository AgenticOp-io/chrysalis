<?php

trait Greeter
{
    public function hello(): string
    {
        return 'hi';
    }

    public static function tag(): string
    {
        return 'Greeter';
    }
}

class Page
{
    use Greeter;
}

echo Page::tag();
echo (new Page())->hello();
