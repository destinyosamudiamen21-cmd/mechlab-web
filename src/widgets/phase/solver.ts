// Heating 1 kg of water at a constant pressure of 1 atm (101.325 kPa), starting as liquid at 20 °C.
// The saturation values below are the standard steam-table figures at 100 °C. Scholars: check them
// against the department's tables before this goes live. The superheated part uses a constant
// cp for steam, which is an approximation good enough to show the shape of the process.

export const T_START = 20; // °C
export const T_SAT = 100; // °C at 1 atm
export const CP_LIQUID = 4.18; // kJ/kg K
export const CP_STEAM = 2.0; // kJ/kg K, approximate
export const H_F = 419.0; // kJ/kg, saturated liquid
export const H_FG = 2257.0; // kJ/kg, latent heat
export const V_F = 0.001044; // m³/kg, saturated liquid
export const V_G = 1.673; // m³/kg, saturated vapour

export type Phase = "liquid" | "wet" | "superheated";

export type WaterState = {
  phase: Phase;
  t: number; // °C
  x: number | null; // dryness fraction, only meaningful in the wet region
  v: number; // m³/kg
  h: number; // kJ/kg, measured from liquid at 0 °C
};

export const Q_TO_BOIL = CP_LIQUID * (T_SAT - T_START); // heat to reach saturated liquid
export const Q_TO_DRY = Q_TO_BOIL + H_FG; // heat to reach saturated vapour

// The state after "heat" kJ has been added to each kg.
export function stateAfter(heat: number): WaterState {
  if (heat < Q_TO_BOIL) {
    const t = T_START + heat / CP_LIQUID;
    return { phase: "liquid", t, x: null, v: V_F, h: CP_LIQUID * t };
  }
  if (heat <= Q_TO_DRY) {
    const x = (heat - Q_TO_BOIL) / H_FG;
    return {
      phase: "wet",
      t: T_SAT,
      x,
      v: V_F + x * (V_G - V_F),
      h: H_F + x * H_FG,
    };
  }
  const t = T_SAT + (heat - Q_TO_DRY) / CP_STEAM;
  // Steam well above saturation behaves roughly like a perfect gas: v grows with absolute temperature.
  const v = (V_G * (t + 273.15)) / (T_SAT + 273.15);
  return {
    phase: "superheated",
    t,
    x: null,
    v,
    h: H_F + H_FG + CP_STEAM * (t - T_SAT),
  };
}
