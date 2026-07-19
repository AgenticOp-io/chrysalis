# WISP → CWL completeness plan

## Definition of complete

A conversion is complete only when the generated site preserves the source
routes, visible states, data bindings, controls, forms, menus, overlays,
wizards, API contracts, and required vendor islands. A zero-hole report alone
is insufficient.

The one-pass compiler must fail when a hard completeness gate fails. It must
report suspicious but not yet provably broken behavior as reviewable evidence.

## Automated inventories

### Source inventory

Inventory all `.svelte`, `.ts`, `.js`, CSS, static, and backend route files.
For Svelte sources count:

- page routes and dynamic route parameters;
- buttons, links, inputs, forms, and event directives;
- declared functions and API calls;
- modal, wizard, menu, map, chart, and editor component references;
- `{#if}`, `{#each}`, `{:else if}`, await, slot, action, transition, and binding
  constructs;
- imported constants and source-owned catalogs.

### Converted inventory

For generated CWL and static HTML count:

- pages and internal links;
- runtime bindings and unresolved holes;
- controls by wiring mechanism (`nav`, `action`, `set`, `toggle`, submit,
  close, wizard navigation, and delegated runtime class);
- forms and inferred API endpoints;
- modal, wizard, menu, map, chart, and editor shells;
- unique action names and argument shapes;
- original CSS and vendor-island assets;
- API routes by method and path.

### Runtime inventory

The client dispatcher must expose explicit strategies for:

- navigation and back actions;
- opening, closing, and toggling overlays and menus;
- search, filter, sorting, pagination, and tabs;
- add, view, edit, save, delete, and confirmation flows;
- lifecycle actions such as assign, start, complete, acknowledge, resolve,
  deploy, return, transfer, check-in, and check-out;
- form serialization, validation, API error handling, and success feedback;
- wizard next/back/review/save behavior;
- row identity and dynamic list rendering.

Reserved JavaScript plumbing (`if`, `preventDefault`, `stopPropagation`,
`setTimeout`, `setInterval`, and raw `goto`) must never become a CWL action.

## Hard gates

The build fails for:

- missing source page routes;
- unresolved `data-cwl-hole` markers;
- residual Svelte directives, blocks, or `goto(...)`;
- malformed CWL or HTML;
- invalid converted action names;
- empty converted modal/wizard/navigation shells;
- failed source catalog extraction;
- missing ArcGIS bundle when the source imports ArcGIS;
- API route extraction or generation failure;
- static export failure;
- GCE bundle verification failure.

## Evidence gates

The audit reports, but does not immediately fail for:

- controls that cannot yet be classified as wired;
- source functions that have no direct static equivalent;
- source control count versus output control count;
- forms without an explicit endpoint;
- action names handled only by the generic dispatcher;
- routes with placeholder native API responses;
- source overlays represented by a generic converted shell.

Evidence findings are the repair queue. A finding is closed by either adding a
real conversion/runtime implementation or a narrow documented classification
rule. It is not closed by suppressing the count globally.

## Repair order

1. Fix event conversion so only meaningful handlers become actions.
2. Rebuild from clean source and regenerate the behavioral audit.
3. Group potential inert controls by page, label, class, and source component.
4. Implement repeated behavior in the central dispatcher or converter.
5. Implement unique behavior in a source-derived shell blueprint or runtime
   handler registry.
6. Compare every source modal and wizard reference with converted shells.
7. Compare all source API calls and backend routes with generated API routes.
8. Verify list identity, row actions, filters, and loading/empty/error states.
9. Run browser interaction coverage on every linked page after local GCE bundle
   startup.
10. Deploy only after local hard gates pass; then run the live route/API audit.

## Browser verification matrix

For every page:

- load without a permanent spinner or hidden primary content;
- open and close each menu, modal, editor, and wizard;
- use each tab, filter, search, and pagination control;
- execute create/read/update/delete and lifecycle controls with safe demo data;
- verify form validation and API feedback;
- verify that row actions target the selected record;
- verify internal navigation and back behavior;
- verify mobile and desktop overlay visibility;
- record console errors, failed requests, 404/405/501 responses, and dead links.

The live audit is a deployment verification step, not a substitute for static
conversion gates.

## Consolidation exit criteria

- One supported build command.
- No canonical stage invokes a phase mutator or deepen batch.
- All reusable extractors and gates are imported by the one-pass compiler.
- Compatibility scripts are documented as legacy and cannot overwrite one-pass
  output.
- Clean rebuild passes twice with equivalent inventories.
- Local browser matrix passes.
- GCE deployment and live route/API audit pass.
