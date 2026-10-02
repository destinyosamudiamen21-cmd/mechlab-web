import assert from "node:assert/strict";
import { test } from "node:test";
import {
  optimumPressureRatio,
  solveBrayton,
} from "../src/widgets/brayton/solver.ts";

const near = (actual: number, expected: number, tolerance = 0.001) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `expected ${expected}, got ${actual}`
  );

test("exam 2013/14 Q1(h): 293 K and 1033 K at maximum work", () => {
  const rp = optimumPressureRatio(293, 1033);
  near(rp, 9.07, 0.01);
  const result = solveBrayton({ t1: 293, t3: 1033, rp });
  near(result.efficiency, 0.4674);
  near(result.workRatio, 0.4674); // at maximum work the two are equal
  near(result.t2, result.t4, 0.01); // and T2 = T4
});

test("CA 2015/16 Q1(c): pressure ratio 8, 298 K and 1073 K", () => {
  const result = solveBrayton({ t1: 298, t3: 1073, rp: 8 });
  near(result.efficiency, 0.448);
  near(result.workRatio, 0.4969);
});

test("efficiency is net work over heat supplied", () => {
  const result = solveBrayton({ t1: 300, t3: 1200, rp: 12 });
  near(result.netWork / result.heatIn, result.efficiency, 1e-9);
  near(result.netWork / result.turbineWork, result.workRatio, 1e-9);
});

test("the optimum pressure ratio really gives the most net work", () => {
  const best = optimumPressureRatio(300, 1200);
  const at = (rp: number) => solveBrayton({ t1: 300, t3: 1200, rp }).netWork;
  assert.ok(at(best) > at(best - 0.5));
  assert.ok(at(best) > at(best + 0.5));
});
