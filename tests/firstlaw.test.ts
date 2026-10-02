import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cycleTotals,
  legWork,
  pointOnLeg,
  polytropicIndex,
} from "../src/widgets/firstlaw/solver.ts";
import type { Leg, Point } from "../src/widgets/firstlaw/solver.ts";

const near = (actual: number, expected: number, percent = 0.2) =>
  assert.ok(
    Math.abs(actual - expected) <= (percent / 100) * Math.abs(expected) + 1e-9,
    `expected ${expected}, got ${actual}`
  );

// MEE 351 Examination 2013/2014, Question 4.
const a1: Point = { p: 600, v: 0.02 };
const a2: Point = { p: 200, v: 0.08 };
const a3: Point = { p: 200, v: (600 * 0.02) / 200 };
const examCycle: Leg[] = [
  { kind: "linear", from: a1, to: a2 },
  { kind: "constantPressure", from: a2, to: a3 },
  { kind: "hyperbolic", from: a3, to: a1 },
];

test("exam 2013/14 Q4: work in each process", () => {
  near(legWork(examCycle[0]), 24);
  near(legWork(examCycle[1]), -4);
  near(legWork(examCycle[2]), -13.18);
});

test("exam 2013/14 Q4: net work 6.817 kJ equals net heat, and ΔU round the cycle is zero", () => {
  const totals = cycleTotals(examCycle, 1.4);
  near(totals.work, 6.817);
  near(totals.heat, 6.817);
  assert.ok(Math.abs(totals.deltaU) < 1e-9);
});

// MEE 351 Test 2014/2015, Question 2(b).
const b1: Point = { p: 1500, v: 0.15 };
const b2: Point = { p: 375, v: 0.6 };
const b3: Point = { p: (375 * 290) / 550, v: 0.6 };
const testCycle: Leg[] = [
  { kind: "hyperbolic", from: b1, to: b2 },
  { kind: "constantVolume", from: b2, to: b3 },
  { kind: "polytropic", from: b3, to: b1 },
];

test("test 2014/15 Q2(b): isothermal 311.9 kJ, polytropic index 1.462, net 81.54 kJ", () => {
  near(legWork(testCycle[0]), 311.9);
  near(polytropicIndex(b3, b1), 1.462);
  near(legWork(testCycle[2]), -230.4);
  near(cycleTotals(testCycle, 1.4).work, 81.54);
  near(cycleTotals(testCycle, 1.4).heat, 81.54);
});

test("net heat equals net work whatever γ is", () => {
  near(cycleTotals(examCycle, 1.3).heat, cycleTotals(examCycle, 1.67).heat);
});

test("every leg starts and ends on its own two states", () => {
  for (const leg of [...examCycle, ...testCycle]) {
    near(pointOnLeg(leg, 0).p, leg.from.p);
    near(pointOnLeg(leg, 1).p, leg.to.p);
    near(pointOnLeg(leg, 1).v, leg.to.v);
  }
});
