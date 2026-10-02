import { useState } from "react";
import type { ReactNode } from "react";
import { solveMohr } from "./mohr/solver";

// ---- Drawing constants -------------------------------------------------
const INK = "#16202e";
const SOFT = "#5b6676";
const RULE = "#d5dbe4";
const ACCENT = "#1f6feb";
const AMBER = "#f2a900";
const SHEAR = "#b26a00";

// The circle plot: 360 x 270 drawing units, origin in the middle.
// The scale is FIXED (not auto-fit) so a bigger stress really looks bigger.
// It is sized so the largest circle the sliders can make still fits.
const W = 360;
const H = 270;
const OX = W / 2;
const OY = H / 2;
const SCALE = 0.85; // drawing units per MPa
const SIGMA_LIMIT = 120; // slider range for σx and σy, MPa
const TAU_LIMIT = 80; // slider range for τxy, MPa
const px = (sigma: number) => OX + sigma * SCALE;
const py = (tau: number) => OY + tau * SCALE; // shear is plotted downwards

// A white outline behind plot labels keeps them readable when the circle passes over them.
const HALO = { stroke: "#fff", strokeWidth: 3, paintOrder: "stroke" } as const;

const DEFAULTS = { sx: 80, sy: -40, txy: 30, theta: 0 };

const PREDICTION = {
  prompt:
    "Before you touch anything: τxy is 30 MPa. If you raise it to 60 MPa and leave σx and σy alone, what happens to the circle?",
  options: [
    "It grows, and its centre stays where it is",
    "It shrinks",
    "It keeps its size and slides to the right",
  ],
  correct: 0,
  explain:
    "The centre is C = (σx + σy) / 2. There is no τxy in it, so the centre cannot move. The radius has τxy in it, so the circle grows. Drag τxy and check.",
};

// Avoids showing "-0.00" for values that are zero within rounding.
const fmt = (n: number, digits = 2) =>
  (Math.abs(n) < 0.005 ? 0 : n).toFixed(digits);
// Negative numbers get brackets when substituted into a formula: (-40), not + -40.
const sub = (n: number) => (n < 0 ? `(${fmt(n, 0)})` : fmt(n, 0));

type SliderProps = {
  id: string;
  label: ReactNode;
  unit: string;
  min: number;
  max: number;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
};

