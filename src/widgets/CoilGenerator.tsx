import { useState } from "react";
import * as THREE from "three";
import { emf, fluxLinkage, frequency, omegaOf, peakEmf, rms } from "./generator/solver";
import type { Coil } from "./generator/solver";
import Plot from "./shared/Plot";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Scene3D, { arrow, solid } from "./shared/Scene3D";
import type { SceneSetup } from "./shared/Scene3D";
import Slider from "./shared/Slider";
import { ACCENT, AMBER, AMBER_TEXT, GOOD, SOFT, fmt } from "./shared/theme";
import { useClock } from "./shared/useClock";

const DEFAULTS = { turns: 100, field: 0.5, area: 200, rpm: 3000 }; // -, T, cm², rpm
const SECONDS_PER_TURN = 4; // the animation is slowed right down so you can follow it
const V_AXIS = 1200; // fixed voltage axis, so a change in peak is easy to see

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: a generator coil spins in a magnet and makes an alternating voltage. You make it spin twice as fast. What happens to the voltage?",
  options: [
    "The peak voltage doubles, and nothing else",
    "It changes direction twice as often, and nothing else",
    "Both: twice the peak AND twice as often",
    "Nothing changes",
  ],
  correct: 2,
  explain:
    "Both. The voltage comes from how fast the flux through the coil changes (Faraday's law). Spin faster and the flux changes faster, so the peak ε₀ = N B A ω doubles. Each turn is also over in half the time, so the frequency f = rpm ÷ 60 doubles too. That is why a generator must turn at exactly the right speed: 3 000 rpm for 50 Hz mains.",
};

type SceneState = { angle: number; strength: number };

// Two magnet poles, field arrows between them, and a square coil that turns about the vertical axis.
const setup: SceneSetup<SceneState> = (scene) => {
  const north = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.0, 0.8), solid(0xc2410c));
  north.position.x = -1.05;
  const south = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.0, 0.8), solid(0x1f6feb));
  south.position.x = 1.05;
  scene.add(north, south);

  const field = [-0.3, 0, 0.3].flatMap((y) =>
    [-0.25, 0.25].map((z) => {
      const a = arrow(0x8fa3bd, 0.012);
      a.setLength(1.6);
      a.aim(1, 0, 0);
      a.object.position.set(-0.82, y, z);
      return a;
    })
  );
  for (const a of field) scene.add(a.object);

  // The coil: a square loop of copper tube, side 0.9, in the y-z plane when angle = 0
  // (its normal along x, facing the field: most flux).
  const coil = new THREE.Group();
  const copper = solid(0xb87333, { metalness: 0.6 });
  const side = 0.9;
  for (const [x, y, z, along] of [
    [0, side / 2, 0, "z"],
    [0, -side / 2, 0, "z"],
    [0, 0, side / 2, "y"],
    [0, 0, -side / 2, "y"],
  ] as const) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, side + 0.05, 10), copper);
    bar.position.set(x, y, z);
    if (along === "z") bar.rotation.x = Math.PI / 2;
    coil.add(bar);
  }
  // A faint sheet so the coil's face, and how much field passes through it, is easy to see.
  const face = new THREE.Mesh(new THREE.PlaneGeometry(side, side), solid(0xf2a900, { opacity: 0.25 }));
  face.rotation.y = Math.PI / 2;
  coil.add(face);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 10), solid(0x3a4658));
  scene.add(coil, axle);

  return ({ angle, strength }) => {
    coil.rotation.y = angle;
    (face.material as THREE.MeshStandardMaterial).opacity = 0.08 + 0.4 * strength;
  };
};

const VIEW = {
  position: [1.2, 1.6, 3.4] as [number, number, number],
  target: [0, 0, 0] as [number, number, number],
};

