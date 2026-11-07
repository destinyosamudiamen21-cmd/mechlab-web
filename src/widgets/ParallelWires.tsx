import { useState } from "react";
import * as THREE from "three";
import { fieldFromWire, forcePerMetre } from "./wires/solver";
import Plot from "./shared/Plot";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Scene3D, { arrow, solid } from "./shared/Scene3D";
import type { SceneSetup } from "./shared/Scene3D";
import Slider from "./shared/Slider";
import { ACCENT, AMBER, AMBER_TEXT, GOOD, SOFT, clamp, fmt } from "./shared/theme";

const DEFAULTS = { i1: 10, i2: 10, d: 5 }; // A, A, cm
const D_MAX = 20; // cm

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: two long straight wires run side by side. Both carry a current in the SAME direction. What do the wires do to each other?",
  options: ["They pull together", "They push apart", "Nothing: wires are not magnets"],
  correct: 0,
  explain:
    "They pull together. Each current makes a circular magnetic field round its wire. The second wire's current sits in that field, and the force on it, F = B I L, points towards the first wire. Same direction attracts; opposite directions repel. This is the reverse of the rule for charges, so take care. Flip the sign of one current below and watch the force arrows turn round.",
};

type SceneState = { i1: number; i2: number; d: number; force: number };

// Scene units: the gap is drawn so that 20 cm is 1.4 units wide.
const toScene = (cm: number) => 0.25 + (cm / D_MAX) * 1.15;

function cones(radius: number, count: number, direction: 1 | -1) {
  const group = new THREE.Group();
  for (let i = 0; i < count; i += 1) {
    const a = (2 * Math.PI * i) / count;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 12), solid(0x1f6feb));
    cone.position.set(radius * Math.cos(a), 0, radius * Math.sin(a));
    // Point along the circle: anticlockwise seen from above when direction = 1.
    const tangent = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(-direction);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    group.add(cone);
  }
  return group;
}

