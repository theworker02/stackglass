import assert from "node:assert/strict";
import test from "node:test";
import { tokenExpiryMs, publicSessionPayload } from "./token.js";

test("tokenExpiryMs treats input as milliseconds", () => {
  const before = Date.now();
  const expires = tokenExpiryMs(5_000);
  assert.ok(expires >= before + 4_000);
  assert.ok(expires <= before + 6_000);
});

test("public session contract uses milliseconds", () => {
  const payload = publicSessionPayload(5_000);
  assert.equal(payload.unit, "ms");
  assert.ok(payload.expiresAt > Date.now());
});
