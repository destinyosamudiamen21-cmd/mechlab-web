import assert from "node:assert/strict";
import { test } from "node:test";
import {
  deflectionAt,
  momentAt,
  rectangleI,
  solveDeflection,
  stiffness,
} from "../src/widgets/deflection/solver.ts";
import type { BeamCase } from "../src/widgets/deflection/solver.ts";

const near = (actual: number, expected: number, tolerance = 1e-6) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `expected ${expected}, got ${actual}`
  );

const i = rectangleI(50, 100); // 4.1667e6 mm⁴
const base = { load: 10, span: 2, e: 200, i };

test("E I in kN m²", () => {
  near(stiffness(200, i), 833.333, 0.001);
});

test("simply supported, central load: P L³ / 48 E I", () => {
  near(
    solveDeflection({ ...base, kind: "ss-point" }).max,
    ((10 * 8) / (48 * 833.3333333)) * 1000,
    1e-4
  ); // 2.0 mm
});

test("cantilever, end load: P L³ / 3 E I, sixteen times the simply supported beam", () => {
  const cantilever = solveDeflection({ ...base, kind: "cant-point" }).max;
  near(cantilever, 32, 1e-4);
  near(cantilever / solveDeflection({ ...base, kind: "ss-point" }).max, 16);
});

test("the curve reaches the textbook maximum, and is zero at the supports", () => {
  for (const kind of [
    "ss-point",
    "ss-udl",
    "cant-point",
    "cant-udl",
  ] as BeamCase[]) {
    const input = { ...base, kind };
    const result = solveDeflection(input);
    near(deflectionAt(input, result.maxAt), result.max);
    near(deflectionAt(input, 0), 0);
    if (kind.startsWith("ss")) near(deflectionAt(input, 2), 0);
  }
});

test("the slope of the curve matches the slope formula", () => {
  for (const kind of [
    "ss-point",
    "ss-udl",
    "cant-point",
    "cant-udl",
  ] as BeamCase[]) {
    const input = { ...base, kind };
    const where = kind.startsWith("ss") ? 0 : 2 - 1e-6; // at a support, or at the free end
    const rise =
      (deflectionAt(input, where + 1e-6) - deflectionAt(input, where)) / 1000; // m
    near(
      (Math.atan(rise / 1e-6) * 180) / Math.PI,
      solveDeflection(input).slope,
      1e-3
    );
  }
});

test("doubling the span of a point-loaded beam gives eight times the deflection", () => {
  const short = solveDeflection({ ...base, kind: "ss-point" }).max;
  const long = solveDeflection({ ...base, kind: "ss-point", span: 4 }).max;
  near(long / short, 8);
});

test("largest bending moments", () => {
  near(solveDeflection({ ...base, kind: "ss-point" }).moment, 5); // P L / 4
  near(solveDeflection({ ...base, kind: "ss-udl" }).moment, 5); // w L² / 8
  near(solveDeflection({ ...base, kind: "cant-point" }).moment, 20); // P L
  near(solveDeflection({ ...base, kind: "cant-udl" }).moment, 20); // w L² / 2
});

test("the bending moment diagram peaks at the textbook value", () => {
  for (const kind of [
    "ss-point",
    "ss-udl",
    "cant-point",
    "cant-udl",
  ] as BeamCase[]) {
    const input = { ...base, kind };
    const peak = Math.max(
      ...Array.from({ length: 201 }, (_, index) =>
        momentAt(input, (index / 200) * 2)
      )
    );
    near(peak, solveDeflection(input).moment);
  }
});
