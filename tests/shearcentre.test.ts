import assert from "node:assert/strict";
import { test } from "node:test";
import { solveChannel } from "../src/widgets/shearcentre/solver.ts";

const near = (actual: number, expected: number, tolerance = 1e-6) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `expected ${expected}, got ${actual}`
  );

const channel = { b: 100, h: 200, tf: 10, tw: 10, v: 5, x: 0, length: 1 };

test("uniform thickness: e = 3b² / (h + 6b)", () => {
  near(solveChannel(channel).e, (3 * 100 * 100) / (200 + 600)); // 37.5 mm
});

test("general formula: e = 3 b² tf / (h tw + 6 b tf)", () => {
  const result = solveChannel({ ...channel, tf: 12, tw: 8 });
  near(result.e, (3 * 100 * 100 * 12) / (200 * 8 + 6 * 100 * 12));
});

test("the flange couple balances the load acting at the shear centre", () => {
  const result = solveChannel(channel);
  near(result.flangeForce * 200, 5 * result.e);
});

test("no twist when the load passes through the shear centre", () => {
  const { e } = solveChannel(channel);
  near(solveChannel({ ...channel, x: -e }).twist, 0);
});

test("load through the web: torque = V e, twist = T L / G J", () => {
  const result = solveChannel(channel);
  near(result.torque, 5 * 37.5); // 187.5 N m
  near(result.j, (200 * 1000 + 2 * 100 * 1000) / 3);
  const radians = (187.5 * 1000 * 1000) / (80000 * result.j);
  near(result.twist, (radians * 180) / Math.PI);
});

test("centroid of the channel", () => {
  near(solveChannel(channel).centroid, (100 * 100) / (200 + 200)); // 25 mm
});
