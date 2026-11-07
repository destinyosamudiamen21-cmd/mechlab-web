import { useState } from "react";
import { resonance, solveRlc } from "./ac/solver";
import type { Rlc } from "./ac/solver";
import Plot from "./shared/Plot";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Segments from "./shared/Segments";
import Slider from "./shared/Slider";
import { ACCENT, AMBER, AMBER_TEXT, GOOD, SOFT, fmt } from "./shared/theme";

const V_RMS = 230; // V, the Nigerian mains supply
const V_PEAK = V_RMS * Math.SQRT2;
const DEFAULTS = { r: 20, l: 100, c: 100, f: 100 }; // Ω, mH, μF, Hz
const F_MAX = 300;
type Mode = "rlc" | "r" | "l" | "c";

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: a capacitor on its own is connected to an AC supply. You keep the voltage the same but raise the frequency. What happens to the current?",
  options: ["It goes up", "It goes down", "It stays the same"],
  correct: 0,
  explain:
    "It goes up. A capacitor's opposition to AC, its reactance X_C = 1 ÷ (2π f C), gets SMALLER as the frequency rises, because the capacitor has less time to fill up before the current turns round. An inductor does the opposite: X_L = 2π f L grows with frequency. Pick 'C only' below and move the frequency slider.",
};

