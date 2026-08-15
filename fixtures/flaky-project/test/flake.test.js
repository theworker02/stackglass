import assert from "node:assert/strict";
import test from "node:test";

test("deterministic simulated flake", () => {
  const pass = process.env.STACKGLASS_FLAKE_PASS === "1";
  assert.equal(pass, true);
});
