import assert from "node:assert/strict";
import { test } from "node:test";
import {
  VOLUME_FRACTION,
  rootDepth,
  surfaceStress,
  volume,
} from "../src/widgets/uniform/solver.ts";

const near = (actual: number, expected: number, tolerance = 0.01) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `expected ${expected}, got ${actual}`
  );

const beam = { p: 2, length: 1, b: 60, sigma: 120 };

test("depth at the wall: h = √(6PL / bσ)", () => {
  near(rootDepth(beam), 40.82);
});

test("constant section: stress grows in a straight line, half the limit at mid-length", () => {
  near(surfaceStress("prismatic", beam, 1), 120);
  near(surfaceStress("prismatic", beam, 0.5), 60);
  near(surfaceStress("prismatic", beam, 0), 0);
});

test("shaped beams: the stress is the limit at every position", () => {
  for (const x of [0.1, 0.35, 0.5, 0.8, 1]) {
    near(surfaceStress("depth", beam, x), 120);
    near(surfaceStress("width", beam, x), 120);
  }
});

test("material used: two thirds (parabolic depth) and one half (triangular width)", () => {
  const full = volume("prismatic", beam);
  near(volume("depth", beam) / full, VOLUME_FRACTION.depth, 0.001);
  near(volume("width", beam) / full, VOLUME_FRACTION.width, 0.001);
});
