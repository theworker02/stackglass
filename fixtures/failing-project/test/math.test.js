import assert from "node:assert/strict";
import test from "node:test";
import { add } from "../src/math.js";

test("add sums positives", () => {
  assert.equal(add(2, 2), 4);
});
