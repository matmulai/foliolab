import { describe, expect, it } from "vitest";

// Temporary: proves the CI gate can actually go red. Deleted with this branch.
describe("gate proof", () => {
  it("fails on purpose", () => {
    expect(1).toBe(2);
  });
});
