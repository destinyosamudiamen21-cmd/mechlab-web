// A flitched beam: a timber core with a steel plate fixed to its top and bottom faces.
// Method: the transformed section. Replace each steel plate with timber n times as wide
// (n = E steel / E timber), then treat the whole thing as one timber beam.
// Lengths in mm, bending moment in kN m, stress in MPa.

export type FlitchedInput = {
  b: number; // width of the timber and of the plates
  d: number; // depth of the timber
  t: number; // thickness of each steel plate
  n: number; // modular ratio, E steel / E timber
  m: number; // bending moment
};

export type FlitchedResult = {
  i: number; // mm⁴, second moment of the transformed (all-timber) section
  timberMax: number; // MPa, in the timber at the joint (its outer face)
  steelJoint: number; // MPa, in the steel at the same joint
  steelMax: number; // MPa, at the outer face of the plate
  timberMoment: number; // kN m carried by the timber
  steelMoment: number; // kN m carried by the two plates
};

export function solveFlitched({
  b,
  d,
  t,
  n,
  m,
}: FlitchedInput): FlitchedResult {
  const timberI = (b * d ** 3) / 12;
  // One plate about the neutral axis: its own I plus area × distance² (parallel axis theorem).
  const plateI = (b * t ** 3) / 12 + b * t * (d / 2 + t / 2) ** 2;
  const i = timberI + 2 * n * plateI;
  const moment = m * 1e6; // N mm
  const timberMax = (moment * (d / 2)) / i;
  return {
    i,
    timberMax,
    steelJoint: n * timberMax,
    steelMax: (n * moment * (d / 2 + t)) / i,
    timberMoment: (m * timberI) / i,
    steelMoment: (m * 2 * n * plateI) / i,
  };
}
