import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { Tilt3D } from "./Tilt3D";

const mockPrefersReducedMotion = vi.fn(() => false);
vi.mock("@/lib/motion", () => ({
  prefersReducedMotion: () => mockPrefersReducedMotion(),
}));

describe("Tilt3D", () => {
  it("mounts and unmounts without throwing when motion is allowed", () => {
    mockPrefersReducedMotion.mockReturnValue(false);
    const { unmount, getByText } = render(
      <Tilt3D amount={10}>
        <span>necklace</span>
      </Tilt3D>,
    );
    expect(getByText("necklace")).toBeInTheDocument();
    unmount();
  });

  it("renders children statically when reduced motion is preferred", () => {
    mockPrefersReducedMotion.mockReturnValue(true);
    const { getByText } = render(
      <Tilt3D amount={10}>
        <span>necklace</span>
      </Tilt3D>,
    );
    expect(getByText("necklace")).toBeInTheDocument();
  });
});
