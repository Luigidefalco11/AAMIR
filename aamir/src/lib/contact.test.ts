import { describe, it, expect } from "vitest";
import { buildRequestInfoMailto, instagramUrl } from "./contact";

describe("buildRequestInfoMailto", () => {
  it("builds an encoded mailto with the Italian subject", () => {
    const url = buildRequestInfoMailto({
      email: "info@aamirjewelry.it",
      productName: "Collana Onda",
      locale: "it",
    });
    expect(url.startsWith("mailto:info@aamirjewelry.it?")).toBe(true);
    expect(url).toContain("subject=Richiesta%20info%3A%20Collana%20Onda");
  });
  it("uses the English subject for en locale", () => {
    const url = buildRequestInfoMailto({
      email: "info@aamirjewelry.it",
      productName: "Onda Necklace",
      locale: "en",
    });
    expect(url).toContain("subject=Product%20enquiry%3A%20Onda%20Necklace");
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
