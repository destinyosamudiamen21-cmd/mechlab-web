import assert from "node:assert/strict";
import { test } from "node:test";
import {
  elasticConstants,
  principalStresses,
  solveStrain,
} from "../src/widgets/strain/solver.ts";

const near = (actual: number, expected: number, tolerance = 0.01) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `expected ${expected}, got ${actual}`
  );

test("hand check: εx 400, εy −200, γxy 600 microstrain", () => {
  const result = solveStrain({ ex: 400, ey: -200, gxy: 600 });
  near(result.centre, 100);
  near(result.radius, 424.26);
  near(result.e1, 524.26);
  near(result.e2, -324.26);
  near(result.gammaMax, 848.53);
  near(result.thetaP, 22.5);
});

test("no shear strain: the given strains are already the principal strains", () => {
  const result = solveStrain({ ex: 300, ey: 100, gxy: 0 });
  near(result.e1, 300);
  near(result.e2, 100);
  near(result.thetaP, 0);
});

test("the sum of the two direct strains never changes", () => {
  const result = solveStrain({ ex: 250, ey: -80, gxy: 310 });
  near(result.e1 + result.e2, 250 - 80);
});

test("E 200 GPa, ν 0.3 gives G 76.92 and K 166.67 GPa", () => {
  const { g, k } = elasticConstants(200, 0.3);
  near(g, 76.92);
  near(k, 166.67);
  near((9 * k * g) / (3 * k + g), 200, 1e-9); // E = 9KG / (3K + G)
});

test("principal stresses from principal strains (plane stress)", () => {
  const { s1, s2 } = principalStresses(524.26, -324.26, 200, 0.3);
  near(s1, 93.84);
  near(s2, -36.7);
  // Going back: ε1 = (σ1 − ν σ2) / E.
  near(((s1 - 0.3 * s2) / 200000) * 1e6, 524.26);
});
