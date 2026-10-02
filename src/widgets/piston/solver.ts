// Pure physics for a fluid expanding behind a piston (closed system, reversible).
// Units are chosen so no conversion factors are needed: kPa × m³ = kJ.

export type Process = "constant" | "linear" | "hyperbolic" | "polytropic";

export type PistonInput = {
  process: Process;
  p1: number; // initial pressure, kPa
  v1: number; // initial volume, m³
  v2: number; // final volume, m³
  p2: number; // final pressure, kPa (used by the linear law only)
  n: number; // index (used by pVⁿ = C only)
};

// Pressure (kPa) when the volume is v, somewhere along the process.
export function pressureAt(input: PistonInput, v: number): number {
  const { process, p1, v1, v2, p2, n } = input;
  switch (process) {
    case "constant":
      return p1;
    case "linear":
      // Straight line from (v1, p1) to (v2, p2). No travel means no change.
      return v2 === v1 ? p1 : p1 + ((p2 - p1) * (v - v1)) / (v2 - v1);
    case "hyperbolic":
      return (p1 * v1) / v;
    case "polytropic":
      return p1 * (v1 / v) ** n;
  }
}

// Work done BY the fluid (kJ) from v1 up to volume v: the area under the curve.
export function workTo(input: PistonInput, v: number): number {
  const { process, p1, v1, n } = input;
  const p = pressureAt(input, v);
  switch (process) {
    case "constant":
      return p1 * (v - v1);
    case "linear":
      return ((p1 + p) / 2) * (v - v1); // area of a trapezium
    case "hyperbolic":
      return p1 * v1 * Math.log(v / v1);
    case "polytropic":
      // n = 1 is pV = C, where this formula would divide by zero.
      if (Math.abs(n - 1) < 1e-9) return p1 * v1 * Math.log(v / v1);
      return (p1 * v1 - p * v) / (n - 1);
  }
}
