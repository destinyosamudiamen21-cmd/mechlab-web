import assert from "node:assert/strict";
import { test } from "node:test";
import { K, coulombForce, fieldAt, potentialAt } from "../src/widgets/charges/solver.ts";
import { EPS0, capacitance, charge, parallel, series, withCharge } from "../src/widgets/capacitor/solver.ts";
import { solveCircuit } from "../src/widgets/circuit/solver.ts";
import { MU0, fieldFromWire, forcePerMetre } from "../src/widgets/wires/solver.ts";
import { emf, fluxLinkage, omegaOf, peakEmf } from "../src/widgets/generator/solver.ts";
import { resonance, solveRlc } from "../src/widgets/ac/solver.ts";

const near = (actual: number, expected: number, rel = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= rel * Math.max(1, Math.abs(expected)), `expected ${expected}, got ${actual}`);

// ---------- Charges ----------
test("Coulomb force falls as 1 / r²", () => {
  near(coulombForce(1e-6, 1e-6, 1), K * 1e-12);
  near(coulombForce(1e-6, 1e-6, 2), coulombForce(1e-6, 1e-6, 1) / 4);
});

test("field halfway between equal and opposite charges points from + to −", () => {
  const charges = [{ q: 2e-6, x: -0.1, y: 0 }, { q: -2e-6, x: 0.1, y: 0 }];
  const e = fieldAt(charges, 0, 0);
  near(e.ex, (2 * K * 2e-6) / 0.01);
  near(e.ey, 0);
  near(potentialAt(charges, 0, 0), 0); // equal distances, opposite charges
});

// ---------- Capacitor ----------
test("C = k ε₀ A / d, and a dielectric multiplies it by k", () => {
  near(capacitance({ area: 0.01, gap: 0.001, k: 1 }), EPS0 * 10);
  near(capacitance({ area: 0.01, gap: 0.001, k: 4 }), 4 * EPS0 * 10);
});

test("on a battery Q grows with C; disconnected, V falls instead", () => {
  const air = { area: 0.01, gap: 0.001, k: 1 };
  const glass = { ...air, k: 5 };
  const on = charge(air, 100);
  near(charge(glass, 100).q, 5 * on.q);
  const off = withCharge(glass, on.q);
  near(off.v, 20);
  near(off.energy, on.energy / 5);
});

test("series and parallel capacitors", () => {
  near(series(2e-6, 3e-6), 1.2e-6);
  near(parallel(2e-6, 3e-6), 5e-6);
});

// ---------- DC circuit ----------
test("series: same current, voltages add up to the terminal voltage", () => {
  const s = solveCircuit({ emf: 12, internal: 1 }, 4, 7, "series");
  near(s.current, 1);
  near(s.v1 + s.v2, s.terminal);
  near(s.terminal, 11);
  near(s.pTotal, s.p1 + s.p2 + s.pInternal);
});

test("parallel: same voltage, currents add up", () => {
  const p = solveCircuit({ emf: 12, internal: 1 }, 6, 3, "parallel");
  near(p.external, 2);
  near(p.current, 4);
  near(p.i1 + p.i2, p.current);
  near(p.pTotal, p.p1 + p.p2 + p.pInternal);
});

// ---------- Wires ----------
test("B round a wire and the force between two wires", () => {
  near(fieldFromWire(10, 0.05), 4e-5);
  near(forcePerMetre(1, 1, 1), 2e-7); // the old definition of the ampere
  near(forcePerMetre(5, 5, 0.1), MU0 * 25 / (2 * Math.PI * 0.1));
});

// ---------- Generator ----------
test("emf is − d(N Φ)/dt, peaking when the flux is zero", () => {
  const coil = { turns: 100, area: 0.02, field: 0.5, rpm: 3000 };
  near(peakEmf(coil), 100 * 0.5 * 0.02 * omegaOf(3000));
  near(emf(coil, Math.PI / 2), peakEmf(coil));
  near(fluxLinkage(coil, Math.PI / 2), 0, 1e-9);
  // numerical derivative check at an odd angle
  const w = omegaOf(coil.rpm);
  const theta = 0.7;
  const dt = 1e-7;
  const numeric = -(fluxLinkage(coil, theta + w * dt) - fluxLinkage(coil, theta - w * dt)) / (2 * dt);
  near(numeric, emf(coil, theta), 1e-5);
});

// ---------- AC ----------
test("at resonance X_L = X_C, Z = R and the phase is zero", () => {
  const l = 0.1;
  const c = 10e-6;
  const f0 = resonance({ l, c });
  const s = solveRlc({ r: 20, l, c, f: f0, vPeak: 10 });
  near(s.xl, s.xc);
  near(s.z, 20);
  near(s.phase, 0, 1e-9);
  near(s.power, (10 / Math.SQRT2) ** 2 / 20);
});

test("inductive above resonance, capacitive below", () => {
  const base = { r: 20, l: 0.1, c: 10e-6, vPeak: 10 };
  assert.ok(solveRlc({ ...base, f: 400 }).phase > 0);
  assert.ok(solveRlc({ ...base, f: 50 }).phase < 0);
});
