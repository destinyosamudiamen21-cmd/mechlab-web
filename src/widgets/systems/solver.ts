// Two ideas from the first week of thermodynamics:
// 1. What kind of system is it? Decided by what crosses the boundary.
// 2. Which properties depend on how much stuff there is (extensive) and which do not (intensive)?

export type SystemKind = "open" | "closed" | "isolated";

// Mass crossing makes it open, whatever the energy does. No mass but energy crossing: closed.
// Nothing crossing at all: isolated.
export function classify(
  massCrosses: boolean,
  energyCrosses: boolean
): SystemKind {
  if (massCrosses) return "open";
  return energyCrosses ? "closed" : "isolated";
}

export type PropertyRow = {
  name: string;
  symbol: string;
  unit: string;
  extensive: boolean;
  whole: number; // value for the whole system
};

// 2 kg of air at 300 K and 200 kPa: V = mRT/p, U = m cv T.
export const AIR_TANK: PropertyRow[] = [
  { name: "Mass", symbol: "m", unit: "kg", extensive: true, whole: 2 },
  { name: "Volume", symbol: "V", unit: "m³", extensive: true, whole: 0.861 },
  {
    name: "Internal energy",
    symbol: "U",
    unit: "kJ",
    extensive: true,
    whole: 430.8,
  },
  { name: "Temperature", symbol: "T", unit: "K", extensive: false, whole: 300 },
  { name: "Pressure", symbol: "p", unit: "kPa", extensive: false, whole: 200 },
  {
    name: "Density",
    symbol: "ρ",
    unit: "kg/m³",
    extensive: false,
    whole: 2.323,
  },
  {
    name: "Specific volume",
    symbol: "v",
    unit: "m³/kg",
    extensive: false,
    whole: 0.4305,
  },
];

// The value of a property in ONE of the equal parts the system is divided into.
export function valueInPart(row: PropertyRow, parts: number): number {
  return row.extensive ? row.whole / parts : row.whole;
}
