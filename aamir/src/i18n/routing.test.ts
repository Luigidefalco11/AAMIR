import { describe, it, expect } from "vitest";
import { routing } from "./routing";

describe("i18n routing", () => {
  it("supports it and en with it as default", () => {
    expect(routing.locales).toEqual(["it", "en"]);
    expect(routing.defaultLocale).toBe("it");
  });
});
