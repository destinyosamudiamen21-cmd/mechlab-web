import { useState } from "react";
import { solveCircuit } from "./circuit/solver";
import type { Layout } from "./circuit/solver";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Segments from "./shared/Segments";
import Slider from "./shared/Slider";
import { ACCENT, AMBER, GOOD, INK, SOFT, clamp, fmt } from "./shared/theme";

const DEFAULTS = { emf: 12, internal: 0.5, r1: 6, r2: 6 }; // V, Ω, Ω, Ω
const P_BRIGHT = 24; // W that makes a bulb glow fully in the drawing

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: you have a 12 V battery and two identical bulbs. In which arrangement does EACH bulb glow brighter?",
  options: ["One after the other (series)", "Side by side (parallel)", "The same either way"],
  correct: 1,
  explain:
    "Side by side (parallel). In parallel, each bulb gets the full battery voltage, so each gets P = V² ÷ R. In series they share the voltage, half each, so each gets only a quarter of that power. Switch between series and parallel below and watch the glow and the power numbers.",
};

function Bulb({ x, y, power, label }: { x: number; y: number; power: number; label: string }) {
  const glow = clamp(power / P_BRIGHT, 0, 1);
  return (
    <g>
      <circle cx={x} cy={y} r={14 + glow * 14} fill={AMBER} opacity={0.15 + glow * 0.45} />
      <circle cx={x} cy={y} r='12' fill={glow > 0.02 ? "#ffe9a8" : "#fff"} stroke={INK} strokeWidth='1.5' />
      <path d={`M${x - 6},${y + 5} L${x - 3},${y - 4} L${x},${y + 3} L${x + 3},${y - 4} L${x + 6},${y + 5}`} fill='none' stroke={INK} strokeWidth='1.2' />
      <text x={x} y={y - 22 - glow * 6} fontSize='11' fill={SOFT} textAnchor='middle'>
        {label}
      </text>
    </g>
  );
}

