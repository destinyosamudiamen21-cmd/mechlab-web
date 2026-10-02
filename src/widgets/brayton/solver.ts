// The ideal gas turbine (Joule or Brayton) cycle on air, per kilogram.
// 1 to 2: isentropic compression. 2 to 3: heating at constant pressure.
// 3 to 4: isentropic expansion in the turbine. 4 to 1: cooling at constant pressure.

export const GAMMA = 1.4;
export const CP = 1.005; // kJ/kg K
const EXPONENT = (GAMMA - 1) / GAMMA; // 0.2857 for air

export type BraytonInput = {
  t1: number; // K, compressor inlet
  t3: number; // K, turbine inlet (the hottest point)
  rp: number; // pressure ratio p2 / p1
};

export type BraytonResult = {
  t2: number; // K
  t4: number; // K
  compressorWork: number; // kJ/kg
  turbineWork: number; // kJ/kg
  netWork: number; // kJ/kg
  heatIn: number; // kJ/kg
  efficiency: number; // 0 to 1
  workRatio: number; // net work / turbine work
  entropyRise: number; // kJ/kg K, s3 − s2
};

export function solveBrayton({ t1, t3, rp }: BraytonInput): BraytonResult {
  const k = rp ** EXPONENT; // the temperature ratio across the compressor and the turbine
  const t2 = t1 * k;
  const t4 = t3 / k;
  const compressorWork = CP * (t2 - t1);
  const turbineWork = CP * (t3 - t4);
  const netWork = turbineWork - compressorWork;
  const heatIn = CP * (t3 - t2);
  return {
    t2,
    t4,
    compressorWork,
    turbineWork,
    netWork,
    heatIn,
    efficiency: 1 - 1 / k,
    workRatio: 1 - (t1 / t3) * k,
    entropyRise: CP * Math.log(t3 / t2),
  };
}

// The pressure ratio that gives the most net work between two fixed temperatures.
// It is the one that makes T2 = T4 = √(T1 T3).
export function optimumPressureRatio(t1: number, t3: number): number {
  return (t3 / t1) ** (GAMMA / (2 * (GAMMA - 1)));
}
