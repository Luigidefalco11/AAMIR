import { describe, it, expect } from "vitest";
import { buildRequestInfoMessage, instagramUrl, instagramDmUrl } from "./contact";

describe("buildRequestInfoMessage", () => {
  it("builds the Italian message for a product", () => {
    const message = buildRequestInfoMessage({ productName: "Collana Onda", locale: "it" });
    expect(message).toBe("Salve, sono interessato/a a questo pezzo: Collana Onda.");
  });
  it("builds the English message for a product", () => {
    const message = buildRequestInfoMessage({ productName: "Onda Necklace", locale: "en" });
    expect(message).toBe("Hello, I'm interested in this piece: Onda Necklace.");
  });
});

describe("instagramUrl", () => {
  it("strips a leading @ and builds the profile URL", () => {
    expect(instagramUrl("@aamirjewelry")).toBe("https://instagram.com/aamirjewelry");
  });
  it("works without a leading @", () => {
    expect(instagramUrl("aamirjewelry")).toBe("https://instagram.com/aamirjewelry");
  });
});

describe("instagramDmUrl", () => {
  it("strips a leading @ and builds the direct-message deep link", () => {
    expect(instagramDmUrl("@aamir.jewelry")).toBe("https://ig.me/m/aamir.jewelry");
  });
  it("works without a leading @", () => {
    expect(instagramDmUrl("aamir.jewelry")).toBe("https://ig.me/m/aamir.jewelry");
  });
});
