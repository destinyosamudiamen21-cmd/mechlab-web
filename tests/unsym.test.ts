import assert from "node:assert/strict";
import { test } from "node:test";
import { solveSkew } from "../src/widgets/unsym/solver.ts";

const near = (actual: number, expected: number, tolerance = 0.01) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `expected ${expected}, got ${actual}`
  );

test("upright load: ordinary bending, σ = 6M / bh²", () => {
  const result = solveSkew({ b: 100, h: 200, m: 10, theta: 0 });
  near(result.sigmaMax, (6 * 10e6) / (100 * 200 ** 2)); // 15 MPa
  near(result.beta, 0);
});

test("hand check: 100 × 200, 10 kN m at 30°", () => {
  const result = solveSkew({ b: 100, h: 200, m: 10, theta: 30 });
  near(result.beta, 66.59);
  near(result.sigmaMax, 27.99);
});

test("a square section: the neutral axis stays square to the load", () => {
  near(solveSkew({ b: 150, h: 150, m: 10, theta: 37 }).beta, 37);
});

test("the stress is zero along the neutral axis and opposite at opposite corners", () => {
  const result = solveSkew({ b: 100, h: 200, m: 10, theta: 30 });
  const slope = Math.tan((result.beta * Math.PI) / 180);
  near(result.stressAt(-slope * 20, 20), 0, 1e-9); // a point on the line y = −tan β × z
  near(result.stressAt(-100, -50), -result.sigmaMax, 1e-9);
});
