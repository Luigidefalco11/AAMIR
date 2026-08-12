import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RequestInfoButton } from "./RequestInfoButton";

describe("RequestInfoButton", () => {
  beforeEach(() => {
    vi.stubGlobal("open", vi.fn());
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it("copies the Italian product message and opens the Instagram DM thread", async () => {
    render(
      <RequestInfoButton
        instagramHandle="aamir.jewelry"
        productName="Collana Onda"
        locale="it"
        label="Richiedi info"
        copiedLabel="Copiato"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Richiedi info" }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "Salve, sono interessato/a a questo pezzo: Collana Onda.",
      );
    });
    expect(window.open).toHaveBeenCalledWith(
      "https://ig.me/m/aamir.jewelry",
      "_blank",
      "noopener,noreferrer",
    );
    expect(await screen.findByText("Copiato")).toBeInTheDocument();
  });

  it("still opens the DM thread when clipboard access fails", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    render(
      <RequestInfoButton
        instagramHandle="aamir.jewelry"
        productName="Onda Necklace"
        locale="en"
        label="Request info"
        copiedLabel="Copied"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Request info" }));

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith(
        "https://ig.me/m/aamir.jewelry",
        "_blank",
        "noopener,noreferrer",
      );
    });
    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
  });
});
