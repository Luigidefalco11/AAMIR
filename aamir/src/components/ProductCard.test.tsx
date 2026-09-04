import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/sanity/types";

vi.mock("@/sanity/client", () => ({
  urlFor: () => ({
    url: () => "https://cdn.sanity.io/x.jpg",
    width: () => ({ auto: () => ({ url: () => "https://cdn.sanity.io/x.jpg" }) }),
  }),
}));

const product: Product = {
  _id: "1",
  title: { it: "Collana Onda", en: "Onda Necklace" },
  slug: "collana-onda",
  categorySlug: "collane",
  images: [{ asset: { _ref: "image-1" }, alt: "Collana" }],
  materials: { it: "Oro 18k", en: "18k gold" },
  description: { it: "", en: "" },
  available: true,
};

describe("ProductCard", () => {
  it("renders the localized title and links to the PDP", () => {
    render(<ProductCard product={product} locale="en" />);
    expect(screen.getByText("Onda Necklace")).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/en/collezioni/collane/collana-onda");
  });
});
