import { useState } from "react";
import * as THREE from "three";
import { afterMove, inertia, rpm } from "./spin/solver";
import Plot from "./shared/Plot";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Scene3D, { solid } from "./shared/Scene3D";
import type { SceneSetup } from "./shared/Scene3D";
import Slider from "./shared/Slider";
import { ACCENT, AMBER, GOOD, INK, SOFT, fmt } from "./shared/theme";
import { useClock } from "./shared/useClock";

const PLATFORM = { platformMass: 4, platformRadius: 0.5 }; // kg, m: a solid disc
const R0 = 0.8; // m, where the masses start: arms fully out
const R_MIN = 0.1;
const DEFAULTS = { mass: 2, omega0: 2, r: R0 };

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: a spinning skater pulls her arms in close to her body. Nothing outside pushes or pulls her round. What happens to how fast she spins?",
  options: ["She slows down", "She spins at the same rate", "She speeds up"],
  correct: 2,
  explain:
    "She speeds up. With no outside torque, angular momentum L = I ω cannot change. Pulling mass closer to the axis makes the moment of inertia I smaller, so ω must get bigger to keep the product the same. Slide the masses inwards below and watch ω climb. Look at the kinetic energy too: it goes UP, because pulling the masses in takes work from her muscles.",
};

type SceneState = { r: number; angle: number };

// A turntable with two arms and a sliding ball on each. The whole thing turns about the vertical axis.
const setup: SceneSetup<SceneState> = (scene) => {
  const turning = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.08, 48),
    solid(0x8fa3bd, { metalness: 0.4 })
  );
  // A stripe on the disc so the turning is easy to see.
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.085, 0.06), solid(0xf2a900));
  stripe.rotation.y = Math.PI / 2;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.04, 0.05), solid(0x3a4658));
  arm.position.y = 0.18;
  const balls = [0, 1].map(() => {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), solid(0x1f6feb));
    ball.position.y = 0.18;
    return ball;
  });
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 12), solid(0x3a4658));
  axle.position.y = 0.05;
  turning.add(disc, stripe, arm, axle, ...balls);
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.5, 24), solid(0x5b6676));
  stand.position.y = -0.3;
  scene.add(turning, stand);

  return (state) => {
    turning.rotation.y = state.angle;
    balls[0].position.x = state.r;
    balls[1].position.x = -state.r;
  };
};
const VIEW = {
  position: [0, 1.5, 2.5] as [number, number, number],
  target: [0, 0, 0] as [number, number, number],
};

