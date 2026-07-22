import { describe, it, expect } from "vitest";
import { CATEGORY_SLUGS, isValidCategory } from "./categories";

describe("categories", () => {
  it("exposes the four fixed category slugs", () => {
    expect(CATEGORY_SLUGS).toEqual(["collane", "bracciali", "orecchini", "anelli"]);
  });
  it("validates known slugs", () => {
    expect(isValidCategory("anelli")).toBe(true);
    expect(isValidCategory("orologi")).toBe(false);
  });
});
