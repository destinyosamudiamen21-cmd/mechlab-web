import { useState } from "react";
import { TRACK_LENGTH, energyAt, heightAt } from "./energy/solver";
import Plot from "./shared/Plot";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Slider from "./shared/Slider";
import { ACCENT, AMBER, GOOD, INK, SOFT, fmt } from "./shared/theme";
import { useClock } from "./shared/useClock";

const G = 9.81;
const DEFAULTS = { mass: 200, start: 20, resistance: 0, x: 0 };
const LOST = "#c2410c";

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: a trolley starts from rest at the top of a smooth (frictionless) track. When it has dropped to exactly half its starting height, what fraction of its energy is kinetic (movement) energy?",
  options: ["A quarter", "A half", "All of it"],
  correct: 1,
  explain:
    "A half. All the energy starts as potential energy, m g h. At half the height the potential energy is m g (h/2), half of what it was, and the missing half has become kinetic energy. Nothing is lost on a smooth track. Drag the position slider until the height reads half the start and look at the bars.",
};

export default function EnergyTrack(_props: { topicSlug: string }) {
  const [mass, setMass] = useState(DEFAULTS.mass);
  const [start, setStart] = useState(DEFAULTS.start);
  const [resistance, setResistance] = useState(DEFAULTS.resistance);
  const [position, setPosition] = useState(DEFAULTS.x);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const track = { mass, start, resistance, g: G };
  const state = energyAt(track, position);
  const total = mass * G * start;
  // How far the trolley can get before it stops (or the end of the track).
  const furthest = energyAt(track, TRACK_LENGTH);
  const reach = furthest.stopped ? furthest.x : TRACK_LENGTH;

  const clock = useClock((dt) => {
    setPosition((x) => {
      const here = energyAt(track, x);
      // Move along the ground at the horizontal part of the speed: v ÷ √(1 + slope²).
      const slope = (heightAt(x + 0.05, start) - heightAt(x, start)) / 0.05;
      const step = (Math.max(here.speed, 0.6) * dt) / Math.sqrt(1 + slope * slope);
      const next = x + step;
      if (next >= reach) {
        clock.setRunning(false);
        return reach;
      }
      return next;
    });
  });

  const change = (set: (value: number) => void) => (value: number) => {
    clock.setRunning(false);
    setPosition(0);
    set(value);
  };

  function play() {
    if (clock.reducedMotion) {
      setPosition(reach);
      return;
    }
    if (position >= reach) setPosition(0);
    clock.setRunning(true);
  }

  const profile = Array.from({ length: 121 }, (_, index) => {
    const x = (index / 120) * TRACK_LENGTH;
    return [x, heightAt(x, start)] as const;
  });

  // Energy bars, as a share of the starting energy.
  const bars = [
    { label: "Potential m g h", value: state.potential, color: ACCENT },
    { label: "Kinetic ½ m v²", value: state.kinetic, color: AMBER },
    { label: "Lost to resistance F s", value: state.lost, color: LOST },
  ];

  return (
    <div className='widget'>
      <Prediction data={PREDICTION} predicted={predicted} onPredict={setPredicted} />

      <div className='widget-grid'>
        <figure className='widget-figure'>
          <Plot
            x={[0, TRACK_LENGTH]}
            y={[0, 32]}
            xTicks={[0, 10, 20, 30, 40]}
            yTicks={[0, 10, 20, 30]}
            xLabel='distance (m)'
            yLabel='height (m)'
            height={250}
            label={`A trolley on a hilly track released from ${start} metres. At ${fmt(
              state.x,
              1
            )} metres along, its speed is ${fmt(state.speed, 1)} metres per second.`}
          >
            {(sx, sy) => (
              <>
                <polygon
                  points={`${sx(0)},${sy(0)} ${profile
                    .map(([x, y]) => `${sx(x)},${sy(y)}`)
                    .join(" ")} ${sx(TRACK_LENGTH)},${sy(0)}`}
                  fill='#e6ebf2'
                  stroke={SOFT}
                  strokeWidth='2'
                />
                <line
                  x1={sx(0)}
                  y1={sy(start)}
                  x2={sx(TRACK_LENGTH)}
                  y2={sy(start)}
                  stroke={ACCENT}
                  strokeDasharray='4 4'
                  strokeOpacity='0.6'
                />
                <text x={sx(TRACK_LENGTH) - 2} y={sy(start) - 5} fontSize='11' fill={ACCENT} textAnchor='end'>
                  release height
                </text>
                <circle
                  cx={sx(state.x)}
                  cy={sy(state.height) - 8}
                  r='8'
                  fill={state.stopped ? LOST : INK}
                  stroke='#fff'
                  strokeWidth='2'
                />
                {state.stopped && (
                  <text x={sx(state.x)} y={sy(state.height) - 22} fontSize='12' fontWeight='600' fill={LOST} textAnchor='middle'>
                    turns back here
                  </text>
                )}
              </>
            )}
          </Plot>

          <div className='energy-bars' aria-hidden='true'>
            {bars.map((bar) => (
              <div key={bar.label} className='energy-bar'>
                <span className='energy-bar-label'>{bar.label}</span>
                <span className='energy-bar-track'>
                  <span
                    className='energy-bar-fill'
                    style={{ width: `${(100 * bar.value) / total}%`, background: bar.color }}
                  />
                </span>
                <span className='energy-bar-value'>{fmt(bar.value / 1000, 1)} kJ</span>
              </div>
            ))}
          </div>
          <figcaption>
            The three bars always add up to the energy it started with, {fmt(total / 1000, 1)} kJ.
            Energy is never made or destroyed, only moved from one bar to another.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <div className='controls'>
            <Slider
              id='energy-x'
              label='Position along the track'
              display={`${fmt(state.x, 1)} m`}
              min={0}
              max={TRACK_LENGTH}
              step={0.1}
              value={position}
              disabled={locked}
              onChange={(value) => {
                clock.setRunning(false);
                setPosition(value);
              }}
            />
            <Slider
              id='energy-h'
              label='Release height h'
              display={`${fmt(start, 0)} m`}
              min={5}
              max={30}
              step={1}
              value={start}
              disabled={locked}
              onChange={change(setStart)}
            />
            <Slider
              id='energy-m'
              label='Mass m'
              display={`${fmt(mass, 0)} kg`}
              min={50}
              max={500}
              step={10}
              value={mass}
              disabled={locked}
              onChange={change(setMass)}
            />
            <Slider
              id='energy-f'
              label='Resistance F (friction and air)'
              display={`${fmt(resistance, 0)} N`}
              min={0}
              max={1000}
              step={20}
              value={resistance}
              disabled={locked}
              onChange={change(setResistance)}
            />
            <div className='control-buttons'>
              <button
                className='button'
                disabled={locked}
                onClick={() => (clock.running ? clock.setRunning(false) : play())}
              >
                {clock.running ? "Pause" : "Release"}
              </button>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  clock.setRunning(false);
                  setMass(DEFAULTS.mass);
                  setStart(DEFAULTS.start);
                  setResistance(DEFAULTS.resistance);
                  setPosition(DEFAULTS.x);
                }}
              >
                Reset
              </button>
            </div>
            {locked && <p className='hint'>Answer the question above to unlock the controls.</p>}
          </div>

          <Readout
            rows={[
              { label: "height here", value: `${fmt(state.height, 2)} m` },
              { label: "PE = m g h", value: `${fmt(state.potential / 1000, 2)} kJ` },
              { label: "lost = F × distance along track", value: `${fmt(state.lost / 1000, 2)} kJ` },
              { label: "KE = start PE − PE − lost", value: `${fmt(state.kinetic / 1000, 2)} kJ` },
              {
                label: "v = √(2 KE / m)",
                value: <span style={{ color: GOOD }}>{fmt(state.speed, 2)} m/s</span>,
              },
            ]}
          />
        </div>
      </div>
      <p className='hint'>
        g = 9.81 m/s². With no resistance, change the mass: the speed at every point stays the same,
        because both PE and KE are proportional to m. Then add resistance and watch the orange bar grow.
      </p>
    </div>
  );
}
