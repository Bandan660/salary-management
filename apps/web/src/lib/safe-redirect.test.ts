import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it("keeps in-app paths including their query", () => {
    expect(safeNextPath("/employees?country=IN")).toBe("/employees?country=IN");
  });

  it.each([
    ["missing", null],
    ["empty", ""],
    ["absolute URL", "https://evil.example/phish"],
    ["protocol-relative", "//evil.example"],
    ["backslash trick", "/\\evil.example"],
    ["javascript URL", "javascript:alert(1)"],
  ])("falls back to / for %s", (_label, value) => {
    expect(safeNextPath(value)).toBe("/");
  });
});