function Slider({
  id,
  label,
  unit,
  min,
  max,
  value,
  disabled,
  onChange,
}: SliderProps) {
  return (
    <div className='slider'>
      <label htmlFor={id}>{label}</label>
      <output htmlFor={id}>
        {fmt(value, 0)} {unit}
      </output>
      <input
        id={id}
        type='range'
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

type ArrowProps = {
  from: [number, number];
  to: [number, number];
  flip: boolean;
  shear?: boolean;
};

// One stress arrow. "flip" reverses it, which is how a negative stress is shown.
function Arrow({ from, to, flip, shear = false }: ArrowProps) {
  const a = flip ? to : from;
  const b = flip ? from : to;
  return (
    <line
      x1={a[0]}
      y1={a[1]}
      x2={b[0]}
      y2={b[1]}
      stroke={shear ? SHEAR : INK}
      strokeWidth='2'
      markerEnd={shear ? "url(#mohr-arrow-shear)" : "url(#mohr-arrow-normal)"}
    />
  );
}

export default function MohrCircle(_props: { topicSlug: string }) {
  const [sx, setSx] = useState(DEFAULTS.sx);
  const [sy, setSy] = useState(DEFAULTS.sy);
  const [txy, setTxy] = useState(DEFAULTS.txy);
  const [theta, setTheta] = useState(DEFAULTS.theta);
  const [predicted, setPredicted] = useState<number | null>(null);

  const locked = predicted === null;
  const r = solveMohr({ sx, sy, txy, thetaDeg: theta });

  // Screen positions. X is the x face of the element, Y is the y face.
  const cx = px(r.center);
  const radius = r.radius * SCALE;
  const refX = { x: px(sx), y: py(txy) };
  const refY = { x: px(sy), y: py(-txy) };
  const rotX = { x: px(r.sxT), y: py(r.txyT) };
  const rotY = { x: px(r.syT), y: py(-r.txyT) };
  const hasCircle = radius > 0.5;

  // Put the X′ label just outside the circle, on the line from the centre through X′.
  const labelAngle = hasCircle
    ? Math.atan2(rotX.y - OY, rotX.x - cx)
    : -Math.PI / 4;
  const labelPos = {
    x: rotX.x + 16 * Math.cos(labelAngle),
    y: rotX.y + 16 * Math.sin(labelAngle) + 4,
  };

  // Arc at the centre showing the 2θ the point has travelled.
  const twoTheta = (2 * theta) % 360;
  const arcR = Math.min(18, radius * 0.6);
  const startAngle = Math.atan2(txy, (sx - sy) / 2);
  const endAngle = startAngle - (twoTheta * Math.PI) / 180;
  const arcPath = `M ${cx + arcR * Math.cos(startAngle)} ${
    OY + arcR * Math.sin(startAngle)
  } A ${arcR} ${arcR} 0 ${twoTheta > 180 ? 1 : 0} 0 ${
    cx + arcR * Math.cos(endAngle)
  } ${OY + arcR * Math.sin(endAngle)}`;

  // Arrow lengths grow with the size of the stress, so a small stress looks small.
  const share = (value: number, limit: number) =>
    Math.min(1, Math.abs(value) / limit);
  const lenX = 16 + 22 * share(r.sxT, SIGMA_LIMIT);
  const lenY = 16 + 22 * share(r.syT, SIGMA_LIMIT);
  const halfShear = 11 + 13 * share(r.txyT, TAU_LIMIT);

  function reset() {
    setSx(DEFAULTS.sx);
    setSy(DEFAULTS.sy);
    setTxy(DEFAULTS.txy);
    setTheta(DEFAULTS.theta);
  }

  function goToPrincipal() {
    // θ and θ + 180° are the same orientation, so keep the slider in 0 to 180.
    setTheta(((r.thetaPDeg % 180) + 180) % 180);
  }

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
            aria-label={`Mohr's circle with centre ${fmt(
              r.center
            )} and radius ${fmt(r.radius)} megapascals`}
          >
            {/* axes */}
            <line
              x1='8'
              y1={OY}
              x2={W - 8}
              y2={OY}
              stroke={RULE}
              strokeWidth='1.5'
            />
            <line
              x1={OX}
              y1='8'
              x2={OX}
              y2={H - 8}
              stroke={RULE}
              strokeWidth='1.5'
            />
            {hasCircle && (
              <>
                <circle
                  cx={cx}
                  cy={OY}
                  r={radius}
                  fill='none'
                  stroke={INK}
                  strokeWidth='2'
                />
                {/* where the element started (θ = 0) */}
                <line
                  x1={refX.x}
                  y1={refX.y}
                  x2={refY.x}
                  y2={refY.y}
                  stroke={SOFT}
                  strokeDasharray='4 4'
                />
                {/* where it is now */}
                <line
                  x1={rotX.x}
                  y1={rotX.y}
                  x2={rotY.x}
                  y2={rotY.y}
                  stroke={ACCENT}
                  strokeWidth='2'
                />
                {twoTheta > 0.5 && (
                  <path
                    d={arcPath}
                    fill='none'
                    stroke={AMBER}
                    strokeWidth='2.5'
                  />
                )}
              </>
            )}

            {/* ticks and labels go on top of the circle so they stay readable */}
            {[-150, -100, -50, 50, 100, 150].map((tick) => (
              <g key={tick}>
                <line
                  x1={px(tick)}
                  y1={OY - 4}
                  x2={px(tick)}
                  y2={OY + 4}
                  stroke={SOFT}
                />
                <text
                  x={px(tick)}
                  y={OY + 18}
                  fontSize='11'
                  fill={SOFT}
                  textAnchor='middle'
                  {...HALO}
                >
                  {tick}
                </text>
              </g>
            ))}
            {[-100, -50, 50, 100].map((tick) => (
              <g key={tick}>
                <line
                  x1={OX - 4}
                  y1={py(tick)}
                  x2={OX + 4}
                  y2={py(tick)}
                  stroke={SOFT}
                />
                {Math.abs(tick) === 100 && (
                  <text
                    x={OX - 8}
                    y={py(tick) + 4}
                    fontSize='11'
                    fill={SOFT}
                    textAnchor='end'
                    {...HALO}
                  >
                    {tick}
                  </text>
                )}
              </g>
            ))}
            <text
              x={W - 10}
              y={OY - 8}
              fontSize='12'
              fill={SOFT}
              textAnchor='end'
            >
              σ (MPa)
            </text>
            <text x={OX + 8} y={H - 10} fontSize='12' fill={SOFT}>
              τ, positive down
            </text>

            {/* principal stresses sit on the σ axis */}
            <circle cx={px(r.s1)} cy={OY} r='3.5' fill={INK} />
            <circle cx={px(r.s2)} cy={OY} r='3.5' fill={INK} />
            <text
              x={px(r.s1) + 6}
              y={OY - 10}
              fontSize='12'
              fill={INK}
              {...HALO}
            >
              σ₁
            </text>
            <text
              x={px(r.s2) - 6}
              y={OY - 10}
              fontSize='12'
              fill={INK}
              textAnchor='end'
              {...HALO}
            >
              σ₂
            </text>
            <circle cx={cx} cy={OY} r='2.5' fill={SOFT} />

            <circle
              cx={rotY.x}
              cy={rotY.y}
              r='4'
              fill='#fff'
              stroke={ACCENT}
              strokeWidth='2'
            />
            <circle
              cx={rotX.x}
              cy={rotX.y}
              r='6'
              fill={AMBER}
              stroke={INK}
              strokeWidth='1.5'
            />
            <text
              x={labelPos.x}
              y={labelPos.y}
              fontSize='12'
              fontWeight='600'
              fill={INK}
              textAnchor='middle'
              {...HALO}
            >
              X′
            </text>
          </svg>
          <figcaption>
            The element has turned θ = {fmt(theta, 1)}°. Point X′ has moved 2θ ={" "}
            {fmt(2 * theta, 1)}° round the circle.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <figure className='widget-figure'>
            <svg
              viewBox='0 0 200 200'
              role='img'
              aria-label={`Stress element turned ${fmt(theta, 1)} degrees`}
            >
              <defs>
                <marker
                  id='mohr-arrow-normal'
                  viewBox='0 0 10 10'
                  refX='8'
                  refY='5'
                  markerWidth='6'
                  markerHeight='6'
                  orient='auto'
                >
                  <path d='M0 0L10 5L0 10z' fill={INK} />
                </marker>
                <marker
                  id='mohr-arrow-shear'
                  viewBox='0 0 10 10'
                  refX='8'
                  refY='5'
                  markerWidth='6'
                  markerHeight='6'
                  orient='auto'
                >
                  <path d='M0 0L10 5L0 10z' fill={SHEAR} />
                </marker>
              </defs>

              {/* the starting orientation, for comparison */}
              <rect
                x='66'
                y='66'
                width='68'
                height='68'
                fill='none'
                stroke={RULE}
                strokeDasharray='4 4'
              />

              {/* SVG turns clockwise for positive angles, so the sign is flipped */}
              <g transform={`rotate(${-theta} 100 100)`}>
                <rect
                  x='66'
                  y='66'
                  width='68'
                  height='68'
                  fill='#eaf2ff'
                  stroke={INK}
                  strokeWidth='2'
                />
                <line
                  x1='100'
                  y1='100'
                  x2='134'
                  y2='100'
                  stroke={AMBER}
                  strokeWidth='2.5'
                />

                {Math.abs(r.sxT) >= 0.5 && (
                  <>
                    <Arrow
                      from={[148, 100]}
                      to={[148 + lenX, 100]}
                      flip={r.sxT < 0}
                    />
                    <Arrow
                      from={[52, 100]}
                      to={[52 - lenX, 100]}
                      flip={r.sxT < 0}
                    />
                  </>
                )}
                {Math.abs(r.syT) >= 0.5 && (
                  <>
                    <Arrow
                      from={[100, 52]}
                      to={[100, 52 - lenY]}
                      flip={r.syT < 0}
                    />
                    <Arrow
                      from={[100, 148]}
                      to={[100, 148 + lenY]}
                      flip={r.syT < 0}
                    />
                  </>
                )}
                {Math.abs(r.txyT) >= 0.5 && (
                  <>
                    <Arrow
                      shear
                      from={[141, 100 + halfShear]}
                      to={[141, 100 - halfShear]}
                      flip={r.txyT < 0}
                    />
                    <Arrow
                      shear
                      from={[100 - halfShear, 59]}
                      to={[100 + halfShear, 59]}
                      flip={r.txyT < 0}
                    />
                    <Arrow
                      shear
                      from={[59, 100 - halfShear]}
                      to={[59, 100 + halfShear]}
                      flip={r.txyT < 0}
                    />
                    <Arrow
                      shear
                      from={[100 + halfShear, 141]}
                      to={[100 - halfShear, 141]}
                      flip={r.txyT < 0}
                    />
                  </>
                )}
              </g>
            </svg>
            <figcaption>
              Black arrows are normal stress, brown arrows are shear. Longer
              arrow, bigger stress. The amber line points to the x′ face.
            </figcaption>
          </figure>

          <div className='controls'>
            <Slider
              id='mohr-sx'
              label={
                <>
                  σ<sub>x</sub>
                </>
              }
              unit='MPa'
              min={-SIGMA_LIMIT}
              max={SIGMA_LIMIT}
              value={sx}
              disabled={locked}
              onChange={setSx}
            />
            <Slider
              id='mohr-sy'
              label={
                <>
                  σ<sub>y</sub>
                </>
              }
              unit='MPa'
              min={-SIGMA_LIMIT}
              max={SIGMA_LIMIT}
              value={sy}
              disabled={locked}
              onChange={setSy}
            />
            <Slider
              id='mohr-txy'
              label={
                <>
                  τ<sub>xy</sub>
                </>
              }
              unit='MPa'
              min={-TAU_LIMIT}
              max={TAU_LIMIT}
              value={txy}
              disabled={locked}
              onChange={setTxy}
            />
            <Slider
              id='mohr-theta'
              label='θ'
              unit='°'
              min={0}
              max={180}
              value={theta}
              disabled={locked}
              onChange={setTheta}
            />
            <div className='control-buttons'>
              <button
                className='button'
                onClick={goToPrincipal}
                disabled={locked}
              >
                Turn to principal planes
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
                Answer the question above to unlock the sliders.
              </p>
            )}
          </div>
        </div>
      </div>

      <dl className='readout'>
        <div>
          <dt>
            Centre, C = (σ<sub>x</sub> + σ<sub>y</sub>) / 2
          </dt>
          <dd>
            ({sub(sx)} + {sub(sy)}) / 2 = <b>{fmt(r.center)} MPa</b>
          </dd>
        </div>
        <div>
          <dt>
            Radius, R = √[((σ<sub>x</sub> − σ<sub>y</sub>) / 2)² + τ
            <sub>xy</sub>²]
          </dt>
          <dd>
            √[{sub((sx - sy) / 2)}² + {sub(txy)}²] = <b>{fmt(r.radius)} MPa</b>
          </dd>
        </div>
        <div>
          <dt>
            Principal stresses, σ<sub>1,2</sub> = C ± R
          </dt>
          <dd>
            <b>{fmt(r.s1)} MPa</b> and <b>{fmt(r.s2)} MPa</b>
          </dd>
        </div>
        <div>
          <dt>
            Maximum shear, τ<sub>max</sub> = R
          </dt>
          <dd>
            <b>{fmt(r.tauMax)} MPa</b>
          </dd>
        </div>
        <div>
          <dt>
            Principal angle, θ<sub>p</sub> = ½ tan⁻¹[2τ<sub>xy</sub> / (σ
            <sub>x</sub> − σ<sub>y</sub>)]
          </dt>
          <dd>
            <b>{fmt(r.thetaPDeg)}°</b>
          </dd>
        </div>
        <div>
          <dt>On the turned element (θ = {fmt(theta, 1)}°)</dt>
          <dd>
            σ<sub>x′</sub> = <b>{fmt(r.sxT)}</b>, σ<sub>y′</sub> ={" "}
            <b>{fmt(r.syT)}</b>, τ<sub>x′y′</sub> = <b>{fmt(r.txyT)} MPa</b>
          </dd>
        </div>
      </dl>
    </div>
  );
}
