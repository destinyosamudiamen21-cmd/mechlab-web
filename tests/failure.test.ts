import assert from "node:assert/strict";
import { test } from "node:test";
import {
  THEORIES,
  envelope,
  equivalentStress,
  safetyFactor,
} from "../src/widgets/failure/solver.ts";

const near = (actual: number, expected: number, tolerance = 1e-6) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `expected ${expected}, got ${actual}`
  );

const SY = 250;
const NU = 0.3;

test("simple tension at σy: every theory says the factor of safety is exactly 1", () => {
  for (const theory of THEORIES)
    near(safetyFactor(theory.id, SY, 0, SY, NU), 1);
});

test("pure shear τ (σ1 = τ, σ2 = −τ): the shear stress at yield by each theory", () => {
  // equivalent stress = factor × τ, so yield happens at τ = σy / factor
  const yieldShear = (id: Parameters<typeof equivalentStress>[0]) =>
    SY / equivalentStress(id, 1, -1, NU);
  near(yieldShear("rankine"), SY);
  near(yieldShear("stvenant"), SY / (1 + NU)); // 0.769 σy
  near(yieldShear("tresca"), SY / 2); // 0.5 σy
  near(yieldShear("haigh"), SY / Math.sqrt(2 * (1 + NU))); // 0.620 σy
  near(yieldShear("vonmises"), SY / Math.sqrt(3)); // 0.577 σy
});

test("Tresca is never less cautious than von Mises", () => {
  for (const [s1, s2] of [
    [100, 50],
    [120, -80],
    [-60, -200],
    [90, 90],
    [200, -10],
  ]) {
    assert.ok(
      safetyFactor("tresca", s1, s2, SY, NU) <=
        safetyFactor("vonmises", s1, s2, SY, NU) + 1e-12
    );
  }
});

test("every point of every outline sits exactly at yield", () => {
  for (const theory of THEORIES) {
    for (const [s1, s2] of envelope(theory.id, SY, NU))
      near(equivalentStress(theory.id, s1, s2, NU), SY, 1e-6);
  }
});

test("hand check: σ1 120, σ2 −80, σy 250", () => {
  near(safetyFactor("rankine", 120, -80, SY, NU), 250 / 120);
  near(safetyFactor("tresca", 120, -80, SY, NU), 250 / 200);
  near(
    safetyFactor("vonmises", 120, -80, SY, NU),
    250 / Math.sqrt(14400 + 9600 + 6400)
  ); // 1.434
});
