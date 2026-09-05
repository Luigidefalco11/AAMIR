import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

// Stands in for the real client component so the test can assert purely on
// whether the page decided to mount it.
vi.mock("@/components/ClearCartOnMount", () => ({
  ClearCartOnMount: () => <div data-testid="clear-cart" />,
}));

import CheckoutSuccessPage from "./page";

function renderPage(searchParams: Record<string, string | string[] | undefined>) {
  return CheckoutSuccessPage({
    params: Promise.resolve({ locale: "it" }),
    searchParams: Promise.resolve(searchParams),
  }).then((ui) => render(ui));
}

describe("CheckoutSuccessPage", () => {
  it("clears the cart when Stripe redirected here with a session_id", async () => {
    await renderPage({ session_id: "cs_test_123" });

    expect(screen.getByTestId("clear-cart")).toBeInTheDocument();
  });

  it("does not clear the cart on a bookmark, back-navigation or shared link", async () => {
    // No session_id: the visitor did not just come back from Stripe, so an
    // unrelated cart they've been building must survive the visit.
    await renderPage({});

    expect(screen.queryByTestId("clear-cart")).not.toBeInTheDocument();
    // The reassurance copy still renders — only the side effect is gated.
    expect(screen.getByRole("heading")).toBeInTheDocument();
  });

  it("does not clear the cart for an empty session_id", async () => {
    await renderPage({ session_id: "" });

    expect(screen.queryByTestId("clear-cart")).not.toBeInTheDocument();
  });

  it("still clears the cart when session_id arrives as a repeated param", async () => {
    await renderPage({ session_id: ["cs_test_123"] });

    expect(screen.getByTestId("clear-cart")).toBeInTheDocument();
  });
});
