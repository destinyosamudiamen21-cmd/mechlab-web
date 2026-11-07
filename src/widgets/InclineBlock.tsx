import { useState } from "react";
import { solveSlope } from "./incline/solver";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Slider from "./shared/Slider";
import { ACCENT, AMBER, GOOD, INK, SOFT, STEEL, WARN, fmt } from "./shared/theme";

const G = 9.81;
const DEFAULTS = { mass: 10, angle: 25, muS: 0.5, muK: 0.35 };
const FRICTION = "#c2410c";

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: a box is sliding down a rough slope. You swap it for an identical box that is twice as heavy. What happens to its acceleration?",
  options: ["It doubles", "It stays the same", "It halves"],
  correct: 1,
  explain:
    "It stays the same. Twice the mass means twice the pull down the slope, but also twice the normal force, so twice the friction. The net force doubles, and a = F / m divides it by twice the mass again. Mass cancels: a = g (sin θ − μ cos θ). Push the mass slider below and watch the acceleration stay put.",
};

// The drawing: a slope rising to the left, the block sitting halfway up it.
const W = 360;
const H = 270;
const BASE_Y = 240;
const RIGHT_X = 330;
const RUN = 270; // horizontal length of the slope in the drawing

export default function InclineBlock(_props: { topicSlug: string }) {
  const [mass, setMass] = useState(DEFAULTS.mass);
  const [angle, setAngle] = useState(DEFAULTS.angle);
  const [muS, setMuS] = useState(DEFAULTS.muS);
  const [muK, setMuK] = useState(DEFAULTS.muK);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  // Kinetic friction can never be bigger than static friction for the same pair of surfaces.
  const kinetic = Math.min(muK, muS);
  const r = solveSlope({ mass, angle, muS, muK: kinetic, g: G });

  const theta = (angle * Math.PI) / 180;
  const leftX = RIGHT_X - RUN;
  const topY = BASE_Y - RUN * Math.tan(theta);
  // Unit vectors: down the slope, and out of the slope (perpendicular, away from it).
  const down = { x: Math.cos(theta), y: Math.sin(theta) };
  const out = { x: Math.sin(theta), y: -Math.cos(theta) };
  // Block centre: halfway along the slope, lifted half a block off it.
  const size = 34;
  const mid = { x: leftX + RUN * 0.5, y: BASE_Y - RUN * 0.5 * Math.tan(theta) };
  const centre = { x: mid.x + out.x * (size / 2), y: mid.y + out.y * (size / 2) };
  const corners = [
    [-size / 2, -size / 2],
    [size / 2, -size / 2],
    [size / 2, size / 2],
    [-size / 2, size / 2],
  ].map(([a, b]) => ({
    x: centre.x + a * down.x - b * out.x,
    y: centre.y + a * down.y - b * out.y,
  }));

  // Arrows drawn in proportion to each other: the weight is always 80 px long. (Mass scales
  // every force by the same amount, so the picture does not change with mass. That is the point.)
  const scale = 80 / r.weight;
  const arrowTo = (dx: number, dy: number) => ({ x: centre.x + dx, y: centre.y + dy });
  const weightEnd = arrowTo(0, r.weight * scale);
  const normalEnd = arrowTo(out.x * r.normal * scale, out.y * r.normal * scale);
  const frictionEnd = arrowTo(-down.x * r.friction * scale, -down.y * r.friction * scale);
  // Labels sit a little past the arrow tip, in the direction the arrow points.
  const labelAt = (end: { x: number; y: number }) => {
    const dx = end.x - centre.x;
    const dy = end.y - centre.y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: end.x + (dx / length) * 14 - 8, y: end.y + (dy / length) * 14 };
  };
  const netEnd = arrowTo(down.x * r.net * scale, down.y * r.net * scale);

  return (
    <div className='widget'>
      <Prediction data={PREDICTION} predicted={predicted} onPredict={setPredicted} />

      <div className='widget-grid'>
        <figure className='widget-figure'>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role='img'
            aria-label={`A ${mass} kg block on a ${angle} degree slope. It ${
              r.slides ? `slides with acceleration ${fmt(r.acceleration)} metres per second squared` : "stays still"
            }.`}
          >
            <defs>
              {[
                ["inc-w", STEEL],
                ["inc-n", ACCENT],
                ["inc-f", FRICTION],
                ["inc-net", GOOD],
              ].map(([id, color]) => (
                <marker
                  key={id}
                  id={id}
                  viewBox='0 0 10 10'
                  refX='8'
                  refY='5'
                  markerWidth='6'
                  markerHeight='6'
                  orient='auto-start-reverse'
                >
                  <path d='M 0 0 L 10 5 L 0 10 z' fill={color} />
                </marker>
              ))}
            </defs>
            <polygon
              points={`${leftX},${BASE_Y} ${RIGHT_X},${BASE_Y} ${leftX},${topY}`}
              fill='#e6ebf2'
              stroke={SOFT}
            />
            <path
              d={`M ${RIGHT_X - 40} ${BASE_Y} A 40 40 0 0 1 ${RIGHT_X - 40 * Math.cos(theta)} ${
                BASE_Y - 40 * Math.sin(theta)
              }`}
              fill='none'
              stroke={SOFT}
            />
            <text x={RIGHT_X - 58} y={BASE_Y - 6} fontSize='12' fill={SOFT} textAnchor='end'>
              θ = {angle}°
            </text>
            <polygon
              points={corners.map((corner) => `${corner.x},${corner.y}`).join(" ")}
              fill={r.slides ? "#fde7d9" : "#dff3e4"}
              stroke={INK}
              strokeWidth='1.5'
            />
            {[
              { end: weightEnd, id: "inc-w", color: STEEL, text: "W = mg" },
              { end: normalEnd, id: "inc-n", color: ACCENT, text: "N" },
              { end: frictionEnd, id: "inc-f", color: FRICTION, text: "F" },
            ].map((force) => (
              <g key={force.id}>
                <line
                  x1={centre.x}
                  y1={centre.y}
                  x2={force.end.x}
                  y2={force.end.y}
                  stroke={force.color}
                  strokeWidth='2.5'
                  markerEnd={`url(#${force.id})`}
                />
                <text
                  x={labelAt(force.end).x}
                  y={labelAt(force.end).y + 4}
                  fontSize='12'
                  fontWeight='600'
                  fill={force.color}
                  stroke='#fff'
                  strokeWidth='3'
                  paintOrder='stroke'
                >
                  {force.text}
                </text>
              </g>
            ))}
            {r.slides && (
              <line
                x1={centre.x}
                y1={centre.y}
                x2={netEnd.x}
                y2={netEnd.y}
                stroke={GOOD}
                strokeWidth='2'
                strokeDasharray='5 3'
                markerEnd='url(#inc-net)'
              />
            )}
            <text x='14' y='22' fontSize='13' fontWeight='600' fill={r.slides ? WARN : GOOD}>
              {r.slides ? `Sliding: a = ${fmt(r.acceleration)} m/s²` : "Not moving: friction holds it"}
            </text>
          </svg>
          <figcaption>
            Three forces act on the block: its weight (grey, straight down), the normal force (blue,
            straight out of the slope) and friction (orange, up the slope, against the motion). When
            it slides, the green dashed arrow is the net force down the slope.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <div className='controls'>
            <Slider
              id='inc-m'
              label='Mass m'
              display={`${fmt(mass, 0)} kg`}
              min={1}
              max={50}
              step={1}
              value={mass}
              disabled={locked}
              onChange={setMass}
            />
            <Slider
              id='inc-angle'
              label='Slope angle θ'
              display={`${fmt(angle, 0)}°`}
              min={0}
              max={60}
              step={1}
              value={angle}
              disabled={locked}
              onChange={setAngle}
            />
            <Slider
              id='inc-mus'
              label={
                <>
                  Static friction μ<sub>s</sub>
                </>
              }
              display={fmt(muS)}
              min={0}
              max={1}
              step={0.05}
              value={muS}
              disabled={locked}
              onChange={setMuS}
            />
            <Slider
              id='inc-muk'
              label={
                <>
                  Sliding friction μ<sub>k</sub>
                </>
              }
              display={fmt(kinetic)}
              min={0}
              max={1}
              step={0.05}
              value={muK}
              disabled={locked}
              onChange={setMuK}
            />
            <div className='control-buttons'>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => setAngle(Math.ceil(r.criticalAngle))}
              >
                Just starts to slide
              </button>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  setMuS(0);
                  setMuK(0);
                }}
              >
                Smooth (no friction)
              </button>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  setMass(DEFAULTS.mass);
                  setAngle(DEFAULTS.angle);
                  setMuS(DEFAULTS.muS);
                  setMuK(DEFAULTS.muK);
                }}
              >
                Reset
              </button>
            </div>
            {muK > muS && (
              <p className='hint'>Sliding friction cannot be bigger than static friction, so it is held at μ<sub>s</sub>.</p>
            )}
            {locked && <p className='hint'>Answer the question above to unlock the controls.</p>}
          </div>

          <Readout
            rows={[
              { label: "W = m g", value: `${fmt(r.weight, 1)} N` },
              { label: "pull down slope = W sin θ", value: `${fmt(r.along, 1)} N` },
              { label: "N = W cos θ", value: `${fmt(r.normal, 1)} N` },
              { label: "friction limit = μs N", value: `${fmt(r.maxStatic, 1)} N` },
              {
                label: r.slides ? "friction = μk N" : "friction = pull (it matches it)",
                value: <span style={{ color: FRICTION }}>{fmt(r.friction, 1)} N</span>,
              },
              { label: "net force = pull − friction", value: `${fmt(r.net, 1)} N` },
              {
                label: "a = net force / m",
                value: <span style={{ color: r.slides ? WARN : GOOD }}>{fmt(r.acceleration)} m/s²</span>,
              },
              { label: "slides above θ = tan⁻¹ μs", value: <span style={{ color: AMBER }}>{fmt(r.criticalAngle, 1)}°</span> },
            ]}
          />
        </div>
      </div>
      <p className='hint'>g = 9.81 m/s². The block starts at rest, so it slides only when the pull down the slope beats the most friction can give, μs N.</p>
    </div>
  );
}
