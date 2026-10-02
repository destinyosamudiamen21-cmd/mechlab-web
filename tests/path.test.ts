import assert from "node:assert/strict";
import { test } from "node:test";
import { deltaU, heatAlong, workAlong } from "../src/widgets/path/solver.ts";
import type { PathInput } from "../src/widgets/path/solver.ts";

const close = (actual: number, expected: number) =>
  assert.ok(
    Math.abs(actual - expected) < 1e-6,
    `expected ${expected}, got ${actual}`
  );

const input: PathInput = { p1: 600, v1: 0.1, p2: 200, v2: 0.3, gamma: 1.4 };

test("work differs between the three paths", () => {
  close(workAlong(input, "A"), 120); // 600 × 0.2
  close(workAlong(input, "B"), 40); // 200 × 0.2
  close(workAlong(input, "C"), 80); // average pressure 400 × 0.2
});

test("the change in internal energy is the same on every path", () => {
  close(deltaU(input), (200 * 0.3 - 600 * 0.1) / 0.4); // 0 here: p₁V₁ = p₂V₂, so T₁ = T₂
  for (const path of ["A", "B", "C"] as const) {
    close(heatAlong(input, path) - workAlong(input, path), deltaU(input));
  }
});

test("round a cycle (out along A, back along B) net heat equals net work", () => {
  const back: PathInput = {
    p1: input.p2,
    v1: input.v2,
    p2: input.p1,
    v2: input.v1,
    gamma: 1.4,
  };
  // Going back along B's route in reverse means constant pressure p₂ first, which is path "A" from state 2.
  const netWork = workAlong(input, "A") + workAlong(back, "A");
  const netHeat = heatAlong(input, "A") + heatAlong(back, "A");
  close(netWork, (600 - 200) * 0.2); // the rectangle enclosed by the cycle
  close(netHeat, netWork);
  close(deltaU(input) + deltaU(back), 0);
});
