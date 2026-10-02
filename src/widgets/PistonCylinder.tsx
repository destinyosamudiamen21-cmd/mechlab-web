import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { heatColor } from "./piston/heat";
import PistonScene from "./piston/PistonScene";
import { pressureAt, workTo } from "./piston/solver";
import type { PistonInput, Process } from "./piston/solver";

const INK = "#16202e";
const SOFT = "#5b6676";
const RULE = "#d5dbe4";
const ACCENT = "#1f6feb";
const AMBER = "#f2a900";

const V1 = 0.05; // m³, fixed starting volume (50 dm³, as in the exam question)
const BAR = 100; // 1 bar = 100 kPa

// The p-V plot: fixed axes so a bigger area really looks bigger.
// Under the V axis sits a flat piston whose face lines up with V on the axis.
const W = 360;
const H = 312;
const LEFT = 44;
const BOTTOM = 80;
const STRIP_HEIGHT = 26;
const V_MAX = 0.22;
const P_MAX = 10.5; // bar
const gx = (v: number) => LEFT + (v / V_MAX) * (W - LEFT - 12);
const gy = (bar: number) => 12 + (1 - bar / P_MAX) * (H - BOTTOM - 12);
const STRIP_TOP = gy(0) + 44;

const PROCESSES: { id: Process; label: string; law: ReactNode }[] = [
  { id: "constant", label: "Constant p", law: <>p = constant</> },
  { id: "linear", label: "Linear", law: <>p = a + bV</> },
  { id: "hyperbolic", label: "pV = C", law: <>pV = constant</> },
  {
    id: "polytropic",
    label: "pVⁿ = C",
    law: (
      <>
        pV<sup>n</sup> = constant
      </>
    ),
  },
];

const DEFAULTS = {
  process: "constant" as Process,
  p1Bar: 9,
  v2: 0.2,
  p2Bar: 2,
  n: 1.4,
  travel: 0,
};

const PREDICTION = {
  prompt:
    "Before you touch anything: a fluid at 9 bar expands from 0.05 m³ to 0.2 m³. Which path makes it do the most work?",
  options: [
    "Constant pressure, staying at 9 bar",
    "A straight line, falling to 2 bar",
    "They do the same work, because the volume change is the same",
  ],
  correct: 0,
  explain:
    "Work is the area under the p-V curve, so it depends on the path, not only on the two end states. Staying at 9 bar keeps the curve highest, which gives the largest area. Switch between the processes and compare the totals.",
};

const fmt = (n: number, digits = 2) =>
  (Math.abs(n) < 0.5 * 10 ** -digits ? 0 : n).toFixed(digits);

type SliderProps = {
  id: string;
  label: ReactNode;
  display: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
};

