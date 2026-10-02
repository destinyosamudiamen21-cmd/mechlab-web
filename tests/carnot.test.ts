import assert from "node:assert/strict";
import { test } from "node:test";
import { GAMMA, solveCarnot } from "../src/widgets/carnot/solver.ts";

const near = (actual: number, expected: number, tolerance = 1e-6) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `expected ${expected}, got ${actual}`
  );

test("600 K and 300 K gives 50 %", () => {
  near(solveCarnot({ th: 600, tc: 300, ratio: 2, p1: 5000 }).efficiency, 0.5);
});

test("the work is the efficiency times the heat supplied", () => {
  const result = solveCarnot({ th: 900, tc: 320, ratio: 3, p1: 5000 });
  near(result.work, result.efficiency * result.heatIn);
});

test("entropy taken in at TH equals entropy given out at TC", () => {
  const result = solveCarnot({ th: 900, tc: 320, ratio: 3, p1: 5000 });
  near(result.heatIn / 900, result.heatOut / 320);
  near(result.heatIn / 900, result.entropyChange);
});

test("the four corners close the cycle", () => {
  const { states } = solveCarnot({ th: 800, tc: 300, ratio: 2.5, p1: 5000 });
  const [s1, s2, s3, s4] = states;
  near(s1.p, 5000);
  // 2 to 3 and 4 to 1 are adiabatic: p v^γ is the same at both ends.
  near(s2.p * s2.v ** GAMMA, s3.p * s3.v ** GAMMA, 1e-6);
  near(s4.p * s4.v ** GAMMA, s1.p * s1.v ** GAMMA, 1e-6);
  // 3 to 4 is the same volume ratio as 1 to 2.
  near(s3.v / s4.v, s2.v / s1.v);
});

test("lowering the cold side by 50 K beats raising the hot side by 50 K", () => {
  const hotter = solveCarnot({
    th: 650,
    tc: 300,
    ratio: 2,
    p1: 5000,
  }).efficiency;
  const colder = solveCarnot({
    th: 600,
    tc: 250,
    ratio: 2,
    p1: 5000,
  }).efficiency;
  assert.ok(colder > hotter);
});
