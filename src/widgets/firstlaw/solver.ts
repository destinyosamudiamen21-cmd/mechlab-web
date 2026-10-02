// First law for a closed system, process by process: Q = ΔU + W.
// A cycle is a list of "legs", each joining two states on the p-V diagram.
// Units: kPa and m³, so W, Q and ΔU come out in kJ.

export type LegKind =
  | "linear"
  | "constantPressure"
  | "constantVolume"
  | "hyperbolic"
  | "polytropic";
export type Point = { p: number; v: number };
export type Leg = { kind: LegKind; from: Point; to: Point };

// The index n in pVⁿ = C that joins the two end states.
export function polytropicIndex(from: Point, to: Point): number {
  return Math.log(from.p / to.p) / Math.log(to.v / from.v);
}

// Work done BY the gas along one leg (negative means work is done ON the gas).
export function legWork({ kind, from, to }: Leg): number {
  switch (kind) {
    case "linear":
      return ((from.p + to.p) / 2) * (to.v - from.v);
    case "constantPressure":
      return from.p * (to.v - from.v);
    case "constantVolume":
      return 0;
    case "hyperbolic":
      return from.p * from.v * Math.log(to.v / from.v);
    case "polytropic":
      return (from.p * from.v - to.p * to.v) / (polytropicIndex(from, to) - 1);
  }
}

// Perfect gas: U = pV / (γ − 1), so ΔU depends only on the end states.
export function legDeltaU({ from, to }: Leg, gamma: number): number {
  return (to.p * to.v - from.p * from.v) / (gamma - 1);
}

export function legHeat(leg: Leg, gamma: number): number {
  return legDeltaU(leg, gamma) + legWork(leg);
}

// The state part-way along a leg: u = 0 is the start, u = 1 the end.
export function pointOnLeg({ kind, from, to }: Leg, u: number): Point {
  if (kind === "constantVolume")
    return { v: from.v, p: from.p + u * (to.p - from.p) };
  const v = from.v + u * (to.v - from.v);
  if (kind === "hyperbolic") return { v, p: (from.p * from.v) / v };
  if (kind === "polytropic")
    return { v, p: from.p * (from.v / v) ** polytropicIndex(from, to) };
  return { v, p: from.p + u * (to.p - from.p) }; // linear, and constant pressure as a special case
}

export function cycleTotals(
  legs: Leg[],
  gamma: number
): { work: number; heat: number; deltaU: number } {
  return legs.reduce(
    (total, leg) => ({
      work: total.work + legWork(leg),
      heat: total.heat + legHeat(leg, gamma),
      deltaU: total.deltaU + legDeltaU(leg, gamma),
    }),
    { work: 0, heat: 0, deltaU: 0 }
  );
}
