import { useState } from "react";
import {
  components,
  flightTime,
  peak,
  positionAt,
  range,
  velocityAt,
} from "./projectile/solver";
import type { Launch } from "./projectile/solver";
import Plot from "./shared/Plot";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Slider from "./shared/Slider";
import { ACCENT, AMBER, GOOD, INK, SOFT, fmt } from "./shared/theme";
import { useClock } from "./shared/useClock";

const G = 9.81;
const DEFAULTS = { speed: 18, angle: 40, height: 0 };
// Fixed axes so the student can compare one throw with the next.
const X_MAX = 70;
const Y_MAX = 35;

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: from the top of a 20 m building, you drop one stone and at the same moment throw another one straight out sideways. Which one hits the ground first?",
  options: [
    "The dropped stone",
    "The thrown stone",
    "They land at the same time",
  ],
  correct: 2,
  explain:
    "Same time. Sideways speed does nothing to how fast a stone falls, because gravity only pulls downwards. Both start with zero upward speed and both fall 20 m with the same g, so both take √(2 × 20 / 9.81) = 2.02 s. Set the angle to 0° and the height to 20 m below, then change the speed: the flight time does not move, only the landing point does.",
};

export default function ProjectileMotion(_props: { topicSlug: string }) {
  const [speed, setSpeed] = useState(DEFAULTS.speed);
  const [angle, setAngle] = useState(DEFAULTS.angle);
  const [height, setHeight] = useState(DEFAULTS.height);
  const [time, setTime] = useState(0);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const launch: Launch = { speed, angle, height, g: G };
  const total = flightTime(launch);
  const t = Math.min(time, total);
  const { ux, uy } = components(launch);
  const top = peak(launch);
  const here = positionAt(launch, t);
  const velocity = velocityAt(launch, t);
  const landing = range(launch);

  const clock = useClock((dt) => {
    setTime((previous) => {
      const next = previous + dt;
      if (next >= total) {
        clock.setRunning(false);
        return total;
      }
      return next;
    });
  });

  // Any change to the throw starts the clock again from the launch.
  const change = (set: (value: number) => void) => (value: number) => {
    clock.setRunning(false);
    setTime(0);
    set(value);
  };

  function play() {
    if (clock.reducedMotion) {
      setTime(total);
      return;
    }
    if (t >= total) setTime(0);
    clock.setRunning(true);
  }

  const path = Array.from({ length: 61 }, (_, index) => {
    const point = positionAt(launch, (index / 60) * total);
    return point;
  });

  return (
    <div className='widget'>
      <Prediction data={PREDICTION} predicted={predicted} onPredict={setPredicted} />

      <div className='widget-grid'>
        <figure className='widget-figure'>
          <Plot
            x={[0, X_MAX]}
            y={[0, Y_MAX]}
            xTicks={[0, 10, 20, 30, 40, 50, 60, 70]}
            yTicks={[0, 10, 20, 30]}
            xLabel='x (m)'
            yLabel='y (m)'
            height={300}
            label={`Path of a ball thrown at ${speed} m/s and ${angle} degrees from ${height} m. It lands ${fmt(
              landing,
              1
            )} m away after ${fmt(total)} s.`}
          >
            {(sx, sy) => {
              const px = sx(here.x);
              const py = sy(here.y);
              const scale = 3; // drawing units per m/s for the velocity arrows
              return (
                <>
                  {height > 0 && (
                    <rect
                      x={sx(0) - 14}
                      y={sy(height)}
                      width={14}
                      height={sy(0) - sy(height)}
                      fill='#c9d2de'
                    />
                  )}
                  <polyline
                    points={path
                      .filter((point) => point.x <= X_MAX && point.y <= Y_MAX)
                      .map((point) => `${sx(point.x)},${sy(point.y)}`)
                      .join(" ")}
                    fill='none'
                    stroke={SOFT}
                    strokeDasharray='4 4'
                  />
                  {uy > 0 && top.height <= Y_MAX && (
                    <g>
                      <line
                        x1={sx(ux * top.t)}
                        y1={sy(top.height)}
                        x2={sx(ux * top.t)}
                        y2={sy(0)}
                        stroke={SOFT}
                        strokeOpacity='0.4'
                      />
                      <text
                        x={sx(ux * top.t) + 4}
                        y={sy(top.height) - 6}
                        fontSize='11'
                        fill={SOFT}
                      >
                        highest {fmt(top.height, 1)} m
                      </text>
                    </g>
                  )}
                  {landing <= X_MAX && (
                    <text x={sx(landing)} y={sy(0) - 6} fontSize='11' fill={SOFT} textAnchor='middle'>
                      lands {fmt(landing, 1)} m
                    </text>
                  )}
                  {here.x <= X_MAX && here.y <= Y_MAX && (
                    <g>
                      {/* sideways part of the velocity: never changes */}
                      <line
                        x1={px}
                        y1={py}
                        x2={px + velocity.vx * scale}
                        y2={py}
                        stroke={ACCENT}
                        strokeWidth='2.5'
                      />
                      {/* upward part: shrinks, hits zero at the top, then grows downwards */}
                      <line
                        x1={px}
                        y1={py}
                        x2={px}
                        y2={py - velocity.vy * scale}
                        stroke={AMBER}
                        strokeWidth='2.5'
                      />
                      <circle cx={px} cy={py} r='7' fill={INK} stroke='#fff' strokeWidth='2' />
                    </g>
                  )}
                </>
              );
            }}
          </Plot>
          <figcaption>
            The dashed line is the whole path. The ball carries two arrows: the{" "}
            <span style={{ color: ACCENT, fontWeight: 600 }}>blue</span> one is its sideways speed
            and never changes; the{" "}
            <span style={{ color: AMBER, fontWeight: 600 }}>yellow</span> one is its upward speed,
            which gravity shrinks by 9.81 m/s every second.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <div className='controls'>
            <Slider
              id='proj-u'
              label='Launch speed u'
              display={`${fmt(speed, 0)} m/s`}
              min={0}
              max={28}
              step={1}
              value={speed}
              disabled={locked}
              onChange={change(setSpeed)}
            />
            <Slider
              id='proj-angle'
              label='Launch angle θ'
              display={`${fmt(angle, 0)}°`}
              min={0}
              max={90}
              step={1}
              value={angle}
              disabled={locked}
              onChange={change(setAngle)}
            />
            <Slider
              id='proj-h'
              label='Launch height h'
              display={`${fmt(height, 0)} m`}
              min={0}
              max={30}
              step={1}
              value={height}
              disabled={locked}
              onChange={change(setHeight)}
            />
            <Slider
              id='proj-t'
              label='Time t'
              display={`${fmt(t)} s`}
              min={0}
              max={Number(total.toFixed(2))}
              step={0.01}
              value={Number(t.toFixed(2))}
              disabled={locked}
              onChange={(value) => {
                clock.setRunning(false);
                setTime(value);
              }}
            />
            <div className='control-buttons'>
              <button
                className='button'
                disabled={locked}
                onClick={() => (clock.running ? clock.setRunning(false) : play())}
              >
                {clock.running ? "Pause" : "Throw"}
              </button>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  clock.setRunning(false);
                  setTime(0);
                  setSpeed(15);
                  setAngle(0);
                  setHeight(20);
                }}
              >
                Thrown sideways
              </button>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  clock.setRunning(false);
                  setTime(0);
                  setSpeed(DEFAULTS.speed);
                  setAngle(DEFAULTS.angle);
                  setHeight(DEFAULTS.height);
                }}
              >
                Reset
              </button>
            </div>
            {locked && <p className='hint'>Answer the question above to unlock the controls.</p>}
          </div>

          <Readout
            rows={[
              { label: <>u<sub>x</sub> = u cos θ</>, value: `${fmt(ux)} m/s` },
              { label: <>u<sub>y</sub> = u sin θ</>, value: `${fmt(uy)} m/s` },
              { label: <>x = u<sub>x</sub> t</>, value: `${fmt(here.x)} m` },
              { label: <>y = h + u<sub>y</sub> t − ½ g t²</>, value: `${fmt(here.y)} m` },
              { label: <>v<sub>y</sub> = u<sub>y</sub> − g t</>, value: `${fmt(velocity.vy)} m/s` },
              { label: <>speed = √(v<sub>x</sub>² + v<sub>y</sub>²)</>, value: `${fmt(velocity.speed)} m/s` },
              { label: "time of flight", value: <span style={{ color: GOOD }}>{fmt(total)} s</span> },
              { label: "range", value: <span style={{ color: GOOD }}>{fmt(landing, 1)} m</span> },
            ]}
          />
        </div>
      </div>
      <p className='hint'>
        No air resistance, g = 9.81 m/s². Try 30° and 60° at the same speed from the ground: they
        land in the same place. 45° goes furthest.
      </p>
    </div>
  );
}
