<?php

declare(strict_types=1);

readonly class ReadonlyClassProbe
{
    public function __construct(public string $label)
    {
    }
}

function readonly_class_keyword_label(): string
{
    return (new ReadonlyClassProbe('parity'))->label;
}
