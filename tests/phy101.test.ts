import assert from "node:assert/strict";
import { test } from "node:test";
import { flightTime, peak, positionAt, range, velocityAt } from "../src/widgets/projectile/solver.ts";
import { solveSlope } from "../src/widgets/incline/solver.ts";
import { energyAt, heightAt, TRACK_LENGTH } from "../src/widgets/energy/solver.ts";
import { afterMove, inertia, rpm } from "../src/widgets/spin/solver.ts";
import {
  EARTH_RADIUS,
  circularPeriod,
  circularSpeed,
  escapeSpeed,
  orbitShape,
  radiusAt,
  speedAt,
} from "../src/widgets/orbit/solver.ts";

const near = (actual: number, expected: number, tolerance = 1e-6) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `expected ${expected}, got ${actual}`);

// ---------- Projectile ----------
test("from the ground, range is u² sin 2θ / g, biggest at 45°", () => {
  const at = (angle: number) => range({ speed: 20, angle, height: 0, g: 9.81 });
  near(at(45), 400 / 9.81);
  near(at(30), at(60)); // complementary angles land in the same place
  assert.ok(at(45) > at(40) && at(45) > at(50));
});

test("time of flight, peak height and landing point agree", () => {
  const launch = { speed: 20, angle: 30, height: 0, g: 9.81 };
  near(flightTime(launch), 20 / 9.81); // 2 u sin θ / g
  near(peak(launch).height, 100 / (2 * 9.81)); // (u sin θ)² / 2g
  near(positionAt(launch, flightTime(launch)).y, 0);
});

test("a ball thrown sideways lands at the same time as one dropped", () => {
  const thrown = flightTime({ speed: 15, angle: 0, height: 20, g: 9.81 });
  const dropped = flightTime({ speed: 0, angle: 0, height: 20, g: 9.81 });
  near(thrown, dropped);
  near(dropped, Math.sqrt((2 * 20) / 9.81));
});

test("the vertical velocity changes by g every second, the horizontal not at all", () => {
  const launch = { speed: 25, angle: 53, height: 2, g: 9.81 };
  const a = velocityAt(launch, 1);
  const b = velocityAt(launch, 2);
  near(a.vy - b.vy, 9.81);
  near(a.vx, b.vx);
});

// ---------- Slope ----------
test("below the critical angle the block stays still and friction equals the pull", () => {
  const r = solveSlope({ mass: 5, angle: 20, muS: 0.5, muK: 0.4, g: 9.81 });
  assert.equal(r.slides, false);
  near(r.friction, r.along);
  near(r.acceleration, 0);
  near(r.criticalAngle, (Math.atan(0.5) * 180) / Math.PI);
});

test("once sliding, a = g (sin θ − μk cos θ), whatever the mass", () => {
  const theta = (40 * Math.PI) / 180;
  const expected = 9.81 * (Math.sin(theta) - 0.3 * Math.cos(theta));
  for (const mass of [1, 10, 50]) {
    const r = solveSlope({ mass, angle: 40, muS: 0.4, muK: 0.3, g: 9.81 });
    assert.equal(r.slides, true);
    near(r.acceleration, expected);
  }
});

// ---------- Energy track ----------
test("with no resistance, speed depends only on how far it has dropped", () => {
  const track = { mass: 200, start: 20, resistance: 0, g: 9.81 };
  const state = energyAt(track, 18);
  near(state.speed, Math.sqrt(2 * 9.81 * (20 - heightAt(18, 20))), 1e-9);
  near(state.potential + state.kinetic, 200 * 9.81 * 20, 1e-6);
  // Mass cancels out
  near(energyAt({ ...track, mass: 50 }, 18).speed, state.speed, 1e-9);
});

test("energy is never created: PE + KE + lost always equals the starting PE", () => {
  const track = { mass: 300, start: 25, resistance: 400, g: 9.81 };
  for (const x of [5, 15, 25, TRACK_LENGTH]) {
    const s = energyAt(track, x);
    near(s.potential + s.kinetic + s.lost, 300 * 9.81 * 25, 1e-6);
  }
});

test("enough resistance stops the trolley before the end", () => {
  const s = energyAt({ mass: 100, start: 10, resistance: 900, g: 9.81 }, TRACK_LENGTH);
  assert.equal(s.stopped, true);
  assert.ok(s.x < TRACK_LENGTH);
});

// ---------- Spinner ----------
test("pulling the masses in keeps L and raises ω and kinetic energy", () => {
  const spinner = { platformMass: 4, platformRadius: 0.5, mass: 2 };
  const r = afterMove(spinner, 0.8, 2, 0.2);
  near(r.i0, 0.5 + 2.56);
  near(r.i1, 0.5 + 0.16);
  near(r.i1 * r.omega, r.momentum);
  assert.ok(r.omega > 2 && r.ke1 > r.ke0);
  near(r.ke1 / r.ke0, r.i0 / r.i1); // KE = L² / 2I
  near(inertia(spinner, 0), 0.5);
  near(rpm(2 * Math.PI), 60);
});

// ---------- Orbit ----------
test("low Earth orbit: about 7.7 km/s and 92 minutes at 400 km", () => {
  const r = EARTH_RADIUS + 400e3;
  near(circularSpeed(r) / 1000, 7.67, 0.01);
  near(circularPeriod(r) / 60, 92.4, 0.2);
  near(escapeSpeed(r) / circularSpeed(r), Math.SQRT2);
});

test("orbit shapes: exactly circular speed is a circle, √2 times escapes", () => {
  const r0 = EARTH_RADIUS + 1000e3;
  const circle = orbitShape(r0, 1);
  near(circle.e, 0);
  near(radiusAt(circle, 1.3), r0, 1e-3);
  assert.equal(orbitShape(r0, Math.SQRT2).escapes, true);
  const fast = orbitShape(r0, 1.2);
  near(fast.perigee, r0, 1e-3); // launched at its closest point
  near(speedAt(fast, r0), 1.2 * circularSpeed(r0), 1e-3);
  const slow = orbitShape(r0, 0.95);
  near(slow.apogee, r0, 1e-3); // launched at its furthest point
  assert.equal(orbitShape(r0, 0.7).crashes, true);
});
