import assert from "node:assert/strict";
import test from "node:test";
import { alwaysTrue } from "../src/flag.js";

test("exists", () => {
  assert.equal(typeof alwaysTrue, "function");
});
