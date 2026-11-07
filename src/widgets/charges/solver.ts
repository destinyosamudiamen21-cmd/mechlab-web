// Two point charges on a line, and the electric field and potential they make
// at any point in the plane. Distances in metres, charges in coulombs.

export const K = 8.99e9; // Coulomb constant 1 / (4π ε₀), N m²/C²

export type Charge = { q: number; x: number; y: number };

// Force between two charges (Coulomb's law). Positive = they repel.
export function coulombForce(q1: number, q2: number, r: number): number {
  return (K * q1 * q2) / (r * r);
}

// Field at (x, y) from all the charges, added as vectors (superposition).
export function fieldAt(charges: Charge[], x: number, y: number) {
  let ex = 0;
  let ey = 0;
  for (const charge of charges) {
    const dx = x - charge.x;
    const dy = y - charge.y;
    const r2 = dx * dx + dy * dy;
    if (r2 < 1e-12) continue;
    const r = Math.sqrt(r2);
    const e = (K * charge.q) / r2; // size, signed: points away from a positive charge
    ex += (e * dx) / r;
    ey += (e * dy) / r;
  }
  return { ex, ey, size: Math.hypot(ex, ey) };
}

// Potential at (x, y): a scalar, so the charges just add (no directions).
export function potentialAt(charges: Charge[], x: number, y: number): number {
  let v = 0;
  for (const charge of charges) {
    const r = Math.hypot(x - charge.x, y - charge.y);
    if (r > 1e-9) v += (K * charge.q) / r;
  }
  return v;
}

// Energy stored in a pair of charges: U = k q₁ q₂ / r.
export function pairEnergy(q1: number, q2: number, r: number): number {
  return (K * q1 * q2) / r;
}
