import assert from "node:assert/strict";
import { test } from "node:test";
import { pressureAt, workTo } from "../src/widgets/piston/solver.ts";
import type { PistonInput } from "../src/widgets/piston/solver.ts";

const close = (actual: number, expected: number, tolerance = 0.005) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `expected ${expected}, got ${actual}`
  );

// MEE 351 Examination 2014/2015, Question 4: fluid at 9 bar, initial volume 50 dm³.
const exam: PistonInput = {
  process: "constant",
  p1: 900,
  v1: 0.05,
  v2: 0.2,
  p2: 200,
  n: 1.4,
};

test("exam 2014/15 Q4(a): constant pressure to 0.2 m³ gives 135 kJ", () => {
  close(workTo(exam, 0.2), 135);
});

test("exam 2014/15 Q4(b): linear law to 0.2 m³ and 2 bar gives 82.5 kJ", () => {
  const input: PistonInput = { ...exam, process: "linear" };
  close(pressureAt(input, 0.2), 200);
  close(workTo(input, 0.2), 82.5);
});

test("exam 2014/15 Q4(c): pV = constant to 90 dm³ gives 26.45 kJ", () => {
  const input: PistonInput = { ...exam, process: "hyperbolic", v2: 0.09 };
  close(pressureAt(input, 0.09), 500);
  close(workTo(input, 0.09), 26.45);
});

test("pVⁿ = C with n = 3, doubling the volume", () => {
  const input: PistonInput = { ...exam, process: "polytropic", v2: 0.1, n: 3 };
  close(pressureAt(input, 0.1), 112.5);
  close(workTo(input, 0.1), 16.875);
});

test("pVⁿ = C with n = 1 matches pV = C", () => {
  const poly: PistonInput = { ...exam, process: "polytropic", n: 1 };
  const hyper: PistonInput = { ...exam, process: "hyperbolic" };
  close(workTo(poly, 0.2), workTo(hyper, 0.2));
});

test("no work has been done before the piston moves", () => {
  for (const process of [
    "constant",
    "linear",
    "hyperbolic",
    "polytropic",
  ] as const) {
    close(workTo({ ...exam, process }, 0.05), 0);
  }
});

test("between the same two volumes, constant pressure does the most work", () => {
  const constant = workTo(exam, 0.2);
  const linear = workTo({ ...exam, process: "linear" }, 0.2);
  const hyperbolic = workTo({ ...exam, process: "hyperbolic" }, 0.2);
  assert.ok(constant > linear && linear > hyperbolic);
});

test("a linear law with no travel does not divide by zero", () => {
  const input: PistonInput = { ...exam, process: "linear", v2: 0.05 };
  close(pressureAt(input, 0.05), 900);
  close(workTo(input, 0.05), 0);
});
