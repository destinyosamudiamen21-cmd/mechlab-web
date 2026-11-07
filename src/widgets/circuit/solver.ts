// A battery with internal resistance driving two resistors, either in series
// or in parallel.

export type Battery = { emf: number; internal: number }; // V, Ω
export type Layout = "series" | "parallel";

export function combined(r1: number, r2: number, layout: Layout): number {
  return layout === "series" ? r1 + r2 : (r1 * r2) / (r1 + r2);
}

export function solveCircuit(battery: Battery, r1: number, r2: number, layout: Layout) {
  const external = combined(r1, r2, layout);
  const current = battery.emf / (external + battery.internal); // I = ε / (R + r)
  const terminal = current * external; // V = ε − I r
  const lost = current * battery.internal;
  let i1: number;
  let i2: number;
  let v1: number;
  let v2: number;
  if (layout === "series") {
    i1 = i2 = current;
    v1 = current * r1;
    v2 = current * r2;
  } else {
    v1 = v2 = terminal;
    i1 = terminal / r1;
    i2 = terminal / r2;
  }
  return {
    external,
    current,
    terminal,
    lost,
    i1,
    i2,
    v1,
    v2,
    p1: i1 * v1,
    p2: i2 * v2,
    pInternal: current * lost,
    pTotal: battery.emf * current,
  };
}
