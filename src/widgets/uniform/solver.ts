// A cantilever with a load at its free end, shaped so that the bending stress is the same everywhere.
// x is measured from the free end (0) to the wall (L). The bending moment there is M = P x.
// Surface stress of a rectangular section: σ = 6M / (b h²).
// P in kN, lengths along the beam in m, section sizes in mm, stress in MPa.

export type Design = "prismatic" | "depth" | "width";
export type BeamInput = { p: number; length: number; b: number; sigma: number };

// The depth needed at the wall, where the bending moment is largest.
export function rootDepth({ p, length, b, sigma }: BeamInput): number {
  return Math.sqrt((6 * p * 1000 * length * 1000) / (b * sigma));
}

export function depthAt(design: Design, input: BeamInput, x: number): number {
  const h0 = rootDepth(input);
  return design === "depth" ? h0 * Math.sqrt(x / input.length) : h0;
}

export function widthAt(design: Design, input: BeamInput, x: number): number {
  return design === "width" ? (input.b * x) / input.length : input.b;
}

export function surfaceStress(
  design: Design,
  input: BeamInput,
  x: number
): number {
  const width = widthAt(design, input, x);
  const depth = depthAt(design, input, x);
  if (width === 0 || depth === 0) return input.sigma; // at the very tip of a shaped beam the limit is σ
  return (6 * input.p * 1000 * x * 1000) / (width * depth * depth);
}

// Volume of material in mm³, by adding up thin slices.
export function volume(
  design: Design,
  input: BeamInput,
  slices = 2000
): number {
  const dx = input.length / slices;
  let total = 0;
  for (let i = 0; i < slices; i += 1) {
    const x = (i + 0.5) * dx;
    total += widthAt(design, input, x) * depthAt(design, input, x) * dx * 1000;
  }
  return total;
}

// Exact fraction of the prismatic beam's material that each design uses.
export const VOLUME_FRACTION: Record<Design, number> = {
  prismatic: 1,
  depth: 2 / 3,
  width: 1 / 2,
};
