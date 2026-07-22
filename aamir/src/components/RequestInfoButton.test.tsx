import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RequestInfoButton } from "./RequestInfoButton";

describe("RequestInfoButton", () => {
  it("renders a mailto link with the encoded product name", () => {
    render(
      <RequestInfoButton email="info@aamirjewelry.it" productName="Collana Onda" locale="it" label="Richiedi info" />,
    );
    const link = screen.getByRole("link", { name: "Richiedi info" });
    expect(link.getAttribute("href")).toContain("mailto:info@aamirjewelry.it");
    expect(link.getAttribute("href")).toContain("Collana%20Onda");
  });
});
