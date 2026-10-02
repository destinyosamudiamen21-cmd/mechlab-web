import assert from "node:assert/strict";
import { test } from "node:test";
import {
  flangeFlow,
  solveShearFlow,
  webFlow,
} from "../src/widgets/shearflow/solver.ts";

const near = (actual: number, expected: number, tolerance = 1e-6) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `expected ${expected}, got ${actual}`
  );

const beam = { v: 60, b: 150, h: 280, tf: 15, tw: 8 };

test("the flow in the web adds up to exactly V", () => {
  near(solveShearFlow(beam).webForce, 60);
});

test("two flange flows merge at the top of the web", () => {
  const result = solveShearFlow(beam);
  near(result.webTop, 2 * result.flangeJunction);
});

test("flange flow is zero at the tip and grows in a straight line", () => {
  near(flangeFlow(beam, 0), 0);
  near(flangeFlow(beam, 75), 2 * flangeFlow(beam, 37.5));
});

test("the web flow is largest at the neutral axis and the same above and below", () => {
  assert.ok(webFlow(beam, 0) > webFlow(beam, 100));
  near(webFlow(beam, 70), webFlow(beam, -70));
});

test("hand check: V 60 kN, 150 × 280, flanges 15, web 8", () => {
  const result = solveShearFlow(beam);
  near(result.i, (8 * 280 ** 3) / 12 + 2 * 150 * 15 * 140 ** 2); // 102.83e6 mm⁴
  near(result.flangeJunction, (60000 * 15 * 75 * 140) / result.i);
});
