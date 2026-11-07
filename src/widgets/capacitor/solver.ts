// A parallel-plate capacitor connected to a battery (V fixed) or charged and
// then disconnected (Q fixed).

export const EPS0 = 8.854e-12; // permittivity of free space, F/m

export type Plates = {
  area: number; // m²
  gap: number; // m
  k: number; // dielectric constant (relative permittivity), 1 for air
};

export function capacitance({ area, gap, k }: Plates): number {
  return (k * EPS0 * area) / gap;
}

export type Charged = {
  c: number; // F
  q: number; // C
  v: number; // V
  e: number; // field between the plates, V/m
  energy: number; // J
};

export function charge(plates: Plates, v: number): Charged {
  const c = capacitance(plates);
  const q = c * v;
  return { c, q, v, e: v / plates.gap, energy: 0.5 * c * v * v };
}

// Disconnected: the charge cannot change, so the voltage follows C.
export function withCharge(plates: Plates, q: number): Charged {
  const c = capacitance(plates);
  const v = q / c;
  return { c, q, v, e: v / plates.gap, energy: (q * q) / (2 * c) };
}

export function series(...cs: number[]): number {
  return 1 / cs.reduce((sum, c) => sum + 1 / c, 0);
}

export function parallel(...cs: number[]): number {
  return cs.reduce((sum, c) => sum + c, 0);
}
