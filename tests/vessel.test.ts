import assert from "node:assert/strict";
import { test } from "node:test";
import { solveVessel } from "../src/widgets/vessel/solver.ts";

const near = (actual: number, expected: number, tolerance = 0.001) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `expected ${expected}, got ${actual}`
  );

const shell = {
  kind: "cylinder" as const,
  p: 2,
  d: 1200,
  t: 12,
  e: 200,
  nu: 0.3,
};

test("cylinder: 2 MPa, 1200 mm, 12 mm gives 100 MPa hoop and 50 MPa longitudinal", () => {
  const result = solveVessel(shell);
  near(result.hoop, 100);
  near(result.longitudinal, 50);
  near(result.maxShear, 50);
  near(result.ratio, 100);
  assert.equal(result.thin, true);
});

test("a sphere of the same size carries half the cylinder's hoop stress", () => {
  const result = solveVessel({ ...shell, kind: "sphere" });
  near(result.hoop, 50);
  near(result.longitudinal, 50);
});

test("cylinder strains: εh = (σh − ν σl) / E", () => {
  const result = solveVessel(shell);
  near(result.hoopStrain, 425); // (100 − 15) / 200 000
  near(result.longitudinalStrain, 100); // (50 − 30) / 200 000
  near(result.volumeStrain, 950); // 2 εh + εl
  near(result.growth, 0.51); // 425e-6 × 1200
});

test("sphere: volumetric strain is three times the linear strain", () => {
  const result = solveVessel({ ...shell, kind: "sphere" });
  near(result.hoopStrain, 175); // 50 × (1 − 0.3) / 200 000
  near(result.volumeStrain, 525);
});

test("a thick wall is flagged", () => {
  assert.equal(solveVessel({ ...shell, t: 80 }).thin, false);
});
