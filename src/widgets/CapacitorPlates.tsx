import { useState } from "react";
import { charge, withCharge } from "./capacitor/solver";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Segments from "./shared/Segments";
import Slider from "./shared/Slider";
import { ACCENT, AMBER, AMBER_TEXT, GOOD, INK, SOFT, STEEL, fmt } from "./shared/theme";

const POSITIVE = "#c2410c";
const DEFAULTS = { area: 200, gap: 1, k: 1, volts: 100 }; // cm², mm, -, V
type Mode = "connected" | "disconnected";

const MATERIALS: [number, string][] = [
  [1, "air"],
  [2.2, "plastic (polythene)"],
  [3.5, "paper"],
  [5, "glass"],
  [6, "mica"],
  [10, "ceramic"],
];
const materialName = (k: number) =>
  MATERIALS.reduce((best, m) => (Math.abs(m[0] - k) < Math.abs(best[0] - k) ? m : best))[1];

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: a capacitor is connected to a 100 V battery and left connected. You slide a sheet of glass into the gap between the plates. What happens to the charge stored on the plates?",
  options: ["It goes up", "It stays the same", "It goes down"],
  correct: 0,
  explain:
    "It goes up. The glass is a dielectric: its molecules line up and partly cancel the field, so the plates can hold more charge at the same voltage. C = k ε₀ A ÷ d gets k times bigger, and because the battery holds V fixed, Q = C V gets k times bigger too. Now try it with the battery disconnected: the charge has nowhere to go, so instead the voltage drops.",
};

// Scale used for the drawing: up to about 14 charge marks and 9 field lines.
const Q_REF = 60e-9; // C that fills the plate with marks
const E_REF = 4e5; // V/m that gives the densest field lines

