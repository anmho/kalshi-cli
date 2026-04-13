import { describe, expect, test } from "bun:test";
import { getCliVersion } from "~/lib/version.js";

describe("getCliVersion", () => {
  test("returns a non-empty version string", () => {
    const version = getCliVersion();
    expect(typeof version).toBe("string");
    expect(version.length).toBeGreaterThan(0);
  });
});
