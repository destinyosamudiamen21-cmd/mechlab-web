import { useState } from "react";
import * as THREE from "three";
import {
  EARTH_RADIUS,
  circularPeriod,
  circularSpeed,
  escapeSpeed,
  gravityAt,
  orbitShape,
  radiusAt,
  speedAt,
  sweepRate,
} from "./orbit/solver";
import type { OrbitShape } from "./orbit/solver";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Scene3D, { solid } from "./shared/Scene3D";
import type { SceneSetup } from "./shared/Scene3D";
import Slider from "./shared/Slider";
import { AMBER, GOOD, INK, WARN, fmt } from "./shared/theme";
import { useClock } from "./shared/useClock";

const DEFAULTS = { altitude: 400, k: 1 }; // km, launch speed ÷ circular speed
const GEO = 35786; // km: one orbit a day, so it hovers over one spot
const FAIL = "#c2410c";
const SECONDS_PER_LAP = 8; // the animation shows one orbit in about this many seconds

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: two satellites are in circular orbits round the Earth, one at 400 km up and one much higher, at 20 000 km. Which one is moving faster?",
  options: ["The low one", "The high one", "Both the same speed"],
  correct: 0,
  explain:
    "The low one, by a lot: about 7.7 km/s against 3.9 km/s. Close to the Earth, gravity pulls harder, so a satellite must go faster to keep 'falling round' instead of falling in. Circular speed is v = √(GM / r): bigger r, smaller v. The high one also has much further to go, so its lap takes about 12 hours instead of 92 minutes. Try it with the height slider.",
};

type SceneState = {
  shape: OrbitShape;
  r0: number;
  phi: number;
  extent: number; // metres that fit the view
};

const VIEW_SIZE = 1.7; // drawing units the biggest path is scaled to

// Earth, the path (rebuilt when its shape changes) and the satellite.
const setup: SceneSetup<SceneState> = (scene) => {
  const world = new THREE.Group();
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), solid(0x2f6db5, { metalness: 0.1 }));
  // The spin axis through the poles, so the Earth reads as a globe and not just a ball.
  const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.5, 8), solid(0x5b6676));
  const path = new THREE.Mesh(new THREE.BufferGeometry(), solid(0xf2a900));
  const satellite = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), solid(0x16202e));
  const launch = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), solid(0xffffff));
  world.add(earth, axis, path, satellite, launch);
  scene.add(world);
  let lastKey = "";

  return (state) => {
    // Scale so the whole path fits: one drawing unit is one Earth radius before scaling.
    const scale = VIEW_SIZE / (state.extent / EARTH_RADIUS);
    world.scale.setScalar(scale);
    // The satellite, the launch point and the path keep the same size on screen at any zoom.
    satellite.scale.setScalar(0.07 / scale);
    launch.scale.setScalar(0.045 / scale);
    const toScene = (r: number, phi: number) => {
      // Angle on screen measured from the launch point, which stays on the right.
      const along = phi - state.shape.launchAngle;
      return new THREE.Vector3(
        (r / EARTH_RADIUS) * Math.cos(along),
        0,
        -(r / EARTH_RADIUS) * Math.sin(along)
      );
    };

    const key = `${state.shape.p}|${state.shape.e}|${state.extent}`;
    if (key !== lastKey) {
      lastKey = key;
      const points: THREE.Vector3[] = [];
      const steps = 360;
      for (let i = 0; i <= steps; i++) {
        const phi = state.shape.launchAngle + (i / steps) * 2 * Math.PI;
        const r = radiusAt(state.shape, phi);
        if (!Number.isFinite(r) || r > state.extent * 1.6) {
          if (points.length > 0 && state.shape.escapes) break;
          continue;
        }
        points.push(toScene(r, phi));
      }
      path.geometry.dispose();
      path.geometry =
        points.length > 1
          ? new THREE.TubeGeometry(
              new THREE.CatmullRomCurve3(points, !state.shape.escapes),
              points.length * 2,
              0.012 / scale,
              6,
              !state.shape.escapes
            )
          : new THREE.BufferGeometry();
    }
    satellite.position.copy(toScene(radiusAt(state.shape, state.phi), state.phi));
    launch.position.copy(toScene(state.r0, state.shape.launchAngle));
  };
};
const VIEW = {
  position: [0, 4.4, 5.6] as [number, number, number],
  target: [0, 0, 0] as [number, number, number],
};

const km = (m: number) => m / 1000;

function duration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "never comes back";
  const minutes = seconds / 60;
  if (minutes < 120) return `${fmt(minutes, 1)} min`;
  return `${fmt(minutes / 60, 2)} h`;
}

