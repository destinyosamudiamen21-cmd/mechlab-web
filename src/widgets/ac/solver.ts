// A series R-L-C circuit on an AC supply v = V₀ sin(ω t).

export type Rlc = {
  r: number; // Ω
  l: number; // H
  c: number; // F
  f: number; // Hz
  vPeak: number; // V
};

export function reactances({ l, c, f }: Rlc) {
  const w = 2 * Math.PI * f;
  return { xl: w * l, xc: 1 / (w * c) };
}

export function solveRlc(circuit: Rlc) {
  const { xl, xc } = reactances(circuit);
  const x = xl - xc;
  const z = Math.hypot(circuit.r, x);
  const iPeak = circuit.vPeak / z;
  const phase = Math.atan2(x, circuit.r); // + : voltage leads current (inductive)
  return {
    xl,
    xc,
    z,
    iPeak,
    iRms: iPeak / Math.SQRT2,
    vRms: circuit.vPeak / Math.SQRT2,
    phase, // rad
    powerFactor: Math.cos(phase),
    power: (circuit.vPeak / Math.SQRT2) * (iPeak / Math.SQRT2) * Math.cos(phase),
    vr: iPeak * circuit.r,
    vl: iPeak * xl,
    vc: iPeak * xc,
  };
}

export function resonance({ l, c }: Pick<Rlc, "l" | "c">): number {
  return 1 / (2 * Math.PI * Math.sqrt(l * c));
}
