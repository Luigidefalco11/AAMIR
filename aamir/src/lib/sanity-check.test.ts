import { describe, it, expect } from "vitest";
import { projectIsWired } from "./sanity-check";

describe("project scaffold", () => {
  it("is wired up and test runner works", () => {
    expect(projectIsWired()).toBe(true);
  });
});
