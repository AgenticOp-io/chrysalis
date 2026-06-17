<?php

declare(strict_types=1);

final class ReadonlyProbe
{
    public readonly string $label;

    public function __construct(string $label)
    {
        $this->label = $label;
    }

    public static function make(string $label): self
    {
        return new self($label);
    }
}

function readonly_label(): string
{
    return ReadonlyProbe::make('parity')->label;
}
