// Air-standard Otto and Diesel cycles, per kilogram of air.
// State 1: start of compression. 2: end of compression. 3: end of heat addition. 4: end of expansion.

export type CycleKind = "otto" | "diesel";

export type EngineInput = {
  kind: CycleKind;
  r: number; // compression ratio, V1 / V2
  p1: number; // kPa
  t1: number; // K
  t3: number; // K, peak temperature (Otto: sets the heat added)
  cutoff: number; // Diesel cut-off ratio, V3 / V2
};

export type State = { p: number; v: number; t: number }; // kPa, m³/kg, K

export type EngineResult = {
  states: [State, State, State, State];
  heatIn: number; // kJ/kg
  heatOut: number; // kJ/kg
  work: number; // kJ/kg, net work per cycle
  efficiency: number; // 0 to 1
  mep: number; // kPa
  clearancePercent: number; // clearance volume as % of swept volume
};

// Air, treated as a perfect gas.
export const GAMMA = 1.4;
export const CP = 1.005; // kJ/kg K
export const CV = 0.718; // kJ/kg K
export const R_AIR = 0.287; // kJ/kg K

export function solveEngine({
  kind,
  r,
  p1,
  t1,
  t3,
  cutoff,
}: EngineInput): EngineResult {
  const v1 = (R_AIR * t1) / p1;
  const v2 = v1 / r;

  // 1 to 2: isentropic compression.
  const t2 = t1 * r ** (GAMMA - 1);
  const p2 = p1 * r ** GAMMA;

  // 2 to 3: heat addition. Otto at constant volume, Diesel at constant pressure.
  const state3: State =
    kind === "otto"
      ? { v: v2, t: t3, p: (p2 * t3) / t2 }
      : { v: v2 * cutoff, t: t2 * cutoff, p: p2 };

  // 3 to 4: isentropic expansion back to the starting volume.
  const t4 = state3.t * (state3.v / v1) ** (GAMMA - 1);
  const p4 = (p1 * t4) / t1;

  const heatIn = kind === "otto" ? CV * (state3.t - t2) : CP * (state3.t - t2);
  const heatOut = CV * (t4 - t1); // 4 to 1 is at constant volume in both cycles
  const work = heatIn - heatOut;

  return {
    states: [
      { p: p1, v: v1, t: t1 },
      { p: p2, v: v2, t: t2 },
      state3,
      { p: p4, v: v1, t: t4 },
    ],
    heatIn,
    heatOut,
    work,
    efficiency: work / heatIn,
    mep: work / (v1 - v2),
    clearancePercent: 100 / (r - 1),
  };
}

// Where the gas is at a point in the cycle. "position" runs from 0 to 4:
// 0 to 1 is compression, 1 to 2 heat addition, 2 to 3 expansion, 3 to 4 heat rejection.
export function stateAt(
  result: EngineResult,
  kind: CycleKind,
  position: number
): State {
  const [s1, s2, s3, s4] = result.states;
  const clamped = Math.min(4, Math.max(0, position));
  const leg = Math.min(3, Math.floor(clamped));
  const u = clamped - leg;
  const gasConstantTimesMass = (s1.p * s1.v) / s1.t; // p v / T is constant for a fixed mass

  let v: number;
  let p: number;
  if (leg === 0) {
    v = s1.v + u * (s2.v - s1.v);
    p = s1.p * (s1.v / v) ** GAMMA;
  } else if (leg === 1) {
    v = kind === "otto" ? s2.v : s2.v + u * (s3.v - s2.v);
    p = kind === "otto" ? s2.p + u * (s3.p - s2.p) : s2.p;
  } else if (leg === 2) {
    v = s3.v + u * (s4.v - s3.v);
    p = s3.p * (s3.v / v) ** GAMMA;
  } else {
    v = s1.v;
    p = s4.p + u * (s1.p - s4.p);
  }
  return { p, v, t: (p * v) / gasConstantTimesMass };
}
