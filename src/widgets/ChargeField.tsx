import { useState } from "react";
import { coulombForce, fieldAt, potentialAt } from "./charges/solver";
import type { Charge } from "./charges/solver";
import Plot from "./shared/Plot";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Slider from "./shared/Slider";
import { ACCENT, AMBER, AMBER_TEXT, GOOD, INK, SOFT, fmt } from "./shared/theme";

const POSITIVE = "#c2410c";
const NEGATIVE = ACCENT;
const DEFAULTS = { q1: 2, q2: -2, gap: 20, px: 0, py: 8 }; // μC, μC, cm, cm, cm
const X = 20; // the drawing runs from −20 cm to +20 cm across
const Y = 15;

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: two small charged balls 10 cm apart push each other apart with a force of 9 N. You move them to 20 cm apart. What is the force now?",
  options: ["18 N", "4.5 N", "2.25 N", "9 N"],
  correct: 2,
  explain:
    "2.25 N. Coulomb's law is an inverse square law: F = k q₁ q₂ ÷ r². Double the distance and r² becomes four times bigger, so the force drops to a quarter: 9 ÷ 4 = 2.25 N. Try it below: note the force, then double the gap.",
};

// Follow the field from a point in small steps to draw one field line.
function trace(charges: Charge[], x0: number, y0: number, sign: 1 | -1): [number, number][] {
  const points: [number, number][] = [[x0, y0]];
  let x = x0;
  let y = y0;
  const step = 0.003; // m
  for (let i = 0; i < 500; i += 1) {
    const e = fieldAt(charges, x, y);
    if (e.size === 0) break;
    x += (sign * step * e.ex) / e.size;
    y += (sign * step * e.ey) / e.size;
    points.push([x, y]);
    if (Math.abs(x) > X / 100 + 0.02 || Math.abs(y) > Y / 100 + 0.02) break;
    if (charges.some((c) => Math.hypot(x - c.x, y - c.y) < 0.006)) break;
  }
  return points;
}

function fieldLines(charges: Charge[]): [number, number][][] {
  // Start from the positive charges and follow the field; if there are none,
  // start from the negative ones and go backwards along it.
  const sources = charges.filter((c) => c.q > 0);
  const starts = sources.length > 0 ? sources : charges.filter((c) => c.q < 0);
  const sign: 1 | -1 = sources.length > 0 ? 1 : -1;
  const lines: [number, number][][] = [];
  for (const charge of starts) {
    const count = Math.max(6, Math.round(Math.abs(charge.q) * 6));
    for (let i = 0; i < count; i += 1) {
      const a = (2 * Math.PI * (i + 0.5)) / count;
      lines.push(trace(charges, charge.x + 0.008 * Math.cos(a), charge.y + 0.008 * Math.sin(a), sign));
    }
  }
  return lines;
}

