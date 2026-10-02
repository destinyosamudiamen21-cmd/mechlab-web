// Colours and number formatting shared by every widget, so they all look and read the same.
export const INK = "#16202e";
export const SOFT = "#5b6676";
export const RULE = "#d5dbe4";
export const ACCENT = "#1f6feb";
export const AMBER = "#f2a900";
export const AMBER_TEXT = "#7a5600";
export const GOOD = "#1a7f37";
export const WARN = "#b26a00";
export const STEEL = "#3a4658";
export const TINT = "#eaf2ff";

// Fixed decimals, and never "-0.00" for a value that is zero within rounding.
export function fmt(n: number, digits = 2): string {
  return (Math.abs(n) < 0.5 * 10 ** -digits ? 0 : n).toFixed(digits);
}

// Keeps a number inside a range.
export function clamp(n: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, n));
}
