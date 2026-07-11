/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from "vitest";
import {
  createCwlBrowserRuntime,
  discoverClientIslands,
  mountCwlClientIslands,
  readIslandEventBindings,
} from "../src/index.js";

describe("@chrysalis/runtime-cwl-browser", () => {
  it("discovers client islands and event bindings", () => {
    document.body.innerHTML = `<div data-cwl-island="client" data-cwl-on-click="nav.home">Home</div>`;
    const islands = discoverClientIslands(document);
    expect(islands).toHaveLength(1);
    expect(readIslandEventBindings(islands[0]!.element)).toEqual([{ name: "click", action: "nav.home" }]);
  });

  it("mountCwlClientIslands dispatches declarative actions", () => {
    document.body.innerHTML = `<button data-cwl-island="client" data-cwl-on-click="ping">Go</button>`;
    const dispatch = vi.fn();
    const { unmount } = mountCwlClientIslands(dispatch, document);
    document.querySelector("button")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(dispatch).toHaveBeenCalledWith("ping", expect.objectContaining({ event: expect.any(Event) }));
    unmount();
    document.querySelector("button")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("createCwlBrowserRuntime mounts and unmounts", () => {
    document.body.innerHTML = `<div data-cwl-island="client" data-cwl-on-click="x">X</div>`;
    const dispatch = vi.fn();
    const runtime = createCwlBrowserRuntime({ dispatch });
    runtime.mount();
    expect(runtime.islands).toHaveLength(1);
    document.querySelector("div")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(dispatch).toHaveBeenCalledWith("x", expect.any(Object));
    runtime.unmount();
    expect(runtime.islands).toHaveLength(0);
  });

  it("binds nested data-cwl-on-* inside an island (G9490)", () => {
    document.body.innerHTML = `<div data-cwl-island="client"><button data-cwl-on-click="nested.ping">Go</button></div>`;
    const dispatch = vi.fn();
    const { unmount } = mountCwlClientIslands(dispatch, document);
    document.querySelector("button")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(dispatch).toHaveBeenCalledWith(
      "nested.ping",
      expect.objectContaining({ event: expect.any(Event) }),
    );
    unmount();
  });
});
