import assert from "node:assert/strict";
import { test } from "node:test";
import { solveSpring } from "../src/widgets/spring/solver.ts";

const near = (actual: number, expected: number, tolerance = 0.01) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `expected ${expected}, got ${actual}`
  );

const spring = { w: 500, coil: 50, wire: 5, turns: 10, g: 80 };

test("hand check: 500 N, D 50, d 5, 10 coils, G 80 GPa", () => {
  const result = solveSpring(spring);
  near(result.shear, 509.3, 0.05);
  near(result.deflection, 100);
  near(result.stiffness, 5);
  near(result.energy, 25); // ½ × 500 N × 0.1 m
  near(result.torque, 12500);
});

test("the same answers from first principles: torsion of the wire", () => {
  const result = solveSpring(spring);
  const polar = (Math.PI * 5 ** 4) / 32;
  near(result.shear, (result.torque * 2.5) / polar, 1e-9); // τ = T r / J
  const twist = (result.torque * result.wireLength) / (80000 * polar); // θ = T L / G J
  near(result.deflection, twist * 25, 1e-9); // δ = θ × D / 2
});

test("wire twice as thick: sixteen times stiffer", () => {
  near(
    solveSpring({ ...spring, wire: 10 }).stiffness /
      solveSpring(spring).stiffness,
    16,
    1e-9
  );
});

test("Wahl factor for a spring index of 10", () => {
  const result = solveSpring(spring);
  near(result.index, 10);
  near(result.wahl, 1.1448, 0.0001);
});
