import { useState } from "react";
import { solvePipe } from "./bernoulli/solver";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Slider from "./shared/Slider";
import { ACCENT, AMBER, GOOD, INK, SOFT, TINT, fmt } from "./shared/theme";

const D1 = 0.2; // m, fixed inlet diameter
const DEFAULTS = { d2: 0.1, v1: 2, p1: 150, z2: 0 };

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: water flows along a level pipe into a narrower section. In the narrow section, what happens to the pressure?",
  options: [
    "It rises, because the water is squeezed",
    "It falls, because the water speeds up",
    "It stays the same",
  ],
  correct: 1,
  explain:
    "The same flow must pass through a smaller area, so the water speeds up. Its kinetic energy rises, and with no energy added that can only come from the pressure, which falls. Narrow the pipe below and watch the pressure head shrink as the velocity head grows.",
};

// Drawing scale: metres of head to drawing units.
const HEAD = 9;
const BASE = 228; // y of the datum line

export default function BernoulliPipe(_props: { topicSlug: string }) {
  const [d2, setD2] = useState(DEFAULTS.d2);
  const [v1, setV1] = useState(DEFAULTS.v1);
  const [p1, setP1] = useState(DEFAULTS.p1);
  const [z2, setZ2] = useState(DEFAULTS.z2);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const { one, two, flow, totalHead } = solvePipe({
    d1: D1,
    d2,
    v1,
    p1,
    z1: 0,
    z2,
  });
  const below = two.p < 0;

  // Pipe half-thicknesses on the drawing, and the centre-line height of each section.
  const r1 = D1 * 60;
  const r2 = d2 * 60;
  const y1 = BASE - 30;
  const y2 = BASE - 30 - z2 * HEAD;
  const columns = [
    { x: 90, y: y1, r: r1, section: one, name: "1" },
    { x: 270, y: y2, r: r2, section: two, name: "2" },
  ];

  return (
    <div className='widget'>
      <Prediction
        data={PREDICTION}
        predicted={predicted}
        onPredict={setPredicted}
      />

      <div className='widget-grid'>
        <figure className='widget-figure'>
          <svg
            viewBox='0 0 360 250'
            role='img'
            aria-label={`Pipe narrowing from 200 millimetres to ${fmt(
              d2 * 1000,
              0
            )} millimetres with a standpipe at each section`}
          >
            {/* total head line: the same height at both sections */}
            <line
              x1='20'
              y1={y1 - totalHead * HEAD}
              x2='340'
              y2={y1 - totalHead * HEAD}
              stroke={GOOD}
              strokeWidth='1.5'
              strokeDasharray='6 4'
            />
            <text
              x='180'
              y={y1 - totalHead * HEAD - 6}
              fontSize='11'
              fill={GOOD}
              textAnchor='middle'
            >
              total head {fmt(totalHead)} m
            </text>

            {/* the pipe */}
            <path
              d={`M20 ${y1 - r1} H140 L220 ${y2 - r2} H340 V${
                y2 + r2
              } H220 L140 ${y1 + r1} H20 Z`}
              fill={TINT}
              stroke={INK}
              strokeWidth='2'
              strokeLinejoin='round'
            />
            <line
              x1='20'
              y1={BASE}
              x2='340'
              y2={BASE}
              stroke={SOFT}
              strokeWidth='1'
            />
            <text x='22' y={BASE + 14} fontSize='11' fill={SOFT}>
              datum (z = 0)
            </text>

            {columns.map(({ x, y, r, section, name }) => {
              const water = Math.max(0, section.pressureHead) * HEAD;
              return (
                <g key={name}>
                  {/* standpipe: the water rises to the pressure head */}
                  <rect
                    x={x - 5}
                    y={y - r - water}
                    width='10'
                    height={water}
                    fill={ACCENT}
                    fillOpacity='0.7'
                  />
                  <path
                    d={`M${x - 5} ${y - r} V${y1 - totalHead * HEAD - 6} M${
                      x + 5
                    } ${y - r} V${y1 - totalHead * HEAD - 6}`}
                    stroke={INK}
                    strokeWidth='1.5'
                    fill='none'
                  />
                  {/* the gap up to the total head line is the velocity head */}
                  <rect
                    x={x + 12}
                    y={y1 - totalHead * HEAD}
                    width='6'
                    height={section.velocityHead * HEAD}
                    fill={AMBER}
                  />
                  <text
                    x={x}
                    y={y + r + 14}
                    fontSize='11'
                    fill={SOFT}
                    textAnchor='middle'
                  >
                    <tspan fontWeight='600' fill={INK}>
                      {name}
                    </tspan>
                    : {fmt(section.v, 1)} m/s
                  </text>
                </g>
              );
            })}
          </svg>
          <ul className='legend'>
            <li>
              <span className='swatch' style={{ background: ACCENT }} />
              pressure head p/ρg
            </li>
            <li>
              <span className='swatch' style={{ background: AMBER }} />
              velocity head v²/2g
            </li>
            <li>
              <span className='swatch' style={{ background: GOOD }} />
              total head (constant)
            </li>
          </ul>
        </figure>

        <div className='widget-side'>
          <div className='controls'>
            <Slider
              id='bern-d2'
              label={
                <>
                  Diameter at 2, d<sub>2</sub>
                </>
              }
              display={`${fmt(d2 * 1000, 0)} mm`}
              min={0.08}
              max={0.3}
              step={0.01}
              value={d2}
              disabled={locked}
              onChange={setD2}
            />
            <Slider
              id='bern-v1'
              label={
                <>
                  Velocity at 1, v<sub>1</sub>
                </>
              }
              display={`${fmt(v1, 1)} m/s`}
              min={0.5}
              max={3}
              step={0.1}
              value={v1}
              disabled={locked}
              onChange={setV1}
            />
            <Slider
              id='bern-p1'
              label={
                <>
                  Pressure at 1, p<sub>1</sub>
                </>
              }
              display={`${fmt(p1, 0)} kPa`}
              min={50}
              max={180}
              step={5}
              value={p1}
              disabled={locked}
              onChange={setP1}
            />
            <Slider
              id='bern-z2'
              label={
                <>
                  Height of section 2, z<sub>2</sub>
                </>
              }
              display={`${fmt(z2, 1)} m`}
              min={-2}
              max={4}
              step={0.5}
              value={z2}
              disabled={locked}
              onChange={setZ2}
            />
            <div className='control-buttons'>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  setD2(DEFAULTS.d2);
                  setV1(DEFAULTS.v1);
                  setP1(DEFAULTS.p1);
                  setZ2(DEFAULTS.z2);
                }}
              >
                Reset
              </button>
            </div>
            {below && (
              <p className='feedback'>
                <strong>Below atmospheric.</strong> The pressure at section 2
                has gone negative (gauge). A real pipe would start to cavitate
                here.
              </p>
            )}
            {locked && (
              <p className='hint'>
                Answer the question above to unlock the controls.
              </p>
            )}
          </div>
        </div>
      </div>

      <Readout
        rows={[
          {
            label: (
              <>
                Continuity, v<sub>2</sub> = v<sub>1</sub> (d<sub>1</sub> / d
                <sub>2</sub>)²
              </>
            ),
            value: (
              <>
                {fmt(v1, 1)} × (200 / {fmt(d2 * 1000, 0)})² ={" "}
                <b>{fmt(two.v)} m/s</b>
              </>
            ),
          },
          {
            label: "Volume flow rate, Q = A₁v₁",
            value: <b>{fmt(flow * 1000, 1)} litres/s</b>,
          },
          {
            label: (
              <>
                Bernoulli, p<sub>2</sub> = p<sub>1</sub> + ρ(v<sub>1</sub>² − v
                <sub>2</sub>²)/2 + ρg(z<sub>1</sub> − z<sub>2</sub>)
              </>
            ),
            value: <b>{fmt(two.p, 1)} kPa</b>,
          },
          {
            label: "Heads at section 1: pressure + velocity + height",
            value: (
              <>
                {fmt(one.pressureHead)} + {fmt(one.velocityHead)} +{" "}
                {fmt(one.elevation)} = <b>{fmt(totalHead)} m</b>
              </>
            ),
          },
          {
            label: "Heads at section 2: pressure + velocity + height",
            value: (
              <>
                {fmt(two.pressureHead)} + {fmt(two.velocityHead)} +{" "}
                {fmt(two.elevation)} = <b>{fmt(totalHead)} m</b>
              </>
            ),
          },
          {
            label: "Assumptions",
            value: "water, steady flow, no friction losses",
          },
        ]}
      />
    </div>
  );
}
