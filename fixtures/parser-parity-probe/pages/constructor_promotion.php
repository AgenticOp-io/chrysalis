<?php

declare(strict_types=1);

final class PromotedProbe
{
    public function __construct(
        private readonly string $label,
    ) {
    }

    public function label(): string
    {
        return $this->label;
    }

    public static function make(string $label): self
    {
        return new self($label);
    }
}

function promoted_label(): string
{
    return PromotedProbe::make('parity')->label();
}
