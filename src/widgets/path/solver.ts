// A fixed mass of perfect gas taken from state 1 to state 2 along three different paths.
// Units: kPa and m³, so work and heat come out in kJ.

export type PathId = "A" | "B" | "C";

export type PathInput = {
  p1: number; // kPa
  v1: number; // m³
  p2: number; // kPa
  v2: number; // m³
  gamma: number; // ratio of specific heats
};

// Internal energy is a property: its change depends only on the two end states.
// For a perfect gas, U = pV / (γ − 1), so ΔU = (p₂V₂ − p₁V₁) / (γ − 1).
export function deltaU({ p1, v1, p2, v2, gamma }: PathInput): number {
  return (p2 * v2 - p1 * v1) / (gamma - 1);
}

// Work is NOT a property: it is the area under the path actually followed.
//   A: constant pressure first (at p₁), then constant volume.
//   B: constant volume first, then constant pressure (at p₂).
//   C: a straight line from state 1 to state 2.
export function workAlong({ p1, v1, p2, v2 }: PathInput, path: PathId): number {
  const dv = v2 - v1;
  if (path === "A") return p1 * dv;
  if (path === "B") return p2 * dv;
  return ((p1 + p2) / 2) * dv;
}

// First law for a closed system: Q = ΔU + W. Different work means different heat.
export function heatAlong(input: PathInput, path: PathId): number {
  return deltaU(input) + workAlong(input, path);
}
