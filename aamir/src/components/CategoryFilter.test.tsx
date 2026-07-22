import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryFilter } from "./CategoryFilter";

describe("CategoryFilter", () => {
  it("renders All plus the four categories with correct hrefs", () => {
    render(
      <CategoryFilter
        locale="it"
        active={null}
        labels={{ all: "Tutti", collane: "Collane", bracciali: "Bracciali", orecchini: "Orecchini", anelli: "Anelli" }}
      />,
    );
    expect(screen.getByRole("link", { name: "Tutti" })).toHaveAttribute("href", "/it/collezioni");
    expect(screen.getByRole("link", { name: "Anelli" })).toHaveAttribute("href", "/it/collezioni/anelli");
  });
});
