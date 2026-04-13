import { describe, expect, test } from "bun:test";
import { parseInteger } from "~/lib/cli-helpers.js";
import { CliError } from "~/lib/errors.js";

describe("parseInteger", () => {
  test("parses valid integers", () => {
    expect(parseInteger("42")).toBe(42);
  });

  test("throws CliError for invalid values", () => {
    expect(() => parseInteger("nope", "limit")).toThrow(CliError);
  });
});
