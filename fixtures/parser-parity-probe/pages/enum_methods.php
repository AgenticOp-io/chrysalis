<?php

enum Color: string
{
    case Red = 'red';
    case Blue = 'blue';

    public function label(): string
    {
        return $this->value;
    }

    public static function default(): self
    {
        return self::Red;
    }
}

function color_label(Color $c): string
{
    return $c->label();
}

echo color_label(Color::Red);
echo Color::default()->value;
