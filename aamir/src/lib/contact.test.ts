import { describe, it, expect } from "vitest";
import { instagramUrl } from "./contact";

describe("instagramUrl", () => {
  it("strips a leading @ and builds the profile URL", () => {
    expect(instagramUrl("@aamirjewelry")).toBe("https://instagram.com/aamirjewelry");
  });
  it("works without a leading @", () => {
    expect(instagramUrl("aamirjewelry")).toBe("https://instagram.com/aamirjewelry");
  });
});
