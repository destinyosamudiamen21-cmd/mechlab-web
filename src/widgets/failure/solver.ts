// The five classical theories of elastic failure, for a two-dimensional stress state.
// σ1 and σ2 are the principal stresses (the third is zero). σy is the yield stress in simple tension.
// Each theory turns the pair into one "equivalent stress" to compare with σy.
// The factor of safety is σy / equivalent stress: below 1 means the theory predicts yielding.

export type TheoryId = "rankine" | "stvenant" | "tresca" | "haigh" | "vonmises";

export type Theory = { id: TheoryId; name: string; idea: string };

export const THEORIES: Theory[] = [
  {
    id: "rankine",
    name: "Maximum principal stress (Rankine)",
    idea: "the largest principal stress reaches σy",
  },
  {
    id: "stvenant",
    name: "Maximum principal strain (St Venant)",
    idea: "the largest strain reaches the strain at yield in simple tension",
  },
  {
    id: "tresca",
    name: "Maximum shear stress (Tresca, Guest)",
    idea: "the largest shear stress reaches σy / 2",
  },
  {
    id: "haigh",
    name: "Total strain energy (Haigh)",
    idea: "the strain energy per volume reaches its value at yield in simple tension",
  },
  {
    id: "vonmises",
    name: "Shear strain energy (von Mises)",
    idea: "the energy of distortion reaches its value at yield in simple tension",
  },
];

export function equivalentStress(
  id: TheoryId,
  s1: number,
  s2: number,
  nu: number
): number {
  switch (id) {
    case "rankine":
      return Math.max(Math.abs(s1), Math.abs(s2));
    case "stvenant":
      return Math.max(Math.abs(s1 - nu * s2), Math.abs(s2 - nu * s1));
    case "tresca":
      // The third principal stress is zero, so the candidates are σ1 − σ2, σ1 − 0 and σ2 − 0.
      return Math.max(Math.abs(s1 - s2), Math.abs(s1), Math.abs(s2));
    case "haigh":
      return Math.sqrt(s1 * s1 + s2 * s2 - 2 * nu * s1 * s2);
    case "vonmises":
      return Math.sqrt(s1 * s1 - s1 * s2 + s2 * s2);
  }
}

export function safetyFactor(
  id: TheoryId,
  s1: number,
  s2: number,
  sy: number,
  nu: number
): number {
  const equivalent = equivalentStress(id, s1, s2, nu);
  return equivalent === 0 ? Infinity : sy / equivalent;
}

// The outline of the safe region on σ1–σ2 axes, as a closed list of points.
export function envelope(
  id: TheoryId,
  sy: number,
  nu: number
): [number, number][] {
  if (id === "rankine")
    return [
      [sy, sy],
      [-sy, sy],
      [-sy, -sy],
      [sy, -sy],
    ];
  if (id === "tresca")
    return [
      [sy, 0],
      [sy, sy],
      [0, sy],
      [-sy, 0],
      [-sy, -sy],
      [0, -sy],
    ];
  if (id === "stvenant") {
    const far = sy / (1 - nu);
    const near = sy / (1 + nu);
    return [
      [far, far],
      [-near, near],
      [-far, -far],
      [near, -near],
    ];
  }
  // Haigh and von Mises are ellipses with their long axis along σ1 = σ2.
  const c = id === "haigh" ? nu : 0.5;
  return Array.from({ length: 72 }, (_, i): [number, number] => {
    const angle = (i / 72) * 2 * Math.PI;
    const u = (sy * Math.cos(angle)) / Math.sqrt(1 - c); // along σ1 = σ2
    const v = (sy * Math.sin(angle)) / Math.sqrt(1 + c); // across it
    return [(u + v) / Math.SQRT2, (u - v) / Math.SQRT2];
  });
}