export default function ChargeField(_props: { topicSlug: string }) {
  const [q1, setQ1] = useState(DEFAULTS.q1);
  const [q2, setQ2] = useState(DEFAULTS.q2);
  const [gap, setGap] = useState(DEFAULTS.gap);
  const [px, setPx] = useState(DEFAULTS.px);
  const [py, setPy] = useState(DEFAULTS.py);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  // Work in SI units: coulombs and metres.
  const r = gap / 100;
  const charges: Charge[] = [
    { q: q1 * 1e-6, x: -r / 2, y: 0 },
    { q: q2 * 1e-6, x: r / 2, y: 0 },
  ].filter((c) => c.q !== 0);
  const force = coulombForce(q1 * 1e-6, q2 * 1e-6, r);
  const probe = fieldAt(charges, px / 100, py / 100);
  const potential = potentialAt(charges, px / 100, py / 100);
  const lines = charges.length > 0 ? fieldLines(charges) : [];
  const repel = force > 0;

  return (
    <div className='widget'>
      <Prediction data={PREDICTION} predicted={predicted} onPredict={setPredicted} />

      <div className='widget-grid'>
        <figure className='widget-figure'>
          <Plot
            x={[-X, X]}
            y={[-Y, Y]}
            xTicks={[-20, -10, 0, 10, 20]}
            yTicks={[-10, 0, 10]}
            xLabel='x (cm)'
            yLabel='y (cm)'
            height={300}
            label={`Field lines round a ${fmt(q1, 1)} microcoulomb charge and a ${fmt(
              q2,
              1
            )} microcoulomb charge ${fmt(gap, 0)} centimetres apart.`}
          >
            {(sx, sy) => {
              const cm = (p: [number, number]) => `${sx(p[0] * 100)},${sy(p[1] * 100)}`;
              // Probe arrow: fixed length, pointing along the field.
              const len = 26;
              const ux = probe.size > 0 ? probe.ex / probe.size : 0;
              const uy = probe.size > 0 ? probe.ey / probe.size : 0;
              const ppx = sx(px);
              const ppy = sy(py);
              return (
                <>
                  <clipPath id='charge-plot-area'>
                    <rect x={sx(-X)} y={sy(Y)} width={sx(X) - sx(-X)} height={sy(-Y) - sy(Y)} />
                  </clipPath>
                  {lines.map((line, index) => (
                    <polyline
                      clipPath='url(#charge-plot-area)'
                      key={index}
                      points={line.map(cm).join(" ")}
                      fill='none'
                      stroke={SOFT}
                      strokeOpacity='0.55'
                      strokeWidth='1.2'
                    />
                  ))}
                  {[
                    { q: q1, x: -gap / 2, dir: repel ? -1 : 1 },
                    { q: q2, x: gap / 2, dir: repel ? 1 : -1 },
                  ].map((c, index) =>
                    c.q === 0 ? (
                      <circle key={index} cx={sx(c.x)} cy={sy(0)} r='9' fill='#fff' stroke={SOFT} strokeDasharray='3 2' />
                    ) : (
                      <g key={index}>
                        {q1 !== 0 && q2 !== 0 && (
                          <line
                            x1={sx(c.x)}
                            y1={sy(0)}
                            x2={sx(c.x) + c.dir * 30}
                            y2={sy(0)}
                            stroke={AMBER}
                            strokeWidth='3'
                            markerEnd='url(#charge-arrow)'
                          />
                        )}
                        <circle cx={sx(c.x)} cy={sy(0)} r='11' fill={c.q > 0 ? POSITIVE : NEGATIVE} stroke='#fff' strokeWidth='2' />
                        <text x={sx(c.x)} y={sy(0) + 5} fontSize='15' fontWeight='700' fill='#fff' textAnchor='middle'>
                          {c.q > 0 ? "+" : "−"}
                        </text>
                      </g>
                    )
                  )}
                  <defs>
                    <marker id='charge-arrow' viewBox='0 0 10 10' refX='8' refY='5' markerWidth='5' markerHeight='5' orient='auto'>
                      <path d='M0,0 L10,5 L0,10 z' fill={AMBER} />
                    </marker>
                    <marker id='probe-arrow' viewBox='0 0 10 10' refX='8' refY='5' markerWidth='5' markerHeight='5' orient='auto'>
                      <path d='M0,0 L10,5 L0,10 z' fill={GOOD} />
                    </marker>
                  </defs>
                  <circle cx={ppx} cy={ppy} r='4' fill={GOOD} />
                  {probe.size > 0 && (
                    <line
                      x1={ppx}
                      y1={ppy}
                      x2={ppx + ux * len}
                      y2={ppy - uy * len}
                      stroke={GOOD}
                      strokeWidth='2.5'
                      markerEnd='url(#probe-arrow)'
                    />
                  )}
                  <text x={ppx + 8} y={ppy + 16} fontSize='11' fill={GOOD}>
                    P
                  </text>
                </>
              );
            }}
          </Plot>
          <figcaption>
            Grey lines are field lines: they leave <span style={{ color: POSITIVE, fontWeight: 600 }}>positive</span>{" "}
            charges and end on <span style={{ color: NEGATIVE, fontWeight: 600 }}>negative</span> ones. Where they
            crowd together the field is strong. The <span style={{ color: AMBER_TEXT, fontWeight: 600 }}>yellow</span>{" "}
            arrows show the push or pull on each charge; the <span style={{ color: GOOD, fontWeight: 600 }}>green</span>{" "}
            arrow shows which way a small positive test charge at P would be pushed.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <div className='controls'>
            <Slider id='q1' label={<>Left charge q<sub>1</sub></>} display={`${fmt(q1, 1)} μC`} min={-5} max={5} step={0.5} value={q1} disabled={locked} onChange={setQ1} />
            <Slider id='q2' label={<>Right charge q<sub>2</sub></>} display={`${fmt(q2, 1)} μC`} min={-5} max={5} step={0.5} value={q2} disabled={locked} onChange={setQ2} />
            <Slider id='gap' label='Distance apart r' display={`${fmt(gap, 0)} cm`} min={4} max={30} step={1} value={gap} disabled={locked} onChange={setGap} />
            <Slider id='px' label='Point P, across' display={`${fmt(px, 0)} cm`} min={-X} max={X} step={1} value={px} disabled={locked} onChange={setPx} />
            <Slider id='py' label='Point P, up' display={`${fmt(py, 0)} cm`} min={-Y} max={Y} step={1} value={py} disabled={locked} onChange={setPy} />
            <div className='control-buttons'>
              <button className='button button-quiet' disabled={locked} onClick={() => { setQ1(2); setQ2(2); }}>
                Two positives
              </button>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  setQ1(DEFAULTS.q1);
                  setQ2(DEFAULTS.q2);
                  setGap(DEFAULTS.gap);
                  setPx(DEFAULTS.px);
                  setPy(DEFAULTS.py);
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
                label: "F = k q₁ q₂ ÷ r²",
                value: (
                  <span style={{ color: GOOD }}>
                    {fmt(Math.abs(force), 3)} N {force === 0 ? "" : repel ? "(repel)" : "(attract)"}
                  </span>
                ),
              },
              { label: "E at P (sum of both fields)", value: `${(probe.size / 1000).toFixed(1)} kN/C` },
              { label: "V at P = k q₁ ÷ r₁ + k q₂ ÷ r₂", value: `${(potential / 1000).toFixed(1)} kV` },
              {
                label: "Force on 1 nC placed at P = q E",
                value: <span style={{ color: INK }}>{(probe.size * 1e-9 * 1000).toFixed(3)} mN</span>,
              },
            ]}
          />
        </div>
      </div>
      <p className='hint'>
        k = 8.99 × 10⁹ N m²/C². 1 μC = 10⁻⁶ C. Field lines are drawn in the flat page only; in real life they spread out in 3D.
      </p>
    </div>
  );
}

