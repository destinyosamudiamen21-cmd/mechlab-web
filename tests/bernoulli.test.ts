import assert from "node:assert/strict";
import { test } from "node:test";
import { solvePipe } from "../src/widgets/bernoulli/solver.ts";

const near = (actual: number, expected: number, tolerance = 0.01) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `expected ${expected}, got ${actual}`
  );

test("halving the diameter makes the water four times faster", () => {
  const { two, flow } = solvePipe({
    d1: 0.2,
    d2: 0.1,
    v1: 2,
    p1: 150,
    z1: 0,
    z2: 0,
  });
  near(two.v, 8);
  near(flow, 0.0628, 0.0001); // π/4 × 0.2² × 2
});

test("level pipe: pressure drops by ρ(v₂² − v₁²)/2 = 30 kPa", () => {
  const { two } = solvePipe({ d1: 0.2, d2: 0.1, v1: 2, p1: 150, z1: 0, z2: 0 });
  near(two.p, 120);
});

test("same diameter, rising 2 m: pressure drops by ρg × 2 = 19.62 kPa", () => {
  const { two } = solvePipe({ d1: 0.2, d2: 0.2, v1: 2, p1: 150, z1: 0, z2: 2 });
  near(two.v, 2);
  near(two.p, 150 - 19.62);
});

test("total head is the same at both sections", () => {
  const { one, two, totalHead } = solvePipe({
    d1: 0.25,
    d2: 0.12,
    v1: 1.5,
    p1: 120,
    z1: 0,
    z2: 1.5,
  });
  near(one.pressureHead + one.velocityHead + one.elevation, totalHead, 1e-9);
  near(two.pressureHead + two.velocityHead + two.elevation, totalHead, 1e-9);
});
