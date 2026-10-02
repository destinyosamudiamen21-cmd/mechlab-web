import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { GAMMA, solveEngine, stateAt } from "./engine/solver";
import type { CycleKind } from "./engine/solver";
import { heatColor } from "./piston/heat";
import PistonScene from "./piston/PistonScene";
import Slider from "./shared/Slider";

const INK = "#16202e";
const SOFT = "#5b6676";
const RULE = "#d5dbe4";
const ACCENT = "#1f6feb";
const AMBER = "#f2a900";

// Fixed starting state, the usual exam values.
const P1 = 100; // kPa (1 bar)
const T1 = 300; // K (27 °C)
const T_HOT = 2600; // K, the top of the colour scale

// p-V plot. V is shown as a fraction of the full cylinder volume V1.
const W = 360;
const H = 312;
const LEFT = 44;
const BOTTOM = 80;
const STRIP_HEIGHT = 26;
const gx = (fraction: number) => LEFT + (fraction / 1.05) * (W - LEFT - 12);
const PLOT_BOTTOM = H - BOTTOM;
const STRIP_TOP = PLOT_BOTTOM + 44;

const LEGS: Record<CycleKind, string[]> = {
  otto: [
    "1 to 2: compression, no heat transfer",
    "2 to 3: heat added at constant volume (the spark)",
    "3 to 4: expansion, the power stroke",
    "4 to 1: heat rejected at constant volume",
  ],
  diesel: [
    "1 to 2: compression, no heat transfer",
    "2 to 3: heat added at constant pressure (fuel burns as the piston moves)",
    "3 to 4: expansion, the power stroke",
    "4 to 1: heat rejected at constant volume",
  ],
};

const DEFAULTS = {
  kind: "otto" as CycleKind,
  r: 8,
  t3: 1800,
  cutoff: 2,
  position: 0,
};
const TYPICAL_R: Record<CycleKind, number> = { otto: 8, diesel: 16 };

const PREDICTION = {
  prompt:
    "Before you touch anything: you want a more efficient Otto engine. Which change raises the air-standard efficiency?",
  options: [
    "Raise the compression ratio r",
    "Burn more fuel, so the peak temperature T₃ is higher",
    "Either one: both raise it",
  ],
  correct: 0,
  explain:
    "For the Otto cycle η = 1 − 1/r^(γ−1). There is no T₃ in it. More heat gives more work per cycle, but the efficiency stays the same. Drag T₃ and watch η stay still, then drag r.",
};

const fmt = (n: number, digits = 1) => n.toFixed(digits);

// A round number just above the peak pressure, so the plot always fits.
function axisTop(peakBar: number): number {
  for (const top of [10, 20, 40, 60, 80, 100, 150, 200, 300]) {
    if (peakBar <= top * 0.95) return top;
  }
  return 400;
}

