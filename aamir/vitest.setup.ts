import "@testing-library/jest-dom/vitest";

// jsdom has no matchMedia; GSAP's ScrollTrigger calls it at plugin-registration
// time, so any component importing ScrollTrigger throws without this stub.
if (typeof window.matchMedia !== "function") {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