export default function ACCircuit(_props: { topicSlug: string }) {
  const [r, setR] = useState(DEFAULTS.r);
  const [l, setL] = useState(DEFAULTS.l);
  const [c, setC] = useState(DEFAULTS.c);
  const [f, setF] = useState(DEFAULTS.f);
  const [mode, setMode] = useState<Mode>("rlc");
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  // Each mode keeps only the parts it names: an absent L is 0 H, an absent C is a wire (C → ∞).
  const circuit = (freq: number): Rlc => ({
    r: mode === "rlc" || mode === "r" ? r : 0,
    l: mode === "rlc" || mode === "l" ? l / 1000 : 0,
    c: mode === "rlc" || mode === "c" ? c / 1e6 : Infinity,
    f: freq,
    vPeak: V_PEAK,
  });
  const s = solveRlc(circuit(f));
  const f0 = mode === "rlc" ? resonance({ l: l / 1000, c: c / 1e6 }) : NaN;
  const phaseDeg = (s.phase * 180) / Math.PI;

  // Two cycles of v and i. Time is drawn in cycles so any frequency fits.
  const iScale = (V_PEAK * 0.8) / Math.max(s.iPeak, 1e-9); // stretch i to share the axis
  const wave = (fn: (x: number) => number) =>
    Array.from({ length: 161 }, (_, k) => {
      const cycles = (k / 160) * 2;
      return [cycles, fn(2 * Math.PI * cycles)] as const;
    });
  const vWave = wave((x) => V_PEAK * Math.sin(x));
  const iWave = wave((x) => s.iPeak * iScale * Math.sin(x - s.phase));

  const iMaxAll = Math.max(
    ...Array.from({ length: 60 }, (_, k) => solveRlc(circuit(5 + (k / 59) * (F_MAX - 5))).iRms),
    s.iRms
  );
  const iTop = Math.max(1, Math.ceil(Math.min(iMaxAll, 60) / 5) * 5);
  const sweep = Array.from({ length: 120 }, (_, k) => {
    const freq = 5 + (k / 119) * (F_MAX - 5);
    return [freq, Math.min(solveRlc(circuit(freq)).iRms, iTop)] as const;
  });

  const nature =
    Math.abs(phaseDeg) < 0.5
      ? "in step (resistive)"
      : phaseDeg > 0
        ? `current lags by ${fmt(phaseDeg, 1)}° (inductive)`
        : `current leads by ${fmt(-phaseDeg, 1)}° (capacitive)`;

  return (
    <div className='widget'>
      <Prediction data={PREDICTION} predicted={predicted} onPredict={setPredicted} />

      <div className='widget-grid'>
        <figure className='widget-figure'>
          <Plot
            x={[0, 2]}
            y={[-V_PEAK * 1.1, V_PEAK * 1.1]}
            xTicks={[0, 0.5, 1, 1.5, 2]}
            yTicks={[-300, 0, 300]}
            xLabel='time (cycles)'
            yLabel='v (V)'
            height={240}
            label={`Voltage and current over two cycles. The ${nature}.`}
          >
            {(sx, sy) => (
              <>
                <polyline points={vWave.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ")} fill='none' stroke={ACCENT} strokeWidth='2.5' />
                <polyline points={iWave.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ")} fill='none' stroke={AMBER} strokeWidth='2.5' />
              </>
            )}
          </Plot>
          <figcaption>
            <span style={{ color: ACCENT, fontWeight: 600 }}>Blue</span>: supply voltage.{" "}
            <span style={{ color: AMBER_TEXT, fontWeight: 600 }}>Yellow</span>: current (stretched to the same height
            so the shift is easy to see). If the yellow peak comes after the blue one, the current lags.
          </figcaption>
          <Plot
            x={[0, F_MAX]}
            y={[0, iTop]}
            xTicks={[0, 50, 100, 150, 200, 250, 300]}
            yTicks={[0, iTop / 2, iTop]}
            xLabel='frequency f (Hz)'
            yLabel='I r.m.s. (A)'
            height={220}
            label={`Current against frequency. At ${fmt(f, 0)} hertz the current is ${fmt(s.iRms)} amps.`}
          >
            {(sx, sy) => (
              <>
                <polyline points={sweep.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ")} fill='none' stroke={GOOD} strokeWidth='2.5' />
                {Number.isFinite(f0) && f0 <= F_MAX && (
                  <>
                    <line x1={sx(f0)} y1={sy(0)} x2={sx(f0)} y2={sy(iTop)} stroke={SOFT} strokeDasharray='3 3' />
                    <text x={sx(f0) + 4} y={sy(iTop) + 12} fontSize='11' fill={SOFT}>f₀ = {fmt(f0, 1)} Hz</text>
                  </>
                )}
                <circle cx={sx(f)} cy={sy(Math.min(s.iRms, iTop))} r='6' fill={AMBER} stroke='#fff' strokeWidth='2' />
              </>
            )}
          </Plot>
          <figcaption>
            How the current changes with frequency for this circuit. With R, L and C together it peaks at the
            resonant frequency f₀, where X<sub>L</sub> = X<sub>C</sub>.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <div className='controls'>
            <Segments<Mode>
              label='Which parts are in the circuit'
              options={[
                { id: "rlc", label: "R, L and C" },
                { id: "r", label: "R only" },
                { id: "l", label: "L only" },
                { id: "c", label: "C only" },
              ]}
              value={mode}
              disabled={locked}
              onChange={setMode}
            />
            <Slider id='ac-f' label='Frequency f' display={`${fmt(f, 0)} Hz`} min={5} max={F_MAX} step={1} value={f} disabled={locked} onChange={setF} />
            <Slider id='ac-r' label='Resistance R' display={`${fmt(r, 0)} Ω`} min={1} max={100} step={1} value={r} disabled={locked || mode === "l" || mode === "c"} onChange={setR} />
            <Slider id='ac-l' label='Inductance L' display={`${fmt(l, 0)} mH`} min={10} max={500} step={10} value={l} disabled={locked || mode === "r" || mode === "c"} onChange={setL} />
            <Slider id='ac-c' label='Capacitance C' display={`${fmt(c, 0)} μF`} min={5} max={200} step={5} value={c} disabled={locked || mode === "r" || mode === "l"} onChange={setC} />
            <div className='control-buttons'>
              {mode === "rlc" && f0 <= F_MAX && (
                <button className='button button-quiet' disabled={locked} onClick={() => setF(Math.round(f0))}>
                  Go to resonance
                </button>
              )}
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  setMode("rlc");
                  setR(DEFAULTS.r);
                  setL(DEFAULTS.l);
                  setC(DEFAULTS.c);
                  setF(DEFAULTS.f);
                }}
              >
                Reset
              </button>
            </div>
            {locked && <p className='hint'>Answer the question above to unlock the controls.</p>}
          </div>

          <Readout
            rows={[
              { label: "X_L = 2π f L", value: `${fmt(s.xl, 1)} Ω` },
              { label: "X_C = 1 ÷ (2π f C)", value: `${fmt(s.xc, 1)} Ω` },
              { label: "Z = √(R² + (X_L − X_C)²)", value: `${fmt(s.z, 1)} Ω` },
              { label: "I = V ÷ Z (r.m.s.)", value: <span style={{ color: GOOD }}>{fmt(s.iRms)} A</span> },
              { label: "Phase φ = tan⁻¹((X_L − X_C) ÷ R)", value: nature },
              { label: "Power P = V I cos φ", value: `${fmt(s.power, 0)} W` },
            ]}
          />
        </div>
      </div>
      <p className='hint'>
        Supply: {V_RMS} V r.m.s. ({fmt(V_PEAK, 0)} V peak). Only the resistor uses up power; L and C store energy and
        hand it back every cycle, which is why P = V I cos φ and not just V I.
      </p>
    </div>
  );
}
