import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AIR_TANK,
  classify,
  valueInPart,
} from "../src/widgets/systems/solver.ts";

test("what crosses the boundary decides the kind of system", () => {
  assert.equal(classify(false, true), "closed"); // piston-cylinder: heat and work, no mass
  assert.equal(classify(true, true), "open"); // turbine
  assert.equal(classify(true, false), "open"); // mass crossing always means open
  assert.equal(classify(false, false), "isolated");
});

test("extensive properties divide, intensive properties do not", () => {
  const find = (symbol: string) =>
    AIR_TANK.find((row) => row.symbol === symbol)!;
  assert.equal(valueInPart(find("m"), 2), 1);
  assert.equal(valueInPart(find("T"), 2), 300);
  assert.equal(valueInPart(find("p"), 4), 200);
  assert.ok(Math.abs(valueInPart(find("V"), 4) - 0.21525) < 1e-9);
});

test("the tank data is self-consistent: perfect gas, R = 0.287, cv = 0.718", () => {
  const value = (symbol: string) =>
    AIR_TANK.find((row) => row.symbol === symbol)!.whole;
  assert.ok(
    Math.abs(value("V") - (value("m") * 0.287 * value("T")) / value("p")) <
      0.001
  );
  assert.ok(Math.abs(value("U") - value("m") * 0.718 * value("T")) < 0.1);
  assert.ok(Math.abs(value("ρ") - value("m") / value("V")) < 0.001);
  assert.ok(Math.abs(value("v") - value("V") / value("m")) < 0.0001);
  // A ratio of two extensive properties is intensive: specific volume is the same in every part.
  assert.ok(
    Math.abs(
      valueInPart(AIR_TANK[1], 4) / valueInPart(AIR_TANK[0], 4) - value("v")
    ) < 0.0001
  );
});
