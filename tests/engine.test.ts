import assert from "node:assert/strict";
import { test } from "node:test";
import { solveEngine, stateAt } from "../src/widgets/engine/solver.ts";

const near = (actual: number, expected: number, percent = 0.5) =>
  assert.ok(
    Math.abs(actual - expected) <= (percent / 100) * Math.abs(expected),
    `expected ${expected} within ${percent}%, got ${actual}`
  );

// MEE 351 Examination 2013/2014, Question 6: ideal Diesel cycle.
// Bore 165 mm, stroke 270 mm, clearance 0.000434 m³, cut-off at 4.5% of the stroke, 1 bar, 27 °C.
const swept = (Math.PI / 4) * 0.165 ** 2 * 0.27;
const clearance = 0.000434;
const diesel = solveEngine({
  kind: "diesel",
  r: (swept + clearance) / clearance,
  p1: 100,
  t1: 300,
  t3: 0, // not used by the Diesel cycle
  cutoff: (clearance + 0.045 * swept) / clearance,
});

test("exam 2013/14 Q6: Diesel temperatures at the salient points", () => {
  near(diesel.states[1].t, 869.5);
  near(diesel.states[2].t, 1390);
  near(diesel.states[3].t, 578.6);
});

test("exam 2013/14 Q6: Diesel pressures", () => {
  near(diesel.states[1].p, 4145); // 41.45 bar
  near(diesel.states[2].p, 4145); // heat is added at constant pressure
  near(diesel.states[3].p, 192.9); // 1.929 bar
});

test("exam 2013/14 Q6: Diesel efficiency 61.8% and MEP 403.5 kPa", () => {
  near(diesel.efficiency, 0.6177);
  near(diesel.mep, 403.5);
});

// MEE 351 CA 2015/2016, Question 1(b): Otto cycle, 1.013 bar and 28 °C, compressed to 10 bar,
// 198 kJ added to 0.6 m³ of air.
const rOtto = (10 / 1.013) ** (1 / 1.4);
const mass = (101.3 * 0.6) / (0.287 * 301);
const t2Otto = 301 * rOtto ** 0.4;
const otto = solveEngine({
  kind: "otto",
  r: rOtto,
  p1: 101.3,
  t1: 301,
  t3: t2Otto + 198 / mass / 0.718,
  cutoff: 1,
});

test("CA 2015/16 Q1(b): Otto clearance 24.2%, efficiency 48.0%, MEP 196.8 kPa", () => {
  near(otto.clearancePercent, 24.2);
  near(otto.efficiency, 0.4801);
  near(otto.mep, 196.8);
});

test("Otto efficiency depends only on the compression ratio", () => {
  const cool = solveEngine({
    kind: "otto",
    r: 8,
    p1: 100,
    t1: 300,
    t3: 1500,
    cutoff: 1,
  });
  const hot = solveEngine({
    kind: "otto",
    r: 8,
    p1: 100,
    t1: 300,
    t3: 2400,
    cutoff: 1,
  });
  near(cool.efficiency, 1 - 1 / 8 ** 0.4, 0.01);
  near(hot.efficiency, cool.efficiency, 0.01);
  assert.ok(hot.work > cool.work); // more heat gives more work, not better efficiency
});

test("at the same compression ratio, Otto is more efficient than Diesel", () => {
  const o = solveEngine({
    kind: "otto",
    r: 14,
    p1: 100,
    t1: 300,
    t3: 2000,
    cutoff: 1,
  });
  const d = solveEngine({
    kind: "diesel",
    r: 14,
    p1: 100,
    t1: 300,
    t3: 0,
    cutoff: 2,
  });
  assert.ok(o.efficiency > d.efficiency);
});

test("energy balance: net work equals heat in minus heat out", () => {
  near(diesel.work, diesel.heatIn - diesel.heatOut, 0.001);
  near(otto.work, otto.heatIn - otto.heatOut, 0.001);
});

test("stateAt passes through the four corner states and closes the cycle", () => {
  for (const [kind, result] of [
    ["diesel", diesel],
    ["otto", otto],
  ] as const) {
    for (const corner of [0, 1, 2, 3]) {
      const s = stateAt(result, kind, corner);
      near(s.p, result.states[corner].p, 0.01);
      near(s.v, result.states[corner].v, 0.01);
      near(s.t, result.states[corner].t, 0.01);
    }
    near(stateAt(result, kind, 4).p, result.states[0].p, 0.01);
  }
});
