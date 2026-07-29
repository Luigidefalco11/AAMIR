import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { CraftSection } from "./CraftSection";

const mockPrefersReducedMotion = vi.fn(() => false);
vi.mock("@/lib/motion", () => ({
  prefersReducedMotion: () => mockPrefersReducedMotion(),
}));

describe("CraftSection", () => {
  it("renders the title, text and video source", () => {
    mockPrefersReducedMotion.mockReturnValue(false);
    const { getByText, container } = render(
      <CraftSection title="La Lavorazione" text="Ogni pezzo è fatto a mano." />,
    );
    expect(getByText("La Lavorazione")).toBeInTheDocument();
    expect(getByText("Ogni pezzo è fatto a mano.")).toBeInTheDocument();
    const source = container.querySelector("source");
    expect(source).toHaveAttribute("src", "/videos/lavorazione.mp4");
  });

  it("pauses and removes loop from the video when reduced motion is preferred", () => {
    mockPrefersReducedMotion.mockReturnValue(true);
    const { container } = render(
      <CraftSection title="La Lavorazione" text="Ogni pezzo è fatto a mano." />,
    );
    const video = container.querySelector("video");
    expect(video).not.toHaveAttribute("loop");
  });
});
