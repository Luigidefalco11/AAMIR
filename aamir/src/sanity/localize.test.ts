import { describe, it, expect } from "vitest";
import { localize } from "./localize";

describe("localize", () => {
  it("returns the requested locale value", () => {
    expect(localize({ it: "Collana", en: "Necklace" }, "en")).toBe("Necklace");
  });
  it("falls back to Italian when the locale value is missing", () => {
    expect(localize({ it: "Collana" }, "en")).toBe("Collana");
  });
  it("returns empty string for undefined field", () => {
    expect(localize(undefined, "it")).toBe("");
  });
});
