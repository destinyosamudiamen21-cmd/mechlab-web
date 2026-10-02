import { useState } from "react";
import * as THREE from "three";
import { solveVessel } from "./vessel/solver";
import type { VesselKind } from "./vessel/solver";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Scene3D, { arrow, solid } from "./shared/Scene3D";
import type { SceneSetup } from "./shared/Scene3D";
import Segments from "./shared/Segments";
import Slider from "./shared/Slider";
import { ACCENT, AMBER_TEXT, INK, SOFT, TINT, fmt } from "./shared/theme";

const E = 200; // GPa
const NU = 0.3;
const KINDS: { id: VesselKind; label: string }[] = [
  { id: "cylinder", label: "Cylinder" },
  { id: "sphere", label: "Sphere" },
];
const DEFAULTS = { kind: "cylinder" as VesselKind, p: 2, d: 1200, t: 12 };

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: a cylindrical boiler shell is pumped up until it bursts. Which way does the split run?",
  options: [
    "Along the length of the shell",
    "Round the circumference",
    "In no particular direction",
  ],
  correct: 0,
  explain:
    "Along the length. The hoop stress (pulling round the circumference) is twice the longitudinal stress, so the wall is pulled apart sideways first and the crack opens along the length. It is why a boiled sausage splits lengthways. It is also why the lengthwise joint of a boiler has to be the stronger one.",
};

type SceneState = {
  kind: VesselKind;
  hoop: number;
  longitudinal: number;
  radius: number;
};

// The vessel with a small square of its wall marked on top. Four arrows pull on the square:
// amber round the circumference (hoop), blue along the axis (longitudinal). Longer = larger stress.
const setup: SceneSetup<SceneState> = (scene) => {
  const steel = solid(0x9fb3cc, { metalness: 0.4 });
  const cylinder = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 3, 48), steel);
  shell.rotation.z = Math.PI / 2;
  const caps = [-1.5, 1.5].map((x) => {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), steel);
    cap.scale.x = 0.45;
    cap.position.x = x;
    return cap;
  });
  cylinder.add(shell, ...caps);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), steel);
  const patch = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.03, 0.5),
    solid(0x16202e)
  );
  scene.add(cylinder, sphere, patch);

  const directions: [number, number, number, number][] = [
    [0, 0, 1, 0xf2a900],
    [0, 0, -1, 0xf2a900], // hoop
    [1, 0, 0, 0x1f6feb],
    [-1, 0, 0, 0x1f6feb], // longitudinal
  ];
  const arrows = directions.map(([x, y, z, color]) => {
    const one = arrow(color, 0.045);
    one.aim(x, y, z);
    scene.add(one.object);
    return { one, x, z };
  });

  return (state) => {
    const r = state.radius;
    cylinder.visible = state.kind === "cylinder";
    sphere.visible = state.kind === "sphere";
    cylinder.scale.set(1, r, r);
    sphere.scale.setScalar(r * 1.25);
    const top = state.kind === "cylinder" ? r : r * 1.25;
    patch.position.y = top;
    arrows.forEach(({ one, x, z }, index) => {
      const stress = index < 2 ? state.hoop : state.longitudinal;
      one.setLength(Math.min(1.9, 0.25 + stress / 110));
      one.object.position.set(x * 0.27, top + 0.03, z * 0.27);
    });
  };
};
const VIEW = {
  position: [4.4, 4.2, 5.6] as [number, number, number],
  target: [0, 0.5, 0] as [number, number, number],
};

function ArrowHead({
  x,
  y,
  direction,
}: {
  x: number;
  y: number;
  direction: "up" | "down" | "left" | "right";
}) {
  const d = {
    up: `l-4 8 h8 z`,
    down: `l-4 -8 h8 z`,
    left: `l8 -4 v8 z`,
    right: `l-8 -4 v8 z`,
  }[direction];
  return <path d={`M${x} ${y} ${d}`} />;
}

