// Deflection of four standard beams, from the bending equation E I y'' = M.
// x runs from the left end (the wall, for a cantilever). Deflection is positive downwards.
// Load: kN for a point load, kN/m for a spread (uniformly distributed) load.
// Span in m, E in GPa, I in mm⁴. Deflection comes out in mm, slope in degrees, moment in kN m.

export type BeamCase = "ss-point" | "ss-udl" | "cant-point" | "cant-udl";

export type DeflectionInput = {
  kind: BeamCase;
  load: number;
  span: number;
  e: number;
  i: number;
};

// E I in kN m²:  (GPa × 10⁶ kN/m²) × (mm⁴ × 10⁻¹² m⁴).
export const stiffness = (e: number, i: number) => e * i * 1e-6;

export const rectangleI = (b: number, h: number) => (b * h ** 3) / 12;

// Deflection in mm at position x.
export function deflectionAt(
  { kind, load, span: L, e, i }: DeflectionInput,
  x: number
): number {
  const ei = stiffness(e, i);
  let metres: number;
  if (kind === "ss-point") {
    const a = x <= L / 2 ? x : L - x; // the curve is the same from either support
    metres = (load * a * (3 * L * L - 4 * a * a)) / (48 * ei);
  } else if (kind === "ss-udl") {
    metres = (load * x * (L ** 3 - 2 * L * x * x + x ** 3)) / (24 * ei);
  } else if (kind === "cant-point") {
    metres = (load * x * x * (3 * L - x)) / (6 * ei);
  } else {
    metres = (load * x * x * (6 * L * L - 4 * L * x + x * x)) / (24 * ei);
  }
  return metres * 1000;
}

// Size of the bending moment in kN m at position x (sagging for the supported beams, hogging for the cantilevers).
export function momentAt(
  { kind, load, span: L }: DeflectionInput,
  x: number
): number {
  if (kind === "ss-point") return (load * Math.min(x, L - x)) / 2;
  if (kind === "ss-udl") return (load * x * (L - x)) / 2;
  if (kind === "cant-point") return load * (L - x);
  return (load * (L - x) ** 2) / 2;
}

export type DeflectionResult = {
  max: number; // mm
  maxAt: number; // m from the left end
  slope: number; // degrees, the largest slope (at a support, or at the free end)
  moment: number; // kN m, the largest bending moment
  formula: string; // the textbook result for the largest deflection
  coefficient: number; // the number in that formula, as a decimal
};

export function solveDeflection(input: DeflectionInput): DeflectionResult {
  const { kind, load, span: L, e, i } = input;
  const ei = stiffness(e, i);
  const table = {
    "ss-point": {
      coefficient: 1 / 48,
      power: 3,
      slope: 1 / 16,
      moment: (load * L) / 4,
      at: L / 2,
      formula: "P L³ / 48 E I",
    },
    "ss-udl": {
      coefficient: 5 / 384,
      power: 4,
      slope: 1 / 24,
      moment: (load * L * L) / 8,
      at: L / 2,
      formula: "5 w L⁴ / 384 E I",
    },
    "cant-point": {
      coefficient: 1 / 3,
      power: 3,
      slope: 1 / 2,
      moment: load * L,
      at: L,
      formula: "P L³ / 3 E I",
    },
    "cant-udl": {
      coefficient: 1 / 8,
      power: 4,
      slope: 1 / 6,
      moment: (load * L * L) / 2,
      at: L,
      formula: "w L⁴ / 8 E I",
    },
  }[kind];
  return {
    max: ((table.coefficient * load * L ** table.power) / ei) * 1000,
    maxAt: table.at,
    slope:
      (((table.slope * load * L ** (table.power - 1)) / ei) * 180) / Math.PI,
    moment: table.moment,
    formula: table.formula,
    coefficient: table.coefficient,
  };
}