const setup: SceneSetup<SceneState> = (scene) => {
  const wireMaterial = solid(0xb87333, { metalness: 0.6 });
  const wire1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 16), wireMaterial);
  const wire2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 16), wireMaterial.clone());
  scene.add(wire1, wire2);

  // Field rings round wire 1, at three heights and three radii.
  const rings = new THREE.Group();
  const up = new THREE.Group();
  const down = new THREE.Group();
  for (const [radius, height] of [[0.22, 0.55], [0.42, 0], [0.62, -0.55]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.008, 8, 64), solid(0x1f6feb, { opacity: 0.6 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = height;
    rings.add(ring);
    const a = cones(radius, 4, 1);
    a.position.y = height;
    up.add(a);
    const b = cones(radius, 4, -1);
    b.position.y = height;
    down.add(b);
  }
  rings.add(up, down);
  scene.add(rings);

  const current1 = arrow(0xc2410c, 0.03);
  const current2 = arrow(0xc2410c, 0.03);
  const force1 = arrow(0xf2a900, 0.03);
  const force2 = arrow(0xf2a900, 0.03);
  scene.add(current1.object, current2.object, force1.object, force2.object);

  return ({ i1, i2, d, force }) => {
    const half = toScene(d) / 2;
    wire1.position.x = -half;
    wire2.position.x = half;
    rings.position.x = -half;
    rings.visible = i1 !== 0;
    up.visible = i1 > 0;
    down.visible = i1 < 0;

    // Current arrows beside each wire, pointing the way the current flows.
    for (const [a, i, x] of [[current1, i1, -half], [current2, i2, half]] as const) {
      a.object.visible = i !== 0;
      a.setLength(0.25 + (Math.abs(i) / 20) * 0.45);
      a.aim(0, Math.sign(i) || 1, 0);
      a.object.position.set(x + 0.09, i >= 0 ? 0.6 : 1.0, 0);
    }

    // Force arrows halfway up: towards each other if they attract.
    // Never longer than 40% of the gap, so the two arrows cannot cross.
    const size = Math.min(0.4 * 2 * half, 0.1 + clamp(Math.abs(force) / 2e-3, 0, 1) * 0.4);
    const attract = force > 0;
    force1.object.visible = force2.object.visible = force !== 0;
    force1.setLength(size);
    force2.setLength(size);
    force1.aim(attract ? 1 : -1, 0, 0);
    force2.aim(attract ? -1 : 1, 0, 0);
    force1.object.position.set(-half, -0.8, 0);
    force2.object.position.set(half, -0.8, 0);
  };
};

const VIEW = {
  position: [0.6, 1.2, 4.8] as [number, number, number],
  target: [0, 0, 0] as [number, number, number],
};

export default function ParallelWires(_props: { topicSlug: string }) {
  const [i1, setI1] = useState(DEFAULTS.i1);
  const [i2, setI2] = useState(DEFAULTS.i2);
  const [d, setD] = useState(DEFAULTS.d);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const r = d / 100;
  const b = fieldFromWire(Math.abs(i1), r);
  const force = forcePerMetre(i1, i2, r); // + attract
  const bMax = fieldFromWire(20, 0.01) * 1e6; // μT, for the graph's top
  const curve = Array.from({ length: 80 }, (_, k) => {
    const cm = 1 + (k / 79) * (D_MAX - 1);
    return [cm, fieldFromWire(Math.abs(i1), cm / 100) * 1e6] as const;
  });

  return (
    <div className='widget'>
      <Prediction data={PREDICTION} predicted={predicted} onPredict={setPredicted} />

      <div className='widget-grid'>
        <figure className='widget-figure'>
          <Scene3D
            setup={setup}
            state={{ i1, i2, d, force }}
            view={VIEW}
            label={`Two parallel wires ${fmt(d, 0)} centimetres apart carrying ${fmt(i1, 0)} and ${fmt(
              i2,
              0
            )} amps. They ${force > 0 ? "attract" : force < 0 ? "repel" : "do not push or pull"}.`}
          />
          <figcaption>
            <span style={{ color: "#c2410c", fontWeight: 600 }}>Red</span> arrows: the currents.{" "}
            <span style={{ color: ACCENT, fontWeight: 600 }}>Blue</span> rings: the magnetic field round the left
            wire (curl the fingers of your right hand round it with the thumb along the current).{" "}
            <span style={{ color: AMBER_TEXT, fontWeight: 600 }}>Yellow</span> arrows at the bottom: the force on each
            wire. Drag to turn the view.
          </figcaption>
          <Plot
            x={[0, D_MAX]}
            y={[0, Math.max(50, Math.ceil(bMax / 100) * 100)]}
            xTicks={[0, 5, 10, 15, 20]}
            yTicks={[0, Math.max(50, Math.ceil(bMax / 100) * 100) / 2, Math.max(50, Math.ceil(bMax / 100) * 100)]}
            xLabel='distance from the left wire (cm)'
            yLabel='B (μT)'
            height={220}
            label={`Field of the left wire against distance. At the right wire it is ${fmt(b * 1e6, 1)} microtesla.`}
          >
            {(sx, sy) => (
              <>
                <polyline points={curve.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ")} fill='none' stroke={ACCENT} strokeWidth='2.5' />
                <line x1={sx(d)} y1={sy(0)} x2={sx(d)} y2={sy(b * 1e6)} stroke={AMBER} strokeDasharray='4 3' />
                <circle cx={sx(d)} cy={sy(b * 1e6)} r='6' fill={AMBER} stroke='#fff' strokeWidth='2' />
                <text x={sx(d) + 8} y={sy(b * 1e6) - 6} fontSize='11' fill={SOFT}>right wire</text>
              </>
            )}
          </Plot>
        </figure>

        <div className='widget-side'>
          <div className='controls'>
            <Slider id='w-i1' label={<>Current in left wire I<sub>1</sub></>} display={`${fmt(i1, 0)} A`} min={-20} max={20} step={1} value={i1} disabled={locked} onChange={setI1} />
            <Slider id='w-i2' label={<>Current in right wire I<sub>2</sub></>} display={`${fmt(i2, 0)} A`} min={-20} max={20} step={1} value={i2} disabled={locked} onChange={setI2} />
            <Slider id='w-d' label='Distance apart d' display={`${fmt(d, 0)} cm`} min={1} max={D_MAX} step={1} value={d} disabled={locked} onChange={setD} />
            <div className='control-buttons'>
              <button className='button button-quiet' disabled={locked} onClick={() => setI2(-i2)}>
                Reverse I<sub>2</sub>
              </button>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  setI1(DEFAULTS.i1);
                  setI2(DEFAULTS.i2);
                  setD(DEFAULTS.d);
                }}
              >
                Reset
              </button>
            </div>
            {locked && <p className='hint'>Answer the question above to unlock the controls.</p>}
          </div>

          <Readout
            rows={[
              { label: "B at right wire = μ₀ I₁ ÷ 2π d", value: `${fmt(b * 1e6, 1)} μT` },
              { label: "F per metre = B I₂ = μ₀ I₁ I₂ ÷ 2π d", value: <span style={{ color: GOOD }}>{fmt(Math.abs(force) * 1000, 3)} mN/m</span> },
              { label: "Direction", value: force > 0 ? "attract (same direction)" : force < 0 ? "repel (opposite)" : "no force" },
              { label: "Force on 2 m of wire", value: `${fmt(Math.abs(force) * 2 * 1000, 3)} mN` },
            ]}
          />
        </div>
      </div>
      <p className='hint'>
        μ₀ = 4π × 10⁻⁷ T m/A. A negative current just means it flows downwards. For scale, the Earth's own field is
        about 50 μT.
      </p>
    </div>
  );
}