export default function CoilGenerator(_props: { topicSlug: string }) {
  const [turns, setTurns] = useState(DEFAULTS.turns);
  const [field, setField] = useState(DEFAULTS.field);
  const [area, setArea] = useState(DEFAULTS.area);
  const [rpm, setRpm] = useState(DEFAULTS.rpm);
  const [angle, setAngle] = useState(Math.PI / 3);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const coil: Coil = { turns, field, area: area / 1e4, rpm };
  const peak = peakEmf(coil);
  const now = emf(coil, angle);
  const linkage = fluxLinkage(coil, angle);
  const flux = field * (area / 1e4) * Math.cos(angle);

  const clock = useClock((dt) => {
    setAngle((a) => (a + (2 * Math.PI * dt) / SECONDS_PER_TURN) % (2 * Math.PI));
  });

  const degrees = (angle * 180) / Math.PI;
  const curve = Array.from({ length: 121 }, (_, k) => {
    const deg = k * 3;
    return [deg, emf(coil, (deg * Math.PI) / 180)] as const;
  });
  // The flux linkage drawn on the same axis, scaled to the peak so its shape can be compared.
  const fluxCurve = Array.from({ length: 121 }, (_, k) => {
    const deg = k * 3;
    return [deg, Math.cos((deg * Math.PI) / 180) * Math.min(peak, V_AXIS)] as const;
  });

  return (
    <div className='widget'>
      <Prediction data={PREDICTION} predicted={predicted} onPredict={setPredicted} />

      <div className='widget-grid'>
        <figure className='widget-figure'>
          <Scene3D
            setup={setup}
            state={{ angle, strength: Math.abs(Math.cos(angle)) }}
            view={VIEW}
            label={`A square coil turned ${fmt(degrees, 0)} degrees between a north and a south pole. Its voltage now is ${fmt(now, 0)} volts.`}
          />
          <figcaption>
            Field lines run from the <span style={{ color: "#c2410c", fontWeight: 600 }}>north</span> pole to the{" "}
            <span style={{ color: ACCENT, fontWeight: 600 }}>south</span> pole. The yellow face of the coil is
            brightest when the most field passes through it. Drag to turn the view.
          </figcaption>
          <Plot
            x={[0, 360]}
            y={[-V_AXIS, V_AXIS]}
            xTicks={[0, 90, 180, 270, 360]}
            yTicks={[-1000, -500, 0, 500, 1000]}
            xLabel='angle turned θ (degrees)'
            yLabel='ε (V)'
            height={240}
            label={`Generated voltage through one turn. Peak ${fmt(peak, 0)} volts.`}
          >
            {(sx, sy) => {
              const clip = (v: number) => Math.max(-V_AXIS, Math.min(V_AXIS, v));
              return (
                <>
                  <polyline points={fluxCurve.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ")} fill='none' stroke={SOFT} strokeDasharray='4 4' />
                  <polyline points={curve.map(([x, y]) => `${sx(x)},${sy(clip(y))}`).join(" ")} fill='none' stroke={GOOD} strokeWidth='2.5' />
                  <line x1={sx(degrees)} y1={sy(-V_AXIS)} x2={sx(degrees)} y2={sy(V_AXIS)} stroke={AMBER} strokeDasharray='3 3' />
                  <circle cx={sx(degrees)} cy={sy(clip(now))} r='6' fill={AMBER} stroke='#fff' strokeWidth='2' />
                </>
              );
            }}
          </Plot>
          <figcaption>
            <span style={{ color: GOOD, fontWeight: 600 }}>Green</span>: the voltage ε. Dashed: the flux through the
            coil (shape only). The voltage is biggest where the flux is zero and changing fastest, and zero where the
            flux is biggest.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <div className='controls'>
            <Slider id='g-n' label='Turns of wire N' display={`${fmt(turns, 0)}`} min={10} max={300} step={10} value={turns} disabled={locked} onChange={setTurns} />
            <Slider id='g-b' label='Magnetic field B' display={`${fmt(field, 2)} T`} min={0.05} max={1} step={0.05} value={field} disabled={locked} onChange={setField} />
            <Slider id='g-a' label='Coil area A' display={`${fmt(area, 0)} cm²`} min={50} max={500} step={10} value={area} disabled={locked} onChange={setArea} />
            <Slider id='g-rpm' label='Speed' display={`${fmt(rpm, 0)} rpm`} min={300} max={6000} step={100} value={rpm} disabled={locked} onChange={setRpm} />
            <Slider id='g-th' label='Angle θ' display={`${fmt(degrees, 0)}°`} min={0} max={359} step={1} value={Math.round(degrees)} disabled={locked} onChange={(v) => { clock.setRunning(false); setAngle((v * Math.PI) / 180); }} />
            <div className='control-buttons'>
              <button className='button' disabled={locked || clock.reducedMotion} onClick={() => clock.setRunning(!clock.running)}>
                {clock.running ? "Stop" : "Turn slowly"}
              </button>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  setTurns(DEFAULTS.turns);
                  setField(DEFAULTS.field);
                  setArea(DEFAULTS.area);
                  setRpm(DEFAULTS.rpm);
                }}
              >
                Reset
              </button>
            </div>
            {locked && <p className='hint'>Answer the question above to unlock the controls.</p>}
          </div>

          <Readout
            rows={[
              { label: "Φ = B A cos θ", value: `${fmt(flux * 1000, 2)} mWb` },
              { label: "ω = 2π × rpm ÷ 60", value: `${fmt(omegaOf(rpm), 1)} rad/s` },
              { label: "ε = N B A ω sin θ", value: <span style={{ color: GOOD }}>{fmt(now, 1)} V</span> },
              { label: "Peak ε₀ = N B A ω", value: `${fmt(peak, 1)} V` },
              { label: "r.m.s. = ε₀ ÷ √2", value: `${fmt(rms(peak), 1)} V` },
              { label: "f = rpm ÷ 60", value: <span style={{ color: AMBER_TEXT }}>{fmt(frequency(coil), 1)} Hz</span> },
              { label: "N Φ (flux linkage)", value: `${fmt(linkage, 3)} Wb` },
            ]}
          />
        </div>
      </div>
      <p className='hint'>
        The animation turns slowly so you can follow it; the numbers use the real speed. With the starting values
        (100 turns, 0.5 T, 200 cm², 3 000 rpm) the r.m.s. voltage is about 222 V at 50 Hz, close to the 230 V, 50 Hz
        supply in a Nigerian socket.
      </p>
    </div>
  );
}
