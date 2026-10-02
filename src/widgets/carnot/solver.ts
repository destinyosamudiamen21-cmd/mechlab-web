// The Carnot cycle on air, per kilogram: the most efficient engine possible between two temperatures.
// 1 to 2: isothermal expansion at TH (heat in).   2 to 3: adiabatic expansion, TH down to TC.
// 3 to 4: isothermal compression at TC (heat out). 4 to 1: adiabatic compression, TC back up to TH.

export const R_AIR = 0.287; // kJ/kg K
export const GAMMA = 1.4;

export type CarnotInput = {
  th: number; // K, hot reservoir
  tc: number; // K, cold reservoir
  ratio: number; // volume ratio of the isothermal expansion, v2 / v1
  p1: number; // kPa, the highest pressure in the cycle
};

export type State = { p: number; v: number; t: number }; // kPa, m³/kg, K

export type CarnotResult = {
  states: [State, State, State, State];
  heatIn: number; // kJ/kg
  heatOut: number; // kJ/kg
  work: number; // kJ/kg
  efficiency: number; // 0 to 1
  entropyChange: number; // kJ/kg K, taken in at TH and given out at TC
};

export function solveCarnot({ th, tc, ratio, p1 }: CarnotInput): CarnotResult {
  const state = (v: number, t: number): State => ({ v, t, p: (R_AIR * t) / v });
  const v1 = (R_AIR * th) / p1;
  const v2 = v1 * ratio;
  // On an adiabatic line T v^(γ−1) stays constant, so cooling from TH to TC stretches the volume by this factor.
  const stretch = (th / tc) ** (1 / (GAMMA - 1));
  const heatIn = R_AIR * th * Math.log(ratio);
  const heatOut = R_AIR * tc * Math.log(ratio);
  return {
    states: [
      state(v1, th),
      state(v2, th),
      state(v2 * stretch, tc),
      state(v1 * stretch, tc),
    ],
    heatIn,
    heatOut,
    work: heatIn - heatOut,
    efficiency: 1 - tc / th,
    entropyChange: R_AIR * Math.log(ratio),
  };
}
