// Long straight wires: the field round one, and the force between two.

export const MU0 = 4 * Math.PI * 1e-7; // permeability of free space, T m/A

// B = μ₀ I / (2π r)
export function fieldFromWire(current: number, r: number): number {
  return (MU0 * current) / (2 * Math.PI * r);
}

// Force on each metre of wire 2 from wire 1. Positive = attract (same direction).
export function forcePerMetre(i1: number, i2: number, d: number): number {
  return (MU0 * i1 * i2) / (2 * Math.PI * d);
}

// Force on a charge moving at right angles to a field: F = q v B.
export function lorentz(q: number, v: number, b: number, angleDeg = 90): number {
  return q * v * b * Math.sin((angleDeg * Math.PI) / 180);
}