export default function EngineCycle(_props: { topicSlug: string }) {
  const [kind, setKind] = useState<CycleKind>(DEFAULTS.kind);
  const [r, setR] = useState(DEFAULTS.r);
  const [t3, setT3] = useState(DEFAULTS.t3);
  const [cutoff, setCutoff] = useState(DEFAULTS.cutoff);
  const [position, setPosition] = useState(DEFAULTS.position); // 0 to 400: four legs of 100
  const [predicted, setPredicted] = useState<number | null>(null);
  const frameRef = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const locked = predicted === null;

  // The peak temperature must stay above the temperature after compression,
  // otherwise "heat added" would be negative.
  const t2 = T1 * r ** (GAMMA - 1);
  const minT3 = Math.ceil((t2 + 150) / 50) * 50;
  const peak = Math.max(t3, minT3);

  const result = solveEngine({ kind, r, p1: P1, t1: T1, t3: peak, cutoff });
  const [s1, s2, s3, s4] = result.states;
  const now = stateAt(result, kind, position / 100);
  const leg = Math.min(3, Math.floor(position / 100));

  const topBar = axisTop(s3.p / 100);
  const gy = (kPa: number) =>
    12 + (1 - kPa / 100 / topBar) * (PLOT_BOTTOM - 12);
  const fraction = (v: number) => v / s1.v;

  // The closed loop, sampled along each of the four legs.
  const loop = Array.from({ length: 97 }, (_, index) => {
    const s = stateAt(result, kind, index / 24);
    return `${gx(fraction(s.v)).toFixed(1)} ${gy(s.p).toFixed(1)}`;
  });
  const loopPath = `M ${loop.join(" L ")} Z`;

  const heat = Math.min(
    1,
    Math.max(0, Math.log(now.t / T1) / Math.log(T_HOT / T1))
  );
  const corners = [s1, s2, s3, s4];

  function chooseKind(next: CycleKind) {
    setKind(next);
    setR(TYPICAL_R[next]);
    setPosition(0);
  }

  function play() {
    cancelAnimationFrame(frameRef.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPosition(400);
      return;
    }
    const start = performance.now();
    const step = (time: number) => {
      const done = Math.min(1, (time - start) / 6000);
      setPosition(Math.round(done * 400));
      if (done < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
  }

  function reset() {
    cancelAnimationFrame(frameRef.current);
    setKind(DEFAULTS.kind);
    setR(DEFAULTS.r);
    setT3(DEFAULTS.t3);
    setCutoff(DEFAULTS.cutoff);
    setPosition(DEFAULTS.position);
  }

  const efficiencyRule: ReactNode =
    kind === "otto" ? (
      <>
        η = 1 − 1 / r<sup>γ−1</sup>
      </>
    ) : (
      <>
        η = 1 − (ρ<sup>γ</sup> − 1) / [γ r<sup>γ−1</sup> (ρ − 1)]
      </>
    );
  const efficiencyNumbers =
    kind === "otto"
      ? `1 − 1 / ${fmt(r, 1)}^0.4`
      : `1 − (${fmt(cutoff, 1)}^1.4 − 1) / [1.4 × ${fmt(r, 1)}^0.4 × (${fmt(
          cutoff,
          1
        )} − 1)]`;

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
            aria-label={`Pressure-volume diagram of the ${kind} cycle. Efficiency ${fmt(
              result.efficiency * 100
            )} percent.`}
          >
            <path
              d={loopPath}
              fill={AMBER}
              fillOpacity='0.3'
              stroke={INK}
              strokeWidth='2'
              strokeLinejoin='round'
            />
            <line
              x1={LEFT}
              y1={PLOT_BOTTOM}
              x2={W - 8}
              y2={PLOT_BOTTOM}
              stroke={RULE}
              strokeWidth='1.5'
            />
            <line
              x1={LEFT}
              y1='8'
              x2={LEFT}
              y2={PLOT_BOTTOM}
              stroke={RULE}
              strokeWidth='1.5'
            />

            {[0.25, 0.5, 0.75, 1].map((tick) => (
              <g key={tick}>
                <line
                  x1={gx(tick)}
                  y1={PLOT_BOTTOM}
                  x2={gx(tick)}
                  y2={PLOT_BOTTOM + 5}
                  stroke={SOFT}
                />
                <text
                  x={gx(tick)}
                  y={PLOT_BOTTOM + 18}
                  fontSize='11'
                  fill={SOFT}
                  textAnchor='middle'
                >
                  {tick}
                </text>
              </g>
            ))}
            {[0.25, 0.5, 0.75, 1].map((part) => (
              <g key={part}>
                <line
                  x1={LEFT - 5}
                  y1={gy(part * topBar * 100)}
                  x2={LEFT}
                  y2={gy(part * topBar * 100)}
                  stroke={SOFT}
                />
                <text
                  x={LEFT - 8}
                  y={gy(part * topBar * 100) + 4}
                  fontSize='11'
                  fill={SOFT}
                  textAnchor='end'
                >
                  {part * topBar}
                </text>
              </g>
            ))}
            <text
              x={W - 8}
              y={PLOT_BOTTOM + 34}
              fontSize='12'
              fill={SOFT}
              textAnchor='end'
            >
              Volume, as a fraction of V₁
            </text>
            <text x={LEFT + 8} y='18' fontSize='12' fill={SOFT}>
              p (bar)
            </text>
            <text
              x={(gx(fraction(s2.v)) + gx(1)) / 2}
              y={gy((s3.p + s1.p) / 4)}
              fontSize='12'
              fontWeight='600'
              fill='#7a5600'
              textAnchor='middle'
            >
              net work
            </text>

            <line
              x1={gx(fraction(now.v))}
              y1={gy(now.p)}
              x2={gx(fraction(now.v))}
              y2={STRIP_TOP}
              stroke={ACCENT}
              strokeDasharray='4 4'
            />

            {/* the same piston, drawn flat: its face sits at V on the axis above */}
            <rect
              x={gx(0)}
              y={STRIP_TOP}
              width={gx(fraction(now.v)) - gx(0)}
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
              x={gx(fraction(now.v))}
              y={STRIP_TOP}
              width='6'
              height={STRIP_HEIGHT}
              fill='#3a4658'
            />
            <rect
              x={gx(fraction(now.v)) + 6}
              y={STRIP_TOP + STRIP_HEIGHT / 2 - 2}
              width={Math.max(0, W - 8 - gx(fraction(now.v)) - 6)}
              height='4'
              fill='#3a4658'
            />

            {corners.map((corner, index) => (
              <g key={index}>
                <circle
                  cx={gx(fraction(corner.v))}
                  cy={gy(corner.p)}
                  r='3.5'
                  fill={INK}
                />
                <text
                  x={
                    gx(fraction(corner.v)) +
                    (index === 0 || index === 3 ? 8 : -8)
                  }
                  y={gy(corner.p) + (index === 0 || index === 1 ? 14 : -6)}
                  fontSize='12'
                  fill={INK}
                  textAnchor={index === 0 || index === 3 ? "start" : "end"}
                >
                  {index + 1}
                </text>
              </g>
            ))}
            <circle
              cx={gx(fraction(now.v))}
              cy={gy(now.p)}
              r='6'
              fill={AMBER}
              stroke={INK}
              strokeWidth='1.5'
            />
          </svg>
          <figcaption>
            {LEGS[kind][leg]}. The shaded loop is the net work of one cycle:{" "}
            {fmt(result.work)} kJ per kg of air.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <figure className='widget-figure'>
            <PistonScene volume={0.2 * fraction(now.v)} heat={heat} />
            <figcaption>
              The gas now: {fmt(now.p / 100)} bar and {fmt(now.t, 0)} K. Blue is
              cold, red is hot.
            </figcaption>
          </figure>

          <div className='controls'>
            <div className='segments' role='group' aria-label='Cycle'>
              <button
                className='segment'
                aria-pressed={kind === "otto"}
                disabled={locked}
                onClick={() => chooseKind("otto")}
              >
                Otto (petrol)
              </button>
              <button
                className='segment'
                aria-pressed={kind === "diesel"}
                disabled={locked}
                onClick={() => chooseKind("diesel")}
              >
                Diesel
              </button>
            </div>

            <Slider
              id='engine-position'
              label='Turn the engine'
              display={`leg ${leg + 1} of 4`}
              min={0}
              max={400}
              step={1}
              value={position}
              disabled={locked}
              onChange={setPosition}
            />
            <Slider
              id='engine-r'
              label='Compression ratio r'
              display={fmt(r, 1)}
              min={4}
              max={22}
              step={0.5}
              value={r}
              disabled={locked}
              onChange={setR}
            />
            {kind === "otto" ? (
              <Slider
                id='engine-t3'
                label={
                  <>
                    Peak temperature T<sub>3</sub>
                  </>
                }
                display={`${fmt(peak, 0)} K`}
                min={minT3}
                max={T_HOT}
                step={50}
                value={peak}
                disabled={locked}
                onChange={setT3}
              />
            ) : (
              <Slider
                id='engine-cutoff'
                label='Cut-off ratio ρ'
                display={fmt(cutoff, 1)}
                min={1.2}
                max={3}
                step={0.1}
                value={cutoff}
                disabled={locked}
                onChange={setCutoff}
              />
            )}

            <div className='control-buttons'>
              <button className='button' onClick={play} disabled={locked}>
                Run one cycle
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
          <dt>Air-standard efficiency, {efficiencyRule}</dt>
          <dd>
            {efficiencyNumbers} = <b>{fmt(result.efficiency * 100)}%</b>
          </dd>
        </div>
        <div>
          <dt>Temperatures at the corners (T₁ = {T1} K, p₁ = 1 bar)</dt>
          <dd>
            T₂ = <b>{fmt(s2.t, 0)} K</b>, T₃ = <b>{fmt(s3.t, 0)} K</b>, T₄ ={" "}
            <b>{fmt(s4.t, 0)} K</b>
          </dd>
        </div>
        <div>
          <dt>Heat added and net work, per kg of air</dt>
          <dd>
            Q = <b>{fmt(result.heatIn)} kJ</b>, W = ηQ ={" "}
            <b>{fmt(result.work)} kJ</b>
          </dd>
        </div>
        <div>
          <dt>Mean effective pressure, MEP = W / (V₁ − V₂)</dt>
          <dd>
            <b>{fmt(result.mep, 0)} kPa</b> ({fmt(result.mep / 100, 2)} bar)
          </dd>
        </div>
        <div>
          <dt>Pressures at the corners</dt>
          <dd>
            p₂ = <b>{fmt(s2.p / 100)} bar</b>, p₃ = <b>{fmt(s3.p / 100)} bar</b>
            , p₄ = <b>{fmt(s4.p / 100, 2)} bar</b>
          </dd>
        </div>
        <div>
          <dt>Clearance volume, as a share of swept volume = 1 / (r − 1)</dt>
          <dd>
            <b>{fmt(result.clearancePercent)}%</b>
          </dd>
        </div>
      </dl>
    </div>
  );
}