export default function PressureVessel(_props: { topicSlug: string }) {
  const [kind, setKind] = useState(DEFAULTS.kind);
  const [p, setP] = useState(DEFAULTS.p);
  const [d, setD] = useState(DEFAULTS.d);
  const [t, setT] = useState(DEFAULTS.t);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const result = solveVessel({ kind, p, d, t, e: E, nu: NU });
  const cylinder = kind === "cylinder";
  const endForce = (p * Math.PI * d * d) / 4 / 1000; // kN, pressure on the circular end

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
            viewBox='0 0 360 270'
            role='img'
            aria-label={
              cylinder
                ? `Two cuts through the cylinder. Hoop stress ${fmt(
                    result.hoop,
                    1
                  )} megapascals, longitudinal stress ${fmt(
                    result.longitudinal,
                    1
                  )} megapascals.`
                : `A cut through the sphere. Wall stress ${fmt(
                    result.hoop,
                    1
                  )} megapascals.`
            }
          >
            {cylinder && (
              <g>
                {/* cut along the length: looking at the end of half the shell */}
                <text
                  x='90'
                  y='16'
                  fontSize='12'
                  fontWeight='600'
                  fill={INK}
                  textAnchor='middle'
                >
                  cut along the length
                </text>
                <path
                  d='M30 130 A60 60 0 0 1 150 130'
                  fill={TINT}
                  stroke={INK}
                  strokeWidth='5'
                />
                <g stroke={ACCENT} fill={ACCENT} strokeWidth='1.5'>
                  {[50, 70, 90, 110, 130].map((x) => (
                    <g key={x}>
                      <line x1={x} y1='126' x2={x} y2='104' />
                      <ArrowHead x={x} y={98} direction='up' />
                    </g>
                  ))}
                </g>
                <text
                  x='90'
                  y='56'
                  fontSize='11'
                  fill={ACCENT}
                  textAnchor='middle'
                >
                  pressure p acts on width d
                </text>
                <g stroke={AMBER_TEXT} fill={AMBER_TEXT} strokeWidth='2.5'>
                  <line x1='30' y1='134' x2='30' y2='158' />
                  <ArrowHead x={30} y={166} direction='down' />
                  <line x1='150' y1='134' x2='150' y2='158' />
                  <ArrowHead x={150} y={166} direction='down' />
                </g>
                <text
                  x='90'
                  y='186'
                  fontSize='12'
                  fontWeight='600'
                  fill={AMBER_TEXT}
                  textAnchor='middle'
                >
                  σh in two walls
                </text>
                <text
                  x='90'
                  y='212'
                  fontSize='11'
                  fill={INK}
                  textAnchor='middle'
                >
                  p × d × L = 2 × σh × t × L
                </text>
                <text
                  x='90'
                  y='232'
                  fontSize='12'
                  fontWeight='600'
                  fill={INK}
                  textAnchor='middle'
                >
                  σh = p d / 2t = {fmt(result.hoop, 1)} MPa
                </text>
                <line
                  x1='180'
                  y1='10'
                  x2='180'
                  y2='240'
                  stroke={SOFT}
                  strokeOpacity='0.4'
                />
              </g>
            )}
            <g transform={cylinder ? "translate(190 0)" : "translate(95 0)"}>
              {/* cut across: looking from the side at the piece left of the cut */}
              <text
                x='85'
                y='16'
                fontSize='12'
                fontWeight='600'
                fill={INK}
                textAnchor='middle'
              >
                {cylinder ? "cut across" : "cut through the middle"}
              </text>
              {cylinder ? (
                <path
                  d='M130 70 H50 A24 60 0 0 0 50 190 H130'
                  fill={TINT}
                  stroke={INK}
                  strokeWidth='5'
                />
              ) : (
                <path
                  d='M130 70 A60 60 0 0 0 130 190'
                  fill={TINT}
                  stroke={INK}
                  strokeWidth='5'
                />
              )}
              <g stroke={ACCENT} fill={ACCENT} strokeWidth='1.5'>
                {[90, 110, 130, 150, 170].map((y) => (
                  <g key={y}>
                    <line x1='126' y1={y} x2='104' y2={y} />
                    <ArrowHead x={98} y={y} direction='left' />
                  </g>
                ))}
              </g>
              <text
                x='60'
                y='134'
                fontSize='11'
                fill={ACCENT}
                textAnchor='middle'
              >
                {cylinder ? "p" : ""}
              </text>
              <g stroke={ACCENT} fill={ACCENT} strokeWidth='2.5'>
                <line x1='134' y1='70' x2='154' y2='70' />
                <ArrowHead x={162} y={70} direction='right' />
                <line x1='134' y1='190' x2='154' y2='190' />
                <ArrowHead x={162} y={190} direction='right' />
              </g>
              <text x='85' y='212' fontSize='11' fill={INK} textAnchor='middle'>
                p × πd²/4 = {cylinder ? "σl" : "σ"} × πd × t
              </text>
              <text
                x='85'
                y='232'
                fontSize='12'
                fontWeight='600'
                fill={INK}
                textAnchor='middle'
              >
                {cylinder ? "σl" : "σ"} = p d / 4t ={" "}
                {fmt(result.longitudinal, 1)} MPa
              </text>
            </g>
            <text x='180' y='260' fontSize='11' fill={SOFT} textAnchor='middle'>
              {cylinder
                ? "thin arrows: pressure · thick arrows: stress in the cut wall"
                : "every cut through the centre looks the same: one stress"}
            </text>
          </svg>
          <figcaption>
            Where the formulas come from. Cut the vessel, then balance the
            pressure force on the cut piece against the stress in the wall that
            was cut.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <figure className='widget-figure'>
            <Scene3D
              setup={setup}
              state={{
                kind,
                hoop: result.hoop,
                longitudinal: result.longitudinal,
                radius: 0.6 + ((d - 400) / 1600) * 0.4,
              }}
              view={VIEW}
              label='The vessel, with the stresses on a small square of its wall'
            />
            <figcaption>
              {cylinder
                ? "A small square of the wall. Amber arrows: hoop stress. Blue arrows: longitudinal stress. Longer means larger."
                : "A small square of the wall. On a sphere the pull is the same in both directions, so all four arrows are equal."}
            </figcaption>
          </figure>
          <div className='controls'>
            <Segments
              label='Shape'
              options={KINDS}
              value={kind}
              disabled={locked}
              onChange={setKind}
            />
            <Slider
              id='pv-p'
              label='Internal pressure p'
              display={`${fmt(p, 1)} MPa`}
              min={0.5}
              max={5}
              step={0.1}
              value={p}
              disabled={locked}
              onChange={setP}
            />
            <Slider
              id='pv-d'
              label='Diameter d'
              display={`${fmt(d, 0)} mm`}
              min={400}
              max={2000}
              step={50}
              value={d}
              disabled={locked}
              onChange={setD}
            />
            <Slider
              id='pv-t'
              label='Wall thickness t'
              display={`${fmt(t, 0)} mm`}
              min={5}
              max={40}
              step={1}
              value={t}
              disabled={locked}
              onChange={setT}
            />
            <div className='control-buttons'>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  setP(DEFAULTS.p);
                  setD(DEFAULTS.d);
                  setT(DEFAULTS.t);
                }}
              >
                Reset
              </button>
            </div>
            {!result.thin && (
              <p className='feedback'>
                <strong>Not a thin wall.</strong> d / t is{" "}
                {fmt(result.ratio, 1)}, below 20. The stress now varies through
                the wall and these formulas are no longer accurate (that is
                thick cylinder theory).
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
          cylinder
            ? {
                label: "Hoop (circumferential) stress, σh = p d / 2t",
                value: (
                  <>
                    {fmt(p, 1)} × {fmt(d, 0)} / (2 × {fmt(t, 0)}) ={" "}
                    <b>{fmt(result.hoop, 1)} MPa</b>
                  </>
                ),
              }
            : {
                label:
                  "Stress in the wall, σ = p d / 4t  (the same in every direction)",
                value: (
                  <>
                    {fmt(p, 1)} × {fmt(d, 0)} / (4 × {fmt(t, 0)}) ={" "}
                    <b>{fmt(result.hoop, 1)} MPa</b>
                  </>
                ),
              },
          cylinder
            ? {
                label: "Longitudinal stress, σl = p d / 4t",
                value: (
                  <>
                    <b>{fmt(result.longitudinal, 1)} MPa</b>, half the hoop
                    stress
                  </>
                ),
              }
            : {
                label: "Force on the cut, p × πd²/4",
                value: <b>{fmt(endForce, 0)} kN</b>,
              },
          {
            label:
              "Largest shear stress, σh / 2  (taking the stress through the wall as zero)",
            value: <b>{fmt(result.maxShear, 1)} MPa</b>,
          },
          {
            label: "Thin-wall check, d / t",
            value: (
              <>
                <b>{fmt(result.ratio, 1)}</b> (
                {result.thin ? "20 or more: thin" : "under 20: thick"})
              </>
            ),
          },
          {
            label: cylinder
              ? "Hoop strain, εh = (σh − ν σl) / E"
              : "Strain, ε = σ (1 − ν) / E",
            value: (
              <>
                <b>{fmt(result.hoopStrain, 0)} με</b>, so the diameter grows by{" "}
                <b>{fmt(result.growth, 3)} mm</b>
              </>
            ),
          },
          {
            label: cylinder
              ? "Volumetric strain, 2εh + εl"
              : "Volumetric strain, 3ε",
            value: <b>{fmt(result.volumeStrain, 0)} με</b>,
          },
        ]}
      />
      <p className='hint'>
        Strains use steel: E = {E} GPa, ν = {NU}.
      </p>
    </div>
  );
}
