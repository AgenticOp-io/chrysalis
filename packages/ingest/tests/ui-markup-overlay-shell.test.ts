import { describe, expect, test } from "vitest";
import {
  extractOverlayGateIdent,
  liftStructuralAngularTemplateHtml,
  liftStructuralBladeTemplateHtml,
  liftStructuralNextPageJsx,
  liftStructuralVueTemplateHtml,
} from "@chrysalis/ingest";

describe("overlay shell fidelity (multi-origin)", () => {
  test("extractOverlayGateIdent recognizes show*/isOpen", () => {
    expect(extractOverlayGateIdent("showModal")).toBe("showModal");
    expect(extractOverlayGateIdent("showHint && ready")).toBe("showHint");
    expect(extractOverlayGateIdent("items.length")).toBeNull();
  });

  test("Vue v-if showX stamps shell key", () => {
    const r = liftStructuralVueTemplateHtml(
      `<template><div v-if="showModal" class="m">Hi</div></template>`,
    );
    expect(r?.html).toContain('data-cwl-shell-key="showModal"');
    expect(r?.html).toContain("hidden");
  });

  test("Vue :visible parent gate wraps self-gated shell", () => {
    const r = liftStructuralVueTemplateHtml(
      `<template><Modal :visible="showUpgradeModal"><template #footer>X</template></Modal></template>`,
    );
    expect(r?.html).toContain("cwl-self-gated-shell");
    expect(r?.html).toContain('data-cwl-shell-key="showUpgradeModal"');
    expect(r?.html).toContain('data-cwl-slot="footer"');
  });

  test("Next showX && (…) stamps shell key", () => {
    const r = liftStructuralNextPageJsx(
      `export default function P(){return (<main>{showModal && (<div class="m">Hi</div>)}</main>);}`,
    );
    expect(r?.html).toContain('data-cwl-shell-key="showModal"');
  });

  test("Angular *ngIf showX stamps shell key", () => {
    const r = liftStructuralAngularTemplateHtml(`<div *ngIf="showModal" class="m">Hi</div>`);
    expect(r?.html).toContain('data-cwl-shell-key="showModal"');
  });

  test("Blade @if($showX) stamps shell key", () => {
    const r = liftStructuralBladeTemplateHtml(
      `<main>@if($showModal)<div class="m">Hi</div>@endif</main>`,
    );
    expect(r?.html).toContain('data-cwl-shell-key="showModal"');
  });
});
