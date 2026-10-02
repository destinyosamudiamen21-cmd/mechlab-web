import assert from "node:assert/strict";
import { test } from "node:test";
import { solveMohr } from "../src/widgets/mohr/solver.ts";

// Engineering answers are compared to 2 decimal places, like a marking scheme.
const close = (actual: number, expected: number) =>
  assert.ok(
    Math.abs(actual - expected) < 0.005,
    `expected ${expected}, got ${actual}`
  );

test("worked example: sx = 80, sy = -40, txy = 30 MPa", () => {
  const r = solveMohr({ sx: 80, sy: -40, txy: 30, thetaDeg: 0 });
  close(r.center, 20);
  close(r.radius, 67.08);
  close(r.s1, 87.08);
  close(r.s2, -47.08);
  close(r.tauMax, 67.08);
  close(r.thetaPDeg, 13.28);
});

test("at 0 degrees the element is unchanged", () => {
  const r = solveMohr({ sx: 80, sy: -40, txy: 30, thetaDeg: 0 });
  close(r.sxT, 80);
  close(r.syT, -40);
  close(r.txyT, 30);
});

test("on the principal plane shear vanishes and sx' equals s1", () => {
  const first = solveMohr({ sx: 80, sy: -40, txy: 30, thetaDeg: 0 });
  const r = solveMohr({ sx: 80, sy: -40, txy: 30, thetaDeg: first.thetaPDeg });
  close(r.txyT, 0);
  close(r.sxT, first.s1);
  close(r.syT, first.s2);
});

test("sx' + sy' stays constant at any angle", () => {
  for (const thetaDeg of [0, 17, 45, 90, 133]) {
    const r = solveMohr({ sx: 80, sy: -40, txy: 30, thetaDeg });
    close(r.sxT + r.syT, 40);
  }
});

test("turning the element 90 degrees swaps the faces", () => {
  const r = solveMohr({ sx: 80, sy: -40, txy: 30, thetaDeg: 90 });
  close(r.sxT, -40);
  close(r.syT, 80);
  close(r.txyT, -30);
});

test("pure shear: principal stresses are plus and minus txy at 45 degrees", () => {
  const r = solveMohr({ sx: 0, sy: 0, txy: 50, thetaDeg: 0 });
  close(r.s1, 50);
  close(r.s2, -50);
  close(r.thetaPDeg, 45);
});

test("equal stresses and no shear: the circle is a point", () => {
  const r = solveMohr({ sx: 60, sy: 60, txy: 0, thetaDeg: 30 });
  close(r.radius, 0);
  close(r.sxT, 60);
  close(r.txyT, 0);
});
