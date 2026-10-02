import assert from "node:assert/strict";
import { test } from "node:test";
import {
  heatSupplied,
  kinetic,
  nozzleExitVelocity,
  pipeArea,
  shaftWork,
} from "../src/widgets/sfee/solver.ts";

const near = (actual: number, expected: number, percent = 0.3) =>
  assert.ok(
    Math.abs(actual - expected) <= (percent / 100) * Math.abs(expected) + 1e-9,
    `expected ${expected}, got ${actual}`
  );

// MEE 351 Examination 2013/2014, Question 5(a): air compressor, 0.6 kg/s.
test("exam 2013/14 Q5(a): compressor needs 79.4 kW", () => {
  const h1 = 100 + 200 * 0.85; // u + pv = 270 kJ/kg
  const h2 = 200 + 700 * 0.17; // 319 kJ/kg
  const w = shaftWork({ h1, h2, c1: 6, c2: 4.5, q: -50 / 0.6 });
  near(w, -132.33); // negative: work is put in
  near(0.6 * -w, 79.4);
});

test("exam 2013/14 Q5(a): pipe areas 0.085 m² and 0.0227 m²", () => {
  near(pipeArea(0.6, 0.85, 6), 0.085);
  near(pipeArea(0.6, 0.17, 4.5), 0.0227);
});

// MEE 351 Examination 2013/2014, Question 5(b): isentropic air turbine, 0.1 kg/s.
test("exam 2013/14 Q5(b): turbine inlet 423.5 K and power 13.92 kW", () => {
  const t1 = 285 * 4 ** (0.4 / 1.4);
  near(t1, 423.5);
  const w = shaftWork({ h1: 1.005 * t1, h2: 1.005 * 285, c1: 0, c2: 0, q: 0 });
  near(0.1 * w, 13.92);
});

test("kinetic energy needs the factor of 1000", () => {
  near(kinetic(6), 0.018); // 18 J/kg = 0.018 kJ/kg
});

test("nozzle: a 50 kJ/kg enthalpy drop from rest gives 316 m/s", () => {
  near(nozzleExitVelocity(3000, 2950, 0), 316.2);
  // and the general equation agrees that no work is done
  near(
    shaftWork({
      h1: 3000,
      h2: 2950,
      c1: 0,
      c2: nozzleExitVelocity(3000, 2950, 0),
      q: 0,
    }) + 1,
    1
  );
});

test("heater: heat supplied equals the enthalpy rise when velocities match", () => {
  near(heatSupplied(200, 2800, 10, 10), 2600);
});
