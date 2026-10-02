// One colour scale shared by the 3D scene and the flat drawings:
// 0 is cold (blue), 1 is hot (red), passing through purple.
const COLD = [31, 111, 235];
const HOT = [217, 48, 37];

export function heatColor(heat: number): string {
  const t = Math.min(1, Math.max(0, heat));
  const [r, g, b] = COLD.map((cold, index) =>
    Math.round(cold + (HOT[index] - cold) * t)
  );
  return `rgb(${r}, ${g}, ${b})`;
}