function Slider({
  id,
  label,
  display,
  min,
  max,
  step,
  value,
  disabled,
  onChange,
}: SliderProps) {
  return (
    <div className='slider'>
      <label htmlFor={id}>{label}</label>
      <output htmlFor={id}>{display}</output>
      <input
        id={id}
        type='range'
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

export default function PistonCylinder(_props: { topicSlug: string }) {
  const [process, setProcess] = useState<Process>(DEFAULTS.process);
  const [p1Bar, setP1Bar] = useState(DEFAULTS.p1Bar);
  const [v2, setV2] = useState(DEFAULTS.v2);
  const [p2Bar, setP2Bar] = useState(DEFAULTS.p2Bar);
  const [n, setN] = useState(DEFAULTS.n);
  const [travel, setTravel] = useState(DEFAULTS.travel); // 0 to 100 % of the stroke
  const [predicted, setPredicted] = useState<number | null>(null);
  const frameRef = useRef(0);

  // Stop a running animation if the student leaves the page.
  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const locked = predicted === null;
  const input: PistonInput = {
    process,
    p1: p1Bar * BAR,
    v1: V1,
    v2,
    p2: p2Bar * BAR,
    n,
  };

  const v = V1 + (travel / 100) * (v2 - V1); // where the piston is now
  const pNow = pressureAt(input, v);
  const pEnd = pressureAt(input, v2);
  const workNow = workTo(input, v);
  const workTotal = workTo(input, v2);

  // For a perfect gas T is proportional to pV, so pV sets the colour (blue cold, red hot).
  const pvRatio = (pNow * v) / (input.p1 * V1);
  const heat = Math.min(1, Math.max(0, 0.5 + (0.5 * Math.log2(pvRatio)) / 2));

  // The curve from state 1 to state 2, and the same curve only as far as the piston has travelled.
  const sample = (toV: number) =>
    Array.from({ length: 41 }, (_, index) => {
      const volume = V1 + (index / 40) * (toV - V1);
      return `${gx(volume).toFixed(1)} ${gy(
        pressureAt(input, volume) / BAR
      ).toFixed(1)}`;
    });
  const curve = `M ${sample(v2).join(" L ")}`;
  const area = `M ${gx(V1)} ${gy(0)} L ${sample(v).join(" L ")} L ${gx(v)} ${gy(
    0
  )} Z`;

  function play() {
    cancelAnimationFrame(frameRef.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTravel(100);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const done = Math.min(1, (now - start) / 2500);
      setTravel(Math.round(done * 100));
      if (done < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
  }

  function reset() {
    cancelAnimationFrame(frameRef.current);
    setProcess(DEFAULTS.process);
    setP1Bar(DEFAULTS.p1Bar);
    setV2(DEFAULTS.v2);
    setP2Bar(DEFAULTS.p2Bar);
    setN(DEFAULTS.n);
    setTravel(DEFAULTS.travel);
  }

  const p1 = fmt(input.p1, 0);
  const formula: Record<Process, { rule: ReactNode; numbers: string }> = {
    constant: {
      rule: <>W = p(V₂ − V₁)</>,
      numbers: `${p1} × (${fmt(v2)} − ${fmt(V1)})`,
    },
    linear: {
      rule: <>W = ½(p₁ + p₂)(V₂ − V₁), the area of a trapezium</>,
      numbers: `½ × (${p1} + ${fmt(pEnd, 0)}) × (${fmt(v2)} − ${fmt(V1)})`,
    },
    hyperbolic: {
      rule: <>W = p₁V₁ ln(V₂ / V₁)</>,
      numbers: `${p1} × ${fmt(V1)} × ln(${fmt(v2)} / ${fmt(V1)})`,
    },
    polytropic: {
      rule: <>W = (p₁V₁ − p₂V₂) / (n − 1)</>,
      numbers: `(${p1} × ${fmt(V1)} − ${fmt(pEnd, 1)} × ${fmt(v2)}) / (${fmt(
        n,
        1
      )} − 1)`,
    },
  };

  return (
    <div className='widget'>
      <div className='predict'>
        <p className='predict-prompt'>{PREDICTION.prompt}</p>
        {locked ? (
          <div className='predict-options'>
            {PREDICTION.options.map((option, index) => (
              <button
                key={option}
                className='choice'
                onClick={() => setPredicted(index)}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <p
            className={
              predicted === PREDICTION.correct ? "feedback good" : "feedback"
            }
          >
            <strong>
              {predicted === PREDICTION.correct ? "Correct." : "Not yet."}
            </strong>{" "}
            {PREDICTION.explain}
          </p>
        )}
      </div>

      <div className='widget-grid'>
        <figure className='widget-figure'>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role='img'
            aria-label={`Pressure-volume diagram. Work done so far ${fmt(
              workNow
            )} kilojoules.`}
          >
            <path d={area} fill={AMBER} fillOpacity='0.35' />
            <line
              x1={LEFT}
              y1={gy(0)}
              x2={W - 8}
              y2={gy(0)}
              stroke={RULE}
              strokeWidth='1.5'
            />
            <line
              x1={LEFT}
              y1='8'
              x2={LEFT}
              y2={gy(0)}
              stroke={RULE}
              strokeWidth='1.5'
            />
            {[0.05, 0.1, 0.15, 0.2].map((tick) => (
              <g key={tick}>
                <line
                  x1={gx(tick)}
                  y1={gy(0)}
                  x2={gx(tick)}
                  y2={gy(0) + 5}
                  stroke={SOFT}
                />
                <text
                  x={gx(tick)}
                  y={gy(0) + 18}
                  fontSize='11'
                  fill={SOFT}
                  textAnchor='middle'
                >
                  {tick.toFixed(2)}
                </text>
              </g>
            ))}
            {[2, 4, 6, 8, 10].map((tick) => (
              <g key={tick}>
                <line
                  x1={LEFT - 5}
                  y1={gy(tick)}
                  x2={LEFT}
                  y2={gy(tick)}
                  stroke={SOFT}
                />
                <text
                  x={LEFT - 8}
                  y={gy(tick) + 4}
                  fontSize='11'
                  fill={SOFT}
                  textAnchor='end'
                >
                  {tick}
                </text>
              </g>
            ))}
            <text
              x={W - 8}
              y={gy(0) + 34}
              fontSize='12'
              fill={SOFT}
              textAnchor='end'
            >
              Volume V (m³)
            </text>
            <text x={LEFT + 8} y='18' fontSize='12' fill={SOFT}>
              p (bar)
            </text>

            <path d={curve} fill='none' stroke={INK} strokeWidth='2' />
            <line
              x1={gx(v)}
              y1={gy(pNow / BAR)}
              x2={gx(v)}
              y2={STRIP_TOP}
              stroke={ACCENT}
              strokeDasharray='4 4'
            />

            {/* the same piston, drawn flat: its face sits at V on the axis above */}
            <rect
              x={gx(0)}
              y={STRIP_TOP}
              width={gx(v) - gx(0)}
              height={STRIP_HEIGHT}
              fill={heatColor(heat)}
              fillOpacity='0.6'
            />
            <path
              d={`M ${W - 8} ${STRIP_TOP} H ${gx(0)} V ${
                STRIP_TOP + STRIP_HEIGHT
              } H ${W - 8}`}
              fill='none'
              stroke={INK}
              strokeWidth='1.5'
            />
            <rect
              x={gx(v)}
              y={STRIP_TOP}
              width='6'
              height={STRIP_HEIGHT}
              fill='#3a4658'
            />
            <rect
              x={gx(v) + 6}
              y={STRIP_TOP + STRIP_HEIGHT / 2 - 2}
              width={Math.max(0, W - 8 - gx(v) - 6)}
              height='4'
              fill='#3a4658'
            />

            <circle cx={gx(V1)} cy={gy(p1Bar)} r='4' fill={INK} />
            <text
              x={gx(V1) - 8}
              y={gy(p1Bar) - 8}
              fontSize='12'
              fill={INK}
              textAnchor='end'
            >
              1
            </text>
            <circle cx={gx(v2)} cy={gy(pEnd / BAR)} r='4' fill={INK} />
            <text
              x={gx(v2) + 8}
              y={gy(pEnd / BAR) - 8}
              fontSize='12'
              fill={INK}
            >
              2
            </text>
            <circle
              cx={gx(v)}
              cy={gy(pNow / BAR)}
              r='6'
              fill={AMBER}
              stroke={INK}
              strokeWidth='1.5'
            />
            {workNow > 1 && (
              <text
                x={(gx(V1) + gx(v)) / 2}
                y={gy(0) - 10}
                fontSize='12'
                fontWeight='600'
                fill='#7a5600'
                textAnchor='middle'
              >
                W = {fmt(workNow, 1)} kJ
              </text>
            )}
          </svg>
          <figcaption>
            The shaded area is the work done so far: {fmt(workNow)} kJ of{" "}
            {fmt(workTotal)} kJ. The piston below the axis sits at the same V.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <figure className='widget-figure'>
            <PistonScene volume={v} heat={heat} />
            <figcaption>
              Drag sideways to turn it. Colour follows pV, which for a perfect
              gas is temperature: blue is cold, red is hot.
            </figcaption>
          </figure>

          <div className='controls'>
            <div className='segments' role='group' aria-label='Process'>
              {PROCESSES.map((item) => (
                <button
                  key={item.id}
                  className='segment'
                  aria-pressed={process === item.id}
                  disabled={locked}
                  onClick={() => setProcess(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <Slider
              id='piston-travel'
              label='Move the piston'
              display={`V = ${fmt(v, 3)} m³`}
              min={0}
              max={100}
              step={1}
              value={travel}
              disabled={locked}
              onChange={setTravel}
            />
            <Slider
              id='piston-p1'
              label={
                <>
                  p<sub>1</sub>
                </>
              }
              display={`${fmt(p1Bar, 1)} bar`}
              min={2}
              max={10}
              step={0.5}
              value={p1Bar}
              disabled={locked}
              onChange={setP1Bar}
            />
            <Slider
              id='piston-v2'
              label={
                <>
                  V<sub>2</sub>
                </>
              }
              display={`${fmt(v2)} m³`}
              min={0.06}
              max={0.2}
              step={0.01}
              value={v2}
              disabled={locked}
              onChange={setV2}
            />
            {process === "linear" && (
              <Slider
                id='piston-p2'
                label={
                  <>
                    p<sub>2</sub>
                  </>
                }
                display={`${fmt(p2Bar, 1)} bar`}
                min={1}
                max={10}
                step={0.5}
                value={p2Bar}
                disabled={locked}
                onChange={setP2Bar}
              />
            )}
            {process === "polytropic" && (
              <Slider
                id='piston-n'
                label='n'
                display={fmt(n, 1)}
                min={1.1}
                max={3}
                step={0.1}
                value={n}
                disabled={locked}
                onChange={setN}
              />
            )}

            <div className='control-buttons'>
              <button className='button' onClick={play} disabled={locked}>
                Play the expansion
              </button>
              <button
                className='button button-quiet'
                onClick={reset}
                disabled={locked}
              >
                Reset
              </button>
            </div>
            {locked && (
              <p className='hint'>
                Answer the question above to unlock the controls.
              </p>
            )}
          </div>
        </div>
      </div>

      <dl className='readout'>
        <div>
          <dt>Law: {PROCESSES.find((item) => item.id === process)?.law}</dt>
          <dd>{formula[process].rule}</dd>
        </div>
        <div>
          <dt>Total work, state 1 to state 2</dt>
          <dd>
            {formula[process].numbers} = <b>{fmt(workTotal)} kJ</b>
          </dd>
        </div>
        <div>
          <dt>Units, the usual trap</dt>
          <dd>
            {fmt(p1Bar, 1)} bar = {p1} kPa, and kPa × m³ = kJ
          </dd>
        </div>
        <div>
          <dt>Where the piston is now</dt>
          <dd>
            V = <b>{fmt(v, 3)} m³</b>, p = <b>{fmt(pNow / BAR)} bar</b>, work so
            far = <b>{fmt(workNow)} kJ</b>
          </dd>
        </div>
      </dl>
    </div>
  );
}