export default function CapacitorPlates(_props: { topicSlug: string }) {
  const [area, setArea] = useState(DEFAULTS.area);
  const [gap, setGap] = useState(DEFAULTS.gap);
  const [k, setK] = useState(DEFAULTS.k);
  const [volts, setVolts] = useState(DEFAULTS.volts);
  const [mode, setMode] = useState<Mode>("connected");
  const [held, setHeld] = useState(0); // charge trapped when the battery is removed
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const plates = { area: area / 1e4, gap: gap / 1000, k };
  const state = mode === "connected" ? charge(plates, volts) : withCharge(plates, held);

  // Drawing: the gap on screen grows with d, the plates grow with A.
  const W = 360;
  const H = 270;
  const cx = 180;
  const half = 16 + gap * 22; // half the drawn gap, px
  const plateH = 70 + area * 0.4; // drawn plate height, px
  const top = (H - plateH) / 2 - 8;
  const leftX = cx - half;
  const rightX = cx + half;
  const marks = Math.max(0, Math.min(14, Math.round((state.q / Q_REF) * 14)));
  const lines = Math.max(1, Math.min(11, Math.round((state.e / E_REF) * 11)));

  return (
    <div className='widget'>
      <Prediction data={PREDICTION} predicted={predicted} onPredict={setPredicted} />

      <div className='widget-grid'>
        <figure className='widget-figure'>
          <svg viewBox={`0 0 ${W} ${H}`} role='img' aria-label={`Parallel plate capacitor, ${fmt(state.v, 1)} volts across a ${fmt(gap, 1)} millimetre gap filled with ${materialName(k)}. It holds ${fmt(state.q * 1e9, 1)} nanocoulombs.`}>
            {k > 1 && (
              <rect x={leftX + 3} y={top + 4} width={rightX - leftX - 6} height={plateH - 8} fill='#cfe3f7' stroke='#9cbfe0' />
            )}
            {Array.from({ length: lines }, (_, i) => {
              const y = top + ((i + 0.5) / lines) * plateH;
              return (
                <g key={i}>
                  <line x1={leftX + 5} y1={y} x2={rightX - 9} y2={y} stroke={AMBER} strokeWidth='1.6' />
                  <path d={`M${rightX - 10},${y - 3.5} L${rightX - 4},${y} L${rightX - 10},${y + 3.5} z`} fill={AMBER} />
                </g>
              );
            })}
            <rect x={leftX - 6} y={top} width='6' height={plateH} fill={STEEL} />
            <rect x={rightX} y={top} width='6' height={plateH} fill={STEEL} />
            {Array.from({ length: marks }, (_, i) => {
              const y = top + ((i + 0.5) / Math.max(marks, 1)) * plateH;
              return (
                <g key={i} fontSize='12' fontWeight='700' textAnchor='middle'>
                  <text x={leftX - 15} y={y + 4} fill={POSITIVE}>+</text>
                  <text x={rightX + 15} y={y + 4} fill={ACCENT}>−</text>
                </g>
              );
            })}
            {/* wires and the battery (or a gap in the wire when disconnected) */}
            <polyline points={`${leftX - 3},${top + plateH} ${leftX - 3},${H - 26} ${cx - 22},${H - 26}`} fill='none' stroke={INK} strokeWidth='1.5' />
            <polyline points={`${rightX + 3},${top + plateH} ${rightX + 3},${H - 26} ${cx + 22},${H - 26}`} fill='none' stroke={INK} strokeWidth='1.5' />
            {mode === "connected" ? (
              <g>
                <line x1={cx - 4} y1={H - 40} x2={cx - 4} y2={H - 12} stroke={INK} strokeWidth='2' />
                <line x1={cx + 4} y1={H - 33} x2={cx + 4} y2={H - 19} stroke={INK} strokeWidth='4' />
                <line x1={cx - 22} y1={H - 26} x2={cx - 4} y2={H - 26} stroke={INK} strokeWidth='1.5' />
                <line x1={cx + 4} y1={H - 26} x2={cx + 22} y2={H - 26} stroke={INK} strokeWidth='1.5' />
                <text x={cx} y={H - 2} fontSize='11' fill={SOFT} textAnchor='middle'>{fmt(volts, 0)} V battery</text>
              </g>
            ) : (
              <text x={cx} y={H - 22} fontSize='11' fill={SOFT} textAnchor='middle'>battery removed</text>
            )}
            <text x={cx} y={top - 8} fontSize='11' fill={SOFT} textAnchor='middle'>
              d = {fmt(gap, 1)} mm{k > 1 ? `, filled with ${materialName(k)}` : ", air"}
            </text>
          </svg>
          <figcaption>
            Side view of the two plates. The <span style={{ color: POSITIVE, fontWeight: 600 }}>+</span> and{" "}
            <span style={{ color: ACCENT, fontWeight: 600 }}>−</span> marks show how much charge sits on each plate.
            The <span style={{ color: AMBER_TEXT, fontWeight: 600 }}>yellow</span> lines are the electric field: more
            lines means a stronger field. The blue block is the dielectric.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <div className='controls'>
            <Segments<Mode>
              label='Battery'
              options={[
                { id: "connected", label: "Battery connected" },
                { id: "disconnected", label: "Battery removed" },
              ]}
              value={mode}
              disabled={locked}
              onChange={(next) => {
                if (next === "disconnected") setHeld(state.q);
                else setVolts(Math.min(200, Math.max(0, Math.round(state.v))));
                setMode(next);
              }}
            />
            <Slider id='cap-a' label='Plate area A' display={`${fmt(area, 0)} cm²`} min={50} max={400} step={10} value={area} disabled={locked} onChange={setArea} />
            <Slider id='cap-d' label='Gap d' display={`${fmt(gap, 1)} mm`} min={0.5} max={4} step={0.1} value={gap} disabled={locked} onChange={setGap} />
            <Slider id='cap-k' label={`Dielectric k (${materialName(k)})`} display={fmt(k, 1)} min={1} max={10} step={0.1} value={k} disabled={locked} onChange={setK} />
            <Slider id='cap-v' label='Battery voltage V' display={`${fmt(volts, 0)} V`} min={0} max={200} step={5} value={volts} disabled={locked || mode === "disconnected"} onChange={setVolts} />
            <div className='control-buttons'>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  setMode("connected");
                  setArea(DEFAULTS.area);
                  setGap(DEFAULTS.gap);
                  setK(DEFAULTS.k);
                  setVolts(DEFAULTS.volts);
                }}
              >
                Reset
              </button>
            </div>
            {locked && <p className='hint'>Answer the question above to unlock the controls.</p>}
          </div>

          <Readout
            rows={[
              { label: "C = k ε₀ A ÷ d", value: `${fmt(state.c * 1e12, 1)} pF` },
              { label: mode === "connected" ? "Q = C V" : "Q (trapped, cannot change)", value: <span style={{ color: GOOD }}>{fmt(state.q * 1e9, 2)} nC</span> },
              { label: mode === "connected" ? "V (set by the battery)" : "V = Q ÷ C", value: `${fmt(state.v, 1)} V` },
              { label: "E = V ÷ d", value: `${fmt(state.e / 1000, 1)} kV/m` },
              { label: "Energy U = ½ C V²", value: `${fmt(state.energy * 1e6, 3)} μJ` },
            ]}
          />
        </div>
      </div>
      <p className='hint'>
        ε₀ = 8.854 × 10⁻¹² F/m. 1 pF = 10⁻¹² F, 1 nC = 10⁻⁹ C. Remove the battery, then pull the plates apart: the
        voltage and the stored energy rise, because you do work against the attraction of the plates.
      </p>
    </div>
  );
}
