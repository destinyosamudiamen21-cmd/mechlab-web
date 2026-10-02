import assert from "node:assert/strict";
import { test } from "node:test";
import { solveFlitched } from "../src/widgets/composite/solver.ts";

const near = (actual: number, expected: number, tolerance = 0.01) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `expected ${expected}, got ${actual}`
  );

const beam = { b: 100, d: 200, t: 10, n: 20, m: 20 };

test("hand check: 100 × 200 timber, 10 mm plates, n = 20, M = 20 kN m", () => {
  const result = solveFlitched(beam);
  near(result.i / 1e6, 508.0, 0.05);
  near(result.timberMax, 3.937, 0.001);
  near(result.steelMax, 86.61, 0.01);
});

test("with n = 1 it is just one solid beam of depth d + 2t", () => {
  const result = solveFlitched({ ...beam, n: 1 });
  near(result.i, (100 * 220 ** 3) / 12, 1);
  near(result.steelMax, (20e6 * 110) / result.i, 1e-6);
});

test("at the joint the steel stress is n times the timber stress (same strain)", () => {
  const result = solveFlitched(beam);
  near(result.steelJoint / result.timberMax, 20, 1e-9);
});

test("the two materials together carry the whole moment", () => {
  const result = solveFlitched(beam);
  near(result.timberMoment + result.steelMoment, 20, 1e-9);
  // Timber alone: its stress block gives M = σ b d² / 6.
  near(
    result.timberMoment,
    (result.timberMax * 100 * 200 ** 2) / 6 / 1e6,
    1e-9
  );
});
