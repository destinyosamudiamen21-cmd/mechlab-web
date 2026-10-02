import assert from "node:assert/strict";
import { test } from "node:test";
import {
  H_F,
  H_FG,
  Q_TO_BOIL,
  Q_TO_DRY,
  V_F,
  V_G,
  stateAfter,
} from "../src/widgets/phase/solver.ts";

const close = (actual: number, expected: number, tolerance = 0.01) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `expected ${expected}, got ${actual}`
  );

test("liquid warms up at 4.18 kJ per kg per degree until it reaches 100 °C", () => {
  close(stateAfter(0).t, 20);
  close(stateAfter(4.18 * 40).t, 60);
  close(Q_TO_BOIL, 334.4);
  assert.equal(stateAfter(100).phase, "liquid");
});

test("the temperature does not change while it boils", () => {
  for (const heat of [Q_TO_BOIL, Q_TO_BOIL + 500, Q_TO_BOIL + 2000, Q_TO_DRY]) {
    close(stateAfter(heat).t, 100);
    assert.equal(stateAfter(heat).phase, "wet");
  }
});

test("dryness fraction: v = vf + x(vg − vf) and h = hf + x hfg", () => {
  const half = stateAfter(Q_TO_BOIL + H_FG / 2);
  close(half.x ?? -1, 0.5);
  close(half.v, V_F + 0.5 * (V_G - V_F), 1e-6);
  const ninety = stateAfter(Q_TO_BOIL + 0.9 * H_FG);
  close(ninety.h, H_F + 0.9 * H_FG); // 2450.3 kJ/kg
  close(stateAfter(Q_TO_DRY).v, V_G, 1e-6);
});

test("beyond dry saturated the steam superheats", () => {
  const state = stateAfter(Q_TO_DRY + 200);
  assert.equal(state.phase, "superheated");
  close(state.t, 200);
  assert.ok(state.v > V_G);
  assert.equal(state.x, null);
});
