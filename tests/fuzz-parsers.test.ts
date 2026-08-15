import { describe, expect, it } from "vitest";
import { analyzeError } from "@stackglass/core";

function fuzz(seed: number, len: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789.:/\\[]{}() \n\t'";
  let out = "";
  let x = seed;
  for (let i = 0; i < len; i++) {
    x = (x * 1664525 + 1013904223) >>> 0;
    out += chars[x % chars.length];
  }
  return out;
}

describe("bounded parser fuzz", () => {
  it("never throws on random compiler-like input", () => {
    for (let i = 0; i < 80; i++) {
      const input = fuzz(i + 1, 200);
      expect(() => analyzeError({ compilerError: input })).not.toThrow();
      expect(() => analyzeError({ stackTrace: input })).not.toThrow();
      expect(() => analyzeError({ testFailure: input })).not.toThrow();
    }
  });
});
