import assert from "node:assert/strict";
import { test } from "node:test";
import {
  area,
  profile,
  secondMoment,
  shearStress,
  webShare,
} from "../src/widgets/shear/solver.ts";
import type { Section } from "../src/widgets/shear/solver.ts";

const near = (actual: number, expected: number, tolerance = 0.001) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `expected ${expected}, got ${actual}`
  );

const rectangle: Section = { kind: "rectangle", b: 100, h: 200 };
const iBeam: Section = { kind: "i", b: 150, h: 300, tf: 20, tw: 10 };

test("rectangle: maximum is 1.5 times the average, at the neutral axis", () => {
  near(shearStress(rectangle, 50, 0), 3.75); // 1.5 × 50 000 / 20 000
  near(shearStress(rectangle, 50, 0) / ((50 * 1000) / area(rectangle)), 1.5);
});

test("rectangle: parabolic, zero at the top and bottom", () => {
  near(shearStress(rectangle, 50, 100), 0);
  near(shearStress(rectangle, 50, -100), 0);
  near(shearStress(rectangle, 50, 50), 3.75 * 0.75); // 1 − (y / (h/2))² = 0.75 at quarter depth
});

test("I-section: second moment of area", () => {
  near(secondMoment(iBeam), (150 * 300 ** 3 - 140 * 260 ** 3) / 12, 1);
});

test("I-section: the stress jumps by the ratio of the widths at the joint", () => {
  const inFlange = shearStress(iBeam, 100, 130, 150);
  const inWeb = shearStress(iBeam, 100, 130, 10);
  near(inWeb / inFlange, 15);
});

test("adding up τ × area over the whole section gives back V", () => {
  for (const section of [rectangle, iBeam]) {
    const points = profile(section, 80, 400);
    let force = 0;
    for (let i = 1; i < points.length; i += 1) {
      const [y0, t0] = points[i - 1];
      const [y1, t1] = points[i];
      if (y0 === y1) continue; // the jump at a joint has no height
      const width =
        section.kind === "rectangle"
          ? section.b
          : Math.abs((y0 + y1) / 2) > 130
          ? section.b
          : section.tw;
      force += ((t0 + t1) / 2) * width * (y0 - y1);
    }
    near(force / 1000, 80, 0.05);
  }
});

test("the web of an I-section carries nearly all the shear", () => {
  const share = webShare(iBeam);
  assert.ok(share > 0.9 && share < 1, `web share ${share}`);
});