export default function SpinningPlatform(_props: { topicSlug: string }) {
  const [mass, setMass] = useState(DEFAULTS.mass);
  const [omega0, setOmega0] = useState(DEFAULTS.omega0);
  const [r, setR] = useState(DEFAULTS.r);
  const [angle, setAngle] = useState(0);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const spinner = { ...PLATFORM, mass };
  const result = afterMove(spinner, R0, omega0, r);

  const clock = useClock((dt) => {
    // Shown at real speed, but never faster than about two turns a second so it stays readable.
    setAngle((a) => (a + Math.min(result.omega, 12) * dt) % (2 * Math.PI));
  });

  // ω against r for this spinner, to show the whole story at once.
  const omegaMax = afterMove(spinner, R0, 4, R_MIN).omega;
  const yTop = Math.max(10, Math.ceil(omegaMax / 5) * 5);
  const curve = Array.from({ length: 50 }, (_, index) => {
    const radius = R_MIN + (index / 49) * (R0 - R_MIN);
    return [radius, afterMove(spinner, R0, omega0, radius).omega] as const;
  });

  return (
    <div className='widget'>
      <Prediction data={PREDICTION} predicted={predicted} onPredict={setPredicted} />

      <div className='widget-grid'>
        <figure className='widget-figure'>
          <Plot
            x={[0, 0.9]}
            y={[0, yTop]}
            xTicks={[0, 0.2, 0.4, 0.6, 0.8]}
            yTicks={[0, yTop / 2, yTop]}
            xLabel='r, distance of each mass from the axis (m)'
            yLabel='ω (rad/s)'
            label={`Spin rate against radius. At r = ${fmt(r)} metres the platform turns at ${fmt(
              result.omega
            )} radians per second.`}
          >
            {(sx, sy) => (
              <>
                <polyline
                  points={curve.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ")}
                  fill='none'
                  stroke={ACCENT}
                  strokeWidth='2.5'
                />
                <circle cx={sx(R0)} cy={sy(omega0)} r='5' fill='#fff' stroke={SOFT} strokeWidth='1.5' />
                <text x={sx(R0)} y={sy(omega0) - 9} fontSize='11' fill={SOFT} textAnchor='middle'>
                  start
                </text>
                <line x1={sx(r)} y1={sy(0)} x2={sx(r)} y2={sy(result.omega)} stroke={AMBER} strokeDasharray='4 3' />
                <circle cx={sx(r)} cy={sy(result.omega)} r='7' fill={AMBER} stroke='#fff' strokeWidth='2' />
              </>
            )}
          </Plot>
          <figcaption>
            Every point on the blue curve has the same angular momentum L = I ω. Move the masses
            in (to the left) and the spin rate shoots up; move them out and it falls back to where
            it started.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <figure className='widget-figure'>
            <Scene3D
              setup={setup}
              state={{ r, angle }}
              view={VIEW}
              label='A turntable with two balls on arms, turning about a vertical axle'
            />
            <figcaption>Press Spin, then slide the balls in and out. Drag to turn the view.</figcaption>
          </figure>
          <div className='controls'>
            <Slider
              id='spin-r'
              label='Masses at radius r'
              display={`${fmt(r)} m`}
              min={R_MIN}
              max={R0}
              step={0.01}
              value={r}
              disabled={locked}
              onChange={setR}
            />
            <Slider
              id='spin-w0'
              label={
                <>
                  Starting spin ω<sub>0</sub>
                </>
              }
              display={`${fmt(omega0, 1)} rad/s`}
              min={0.5}
              max={4}
              step={0.1}
              value={omega0}
              disabled={locked}
              onChange={setOmega0}
            />
            <Slider
              id='spin-m'
              label='Each mass m'
              display={`${fmt(mass, 1)} kg`}
              min={0.5}
              max={4}
              step={0.5}
              value={mass}
              disabled={locked}
              onChange={setMass}
            />
            <div className='control-buttons'>
              <button
                className='button'
                disabled={locked || clock.reducedMotion}
                onClick={() => clock.setRunning(!clock.running)}
              >
                {clock.running ? "Stop" : "Spin"}
              </button>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => setR(R_MIN)}
              >
                Pull them in
              </button>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  setMass(DEFAULTS.mass);
                  setOmega0(DEFAULTS.omega0);
                  setR(DEFAULTS.r);
                }}
              >
                Reset
              </button>
            </div>
            {locked && <p className='hint'>Answer the question above to unlock the controls.</p>}
          </div>

          <Readout
            rows={[
              { label: "I₀ = ½ M R² + 2 m r₀²", value: `${fmt(result.i0, 3)} kg m²` },
              { label: "I = ½ M R² + 2 m r²", value: `${fmt(inertia(spinner, r), 3)} kg m²` },
              { label: "L = I₀ ω₀ (never changes)", value: `${fmt(result.momentum, 3)} kg m²/s` },
              {
                label: "ω = L / I",
                value: (
                  <span style={{ color: GOOD }}>
                    {fmt(result.omega)} rad/s ({fmt(rpm(result.omega), 0)} rpm)
                  </span>
                ),
              },
              { label: "KE before = ½ I₀ ω₀²", value: `${fmt(result.ke0)} J` },
              {
                label: "KE now = ½ I ω²",
                value: <span style={{ color: result.ke1 > result.ke0 + 1e-9 ? AMBER : INK }}>{fmt(result.ke1)} J</span>,
              },
            ]}
          />
        </div>
      </div>
      <p className='hint'>
        The masses start at r₀ = {R0} m, spinning at ω₀. The platform is a {PLATFORM.platformMass} kg solid disc of radius {PLATFORM.platformRadius} m, so its
        own I is ½ M R² = {fmt(0.5 * PLATFORM.platformMass * PLATFORM.platformRadius ** 2, 2)} kg m². Each ball
        is treated as a point mass. No friction at the axle.
      </p>
    </div>
  );
}
