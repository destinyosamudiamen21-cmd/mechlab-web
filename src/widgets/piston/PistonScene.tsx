import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { heatColor } from "./heat";

// How tall the gas column is drawn for each m³ (so 0.2 m³ is 3 units tall).
const HEIGHT_PER_M3 = 15;
const TUBE_HEIGHT = 3.3;

type Props = {
  volume: number; // current volume, m³: sets the piston height
  heat: number; // 0 (cold) to 1 (hot): sets the gas colour
};

type Parts = {
  piston: THREE.Mesh;
  rod: THREE.Mesh;
  gas: THREE.Mesh;
  gasMaterial: THREE.MeshStandardMaterial;
  render: () => void;
};

// Some old phones have no WebGL. We check first and draw a flat picture instead.
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function PistonScene({ volume, heat }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const partsRef = useRef<Parts | null>(null);
  const [supported, setSupported] = useState(hasWebGL);

  // Build the scene once. It is NOT rebuilt when a slider moves.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !supported) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setSupported(false);
      return;
    }
    // Sharp enough, but capped: phones with 3x screens would draw 9x the pixels for no gain.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.set(5.4, 4.0, 6.4);

    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(4, 8, 5);
    scene.add(sun);

    // All geometry is made in code: nothing to download.
    const metal = new THREE.MeshStandardMaterial({
      color: 0x3a4658,
      metalness: 0.4,
      roughness: 0.5,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x9fc3ff,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const gasMaterial = new THREE.MeshStandardMaterial({
      color: 0x1f6feb,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });

    const base = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.14, 2.9), metal);
    base.position.y = -0.07;

    // A ruler beside the glass with a mark every 0.05 m³, so the volume can be read off.
    const ruler = new THREE.Group();
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, TUBE_HEIGHT, 0.06),
      metal
    );
    post.position.set(1.18, TUBE_HEIGHT / 2, 0);
    ruler.add(post);
    for (const mark of [0.05, 0.1, 0.15, 0.2]) {
      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.035, 0.06),
        metal
      );
      tick.position.set(1.08, mark * HEIGHT_PER_M3, 0);
      ruler.add(tick);
    }

    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, TUBE_HEIGHT, 48, 1, true),
      glass
    );
    tube.position.y = TUBE_HEIGHT / 2;
    tube.renderOrder = 2;

    const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 8, 48), metal);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = TUBE_HEIGHT;

    // The gas is a cylinder 1 unit tall that we stretch to the piston height.
    const gas = new THREE.Mesh(
      new THREE.CylinderGeometry(0.97, 0.97, 1, 48),
      gasMaterial
    );
    gas.renderOrder = 1;

    const piston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.97, 0.97, 0.16, 48),
      metal
    );
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 1, 24),
      metal
    );

    scene.add(base, ruler, tube, rim, gas, piston, rod);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.6, 0);
    controls.enablePan = false;
    controls.enableZoom = false; // scrolling the page must not zoom the model
    controls.update();
    // Turn left and right only, and let an up/down swipe scroll the page as usual.
    const tilt = controls.getPolarAngle();
    controls.minPolarAngle = tilt;
    controls.maxPolarAngle = tilt;
    renderer.domElement.style.touchAction = "pan-y";

    // Draw only when something changed: no 60-frames-a-second loop draining the battery.
    const render = () => renderer.render(scene, camera);
    controls.addEventListener("change", render);

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    partsRef.current = { piston, rod, gas, gasMaterial, render };

    // Leaving the page: hand the graphics memory back.
    return () => {
      partsRef.current = null;
      observer.disconnect();
      controls.removeEventListener("change", render);
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      metal.dispose();
      glass.dispose();
      gasMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [supported]);

  // A slider moved: reposition three objects, recolour the gas, draw one frame.
  useEffect(() => {
    const parts = partsRef.current;
    if (!parts) return;
    const height = volume * HEIGHT_PER_M3;
    parts.gas.scale.y = height;
    parts.gas.position.y = height / 2;
    parts.piston.position.y = height + 0.08;
    parts.rod.position.y = height + 0.16 + 0.5;
    parts.gasMaterial.color.set(heatColor(heat));
    parts.render();
  }, [volume, heat, supported]);

  if (!supported) {
    // Flat fallback: same information, no 3D needed.
    const top = 150 - volume * HEIGHT_PER_M3 * 40;
    return (
      <svg
        className='piston-fallback'
        viewBox='0 0 200 170'
        role='img'
        aria-label='Piston in a cylinder'
      >
        <rect
          x='60'
          y={top}
          width='80'
          height={150 - top}
          fill={heatColor(heat)}
          opacity='0.6'
        />
        <path
          d='M60 14 V150 H140 V14'
          fill='none'
          stroke='#16202e'
          strokeWidth='2'
        />
        <rect x='60' y={top - 8} width='80' height='8' fill='#3a4658' />
        <rect x='96' y={top - 40} width='8' height='32' fill='#3a4658' />
      </svg>
    );
  }

  return (
    <div
      ref={mountRef}
      className='scene'
      role='img'
      aria-label='Piston in a glass cylinder. Drag sideways to turn it.'
    />
  );
}