export default function ResistorCircuit(_props: { topicSlug: string }) {
  const [emf, setEmf] = useState(DEFAULTS.emf);
  const [internal, setInternal] = useState(DEFAULTS.internal);
  const [r1, setR1] = useState(DEFAULTS.r1);
  const [r2, setR2] = useState(DEFAULTS.r2);
  const [layout, setLayout] = useState<Layout>("series");
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const s = solveCircuit({ emf, internal }, r1, r2, layout);
  const wire = { stroke: INK, strokeWidth: 1.8, fill: "none" };

  return (
    <div className='widget'>
      <Prediction data={PREDICTION} predicted={predicted} onPredict={setPredicted} />

      <div className='widget-grid'>
        <figure className='widget-figure'>
          <svg
            viewBox='0 0 360 270'
            role='img'
            aria-label={`A ${fmt(emf, 0)} volt battery with two resistors of ${fmt(r1, 0)} and ${fmt(
              r2,
              0
            )} ohms in ${layout}. The battery gives ${fmt(s.current)} amps.`}
          >
            {/* battery on the left, with its internal resistance */}
            <line x1='40' y1='60' x2='40' y2='118' {...wire} />
            <line x1='26' y1='118' x2='54' y2='118' stroke={INK} strokeWidth='2' />
            <line x1='32' y1='126' x2='48' y2='126' stroke={INK} strokeWidth='4' />
            <text x='62' y='126' fontSize='11' fill={SOFT}>ε = {fmt(emf, 0)} V</text>
            <line x1='40' y1='126' x2='40' y2='150' {...wire} />
            <rect x='32' y='150' width='16' height='36' fill='#fff' stroke={SOFT} strokeDasharray='3 2' />
            <text x='56' y='172' fontSize='11' fill={SOFT}>r = {fmt(internal, 1)} Ω</text>
            <line x1='40' y1='186' x2='40' y2='230' {...wire} />

            {layout === "series" ? (
              <>
                <polyline points='40,60 40,40 320,40 320,230 40,230' {...wire} />
                <Bulb x={140} y={40} power={s.p1} label={`R₁ = ${fmt(r1, 0)} Ω`} />
                <Bulb x={240} y={40} power={s.p2} label={`R₂ = ${fmt(r2, 0)} Ω`} />
                <text x='190' y='68' fontSize='11' fill={ACCENT} textAnchor='middle'>
                  same current through both: {fmt(s.current)} A
                </text>
              </>
            ) : (
              <>
                <polyline points='40,60 40,40 260,40 260,230 40,230' {...wire} />
                <line x1='160' y1='40' x2='160' y2='230' {...wire} />
                <Bulb x={160} y={135} power={s.p1} label={`R₁ = ${fmt(r1, 0)} Ω`} />
                <Bulb x={260} y={135} power={s.p2} label={`R₂ = ${fmt(r2, 0)} Ω`} />
                <text x='160' y='170' fontSize='11' fill={ACCENT} textAnchor='middle'>{fmt(s.i1)} A</text>
                <text x='260' y='170' fontSize='11' fill={ACCENT} textAnchor='middle'>{fmt(s.i2)} A</text>
                <text x='100' y='32' fontSize='11' fill={ACCENT} textAnchor='middle'>{fmt(s.current)} A</text>
              </>
            )}
            <text x='190' y='258' fontSize='11' fill={SOFT} textAnchor='middle'>
              terminal voltage V = ε − I r = {fmt(s.terminal)} V
            </text>
          </svg>
          <figcaption>
            The bulbs glow more brightly the more power they take. The dashed box is the battery's own internal
            resistance r: it wastes some of the battery's voltage as heat inside the battery.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <div className='controls'>
            <Segments<Layout>
              label='How the two resistors are joined'
              options={[
                { id: "series", label: "Series" },
                { id: "parallel", label: "Parallel" },
              ]}
              value={layout}
              disabled={locked}
              onChange={setLayout}
            />
            <Slider id='dc-emf' label='Battery emf ε' display={`${fmt(emf, 0)} V`} min={1} max={24} step={1} value={emf} disabled={locked} onChange={setEmf} />
            <Slider id='dc-r' label='Internal resistance r' display={`${fmt(internal, 1)} Ω`} min={0} max={5} step={0.1} value={internal} disabled={locked} onChange={setInternal} />
            <Slider id='dc-r1' label={<>Resistor R<sub>1</sub></>} display={`${fmt(r1, 0)} Ω`} min={1} max={30} step={1} value={r1} disabled={locked} onChange={setR1} />
            <Slider id='dc-r2' label={<>Resistor R<sub>2</sub></>} display={`${fmt(r2, 0)} Ω`} min={1} max={30} step={1} value={r2} disabled={locked} onChange={setR2} />
            <div className='control-buttons'>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  setEmf(DEFAULTS.emf);
                  setInternal(DEFAULTS.internal);
                  setR1(DEFAULTS.r1);
                  setR2(DEFAULTS.r2);
                  setLayout("series");
                }}
              >
                Reset
              </button>
            </div>
            {locked && <p className='hint'>Answer the question above to unlock the controls.</p>}
          </div>

          <Readout
            rows={[
              {
                label: layout === "series" ? "R = R₁ + R₂" : "R = R₁ R₂ ÷ (R₁ + R₂)",
                value: `${fmt(s.external)} Ω`,
              },
              { label: "I = ε ÷ (R + r)", value: <span style={{ color: GOOD }}>{fmt(s.current)} A</span> },
              { label: "V₁ = I₁ R₁ ,  V₂ = I₂ R₂", value: `${fmt(s.v1)} V , ${fmt(s.v2)} V` },
              { label: "P₁ = V₁ I₁ ,  P₂ = V₂ I₂", value: `${fmt(s.p1)} W , ${fmt(s.p2)} W` },
              { label: "Lost volts I r", value: `${fmt(s.lost)} V` },
              { label: "Power from battery ε I", value: `${fmt(s.pTotal)} W` },
            ]}
          />
        </div>
      </div>
      <p className='hint'>
        Check the energy: the battery's ε I always equals P₁ + P₂ plus the I² r wasted inside it. Set r to 0 for an
        ideal battery.
      </p>
    </div>
  );
}