export default function OrbitExplorer(_props: { topicSlug: string }) {
  const [altitude, setAltitude] = useState(DEFAULTS.altitude);
  const [k, setK] = useState(DEFAULTS.k);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const r0 = EARTH_RADIUS + altitude * 1000;
  const shape = orbitShape(r0, k);
  const [phi, setPhi] = useState(shape.launchAngle);
  const r = radiusAt(shape, phi);
  // Fit the view to the path, but no more than 8 Earth radii across so the Earth stays visible.
  // At least 1.8 Earth radii, so a low orbit still shows the Earth as a ball with a ring round it.
  const extent = Math.max(
    1.8 * EARTH_RADIUS,
    Math.min(shape.escapes ? 3 * r0 : Math.max(shape.apogee, r0) * 1.05, 8 * EARTH_RADIUS)
  );
  const lapSeconds = Number.isFinite(shape.period) ? shape.period : circularPeriod(r0);
  const speedUp = lapSeconds / SECONDS_PER_LAP;

  const clock = useClock((dt) => {
    setPhi((angle) => {
      const radius = radiusAt(shape, angle);
      const next = angle + sweepRate(shape, radius) * dt * speedUp;
      const nextR = radiusAt(shape, next);
      if (nextR < EARTH_RADIUS || !Number.isFinite(nextR) || nextR > extent * 1.6) {
        clock.setRunning(false);
        return angle;
      }
      return next;
    });
  });

  // Any change to the launch puts the satellite back at the launch point.
  function apply(nextAltitude: number, nextK: number) {
    clock.setRunning(false);
    setAltitude(nextAltitude);
    setK(nextK);
    setPhi(orbitShape(EARTH_RADIUS + nextAltitude * 1000, nextK).launchAngle);
  }

  function launch() {
    if (clock.running) {
      clock.setRunning(false);
      return;
    }
    // Start again from the launch point if the last run ended.
    const radius = radiusAt(shape, phi);
    if (radius < EARTH_RADIUS * 1.0001 || radius > extent * 1.5) setPhi(shape.launchAngle);
    clock.setRunning(true);
  }

  const vLaunch = k * circularSpeed(r0);
  const verdict = shape.escapes
    ? { text: "Escapes: it never comes back", color: AMBER }
    : shape.crashes
      ? { text: "Too slow: it falls back to Earth", color: FAIL }
      : Math.abs(shape.e) < 0.005
        ? { text: "Circular orbit", color: GOOD }
        : { text: "Elliptical orbit", color: GOOD };

  return (
    <div className='widget'>
      <Prediction data={PREDICTION} predicted={predicted} onPredict={setPredicted} />

      <div className='widget-grid'>
        <figure className='widget-figure'>
          <Scene3D
            setup={setup}
            state={{ shape, r0, phi, extent }}
            view={VIEW}
            label={`The Earth with a satellite launched sideways at ${altitude} kilometres. ${verdict.text}.`}
          />
          <figcaption>
            The white dot is where the satellite is launched, sideways, at the speed you set. The
            yellow line is the path gravity bends it into. Drawn to scale. Time is speeded up about{" "}
            {fmt(speedUp, 0)} times. Drag to turn the view.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <p className='hint' style={{ color: verdict.color, fontWeight: 600 }}>
            {verdict.text}
          </p>
          <div className='controls'>
            <Slider
              id='orbit-h'
              label='Height above the ground'
              display={`${fmt(altitude, 0)} km`}
              min={200}
              max={36000}
              step={100}
              value={altitude}
              disabled={locked}
              onChange={(value) => apply(value, k)}
            />
            <Slider
              id='orbit-k'
              label='Launch speed ÷ circular speed'
              display={`${fmt(k)} × (${fmt(km(vLaunch), 2)} km/s)`}
              min={0.6}
              max={1.6}
              step={0.01}
              value={k}
              disabled={locked}
              onChange={(value) => apply(altitude, value)}
            />
            <div className='control-buttons'>
              <button className='button' disabled={locked} onClick={launch}>
                {clock.running ? "Pause" : "Launch"}
              </button>
              <button className='button button-quiet' disabled={locked} onClick={() => apply(altitude, 1)}>
                Circular
              </button>
              <button className='button button-quiet' disabled={locked} onClick={() => apply(altitude, 1.42)}>
                Escape (× √2)
              </button>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => apply(GEO - (GEO % 100), 1)}
              >
                Geostationary
              </button>
            </div>
            {locked && <p className='hint'>Answer the question above to unlock the controls.</p>}
          </div>

          <Readout
            rows={[
              { label: "r = R + h", value: `${fmt(km(r0), 0)} km` },
              { label: "g here = GM / r²", value: `${fmt(gravityAt(r0), 2)} m/s²` },
              { label: "circular speed √(GM / r)", value: `${fmt(km(circularSpeed(r0)), 2)} km/s` },
              { label: "escape speed √(2GM / r)", value: `${fmt(km(escapeSpeed(r0)), 2)} km/s` },
              { label: "launch speed", value: <span style={{ color: INK }}>{fmt(km(vLaunch), 2)} km/s</span> },
              { label: "time for one lap", value: <span style={{ color: GOOD }}>{duration(shape.period)}</span> },
              {
                label: "closest / furthest height",
                value: `${fmt(km(shape.perigee - EARTH_RADIUS), 0)} km / ${
                  shape.escapes ? "∞" : `${fmt(km(shape.apogee - EARTH_RADIUS), 0)} km`
                }`,
              },
              {
                label: "speed now",
                value: Number.isFinite(r) ? `${fmt(km(speedAt(shape, r)), 2)} km/s` : "–",
              },
            ]}
          />
          {shape.crashes && !shape.escapes && (
            <p className='hint' style={{ color: WARN }}>
              Its path dips below the surface: the part inside the Earth is where it would go if
              the Earth were not in the way.
            </p>
          )}
        </div>
      </div>
      <p className='hint'>
        GM = 3.986 × 10¹⁴ m³/s² for the Earth, Earth radius R = 6371 km, no air drag. Watch the
        satellite on an ellipse: it speeds up near the Earth and slows down far away (Kepler's second law).
      </p>
    </div>
  );
}
