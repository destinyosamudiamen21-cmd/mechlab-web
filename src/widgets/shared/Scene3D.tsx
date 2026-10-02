import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// A widget describes its 3D scene with one function: it receives an empty scene, adds its
// objects, and returns an "update" function that moves or recolours them when a slider changes.
export type SceneSetup<S> = (scene: THREE.Scene) => (state: S) => void;

type View = {
  position: [number, number, number];
  target: [number, number, number];
};

type Props<S> = {
  setup: SceneSetup<S>; // must be defined outside the component so it never changes
  state: S;
  view: View;
  label: string;
};

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

// Everything every 3D widget needs, written once: renderer, camera, lights, turning with a
// finger, resizing, drawing only when something changed, and giving the memory back at the end.
export default function Scene3D<S>({ setup, state, view, label }: Props<S>) {
  const mountRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<{
    update: (state: S) => void;
    render: () => void;
  } | null>(null);
  const [supported, setSupported] = useState(hasWebGL);

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(4, 8, 5);
    scene.add(sun);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(...view.position);

    const update = setup(scene);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...view.target);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.update();
    // Turn left and right only; an up/down swipe still scrolls the page.
    const tilt = controls.getPolarAngle();
    controls.minPolarAngle = tilt;
    controls.maxPolarAngle = tilt;
    renderer.domElement.style.touchAction = "pan-y";

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

    liveRef.current = { update, render };

    return () => {
      liveRef.current = null;
      observer.disconnect();
      controls.removeEventListener("change", render);
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          for (const material of materials) material.dispose();
        }
      });
      // Hand the 3D context back straight away. Browsers allow only about 16 per page,
      // and dispose() alone leaves it held until the browser tidies up by itself.
      renderer.forceContextLoss();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // The scene is built once. "setup" and "view" are constants defined outside the widget.
  }, [supported, setup, view]);

  // After every change to the widget's numbers: move the objects and draw one frame.
  useEffect(() => {
    const live = liveRef.current;
    if (!live) return;
    live.update(state);
    live.render();
  });

  if (!supported) {
    return (
      <p className='hint scene-missing'>
        This browser cannot draw 3D, so the model is hidden. The diagram and the
        numbers still work.
      </p>
    );
  }

  return <div ref={mountRef} className='scene' role='img' aria-label={label} />;
}

// ---- Small helpers for building scenes ----

export function solid(
  color: number,
  options: { opacity?: number; metalness?: number } = {}
): THREE.MeshStandardMaterial {
  const { opacity = 1, metalness = 0.2 } = options;
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness: 0.6,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
    side: opacity < 1 ? THREE.DoubleSide : THREE.FrontSide,
  });
}

// A thick arrow that starts at its own origin and points along +Y until you aim it.
export type Arrow = {
  object: THREE.Group;
  setLength: (length: number) => void;
  aim: (x: number, y: number, z: number) => void;
};

export function arrow(color: number, thickness = 0.035): Arrow {
  const material = solid(color);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(thickness, thickness, 1, 12),
    material
  );
  const head = new THREE.Mesh(
    new THREE.ConeGeometry(thickness * 3, thickness * 7, 16),
    material.clone()
  );
  const object = new THREE.Group();
  object.add(shaft, head);
  const headLength = thickness * 7;

  const setLength = (length: number) => {
    const size = Math.abs(length);
    object.visible = size > 0.02;
    const shaftLength = Math.max(0.001, size - headLength);
    shaft.scale.y = shaftLength;
    shaft.position.y = shaftLength / 2;
    head.position.y = shaftLength + headLength / 2;
  };
  const aim = (x: number, y: number, z: number) => {
    object.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(x, y, z).normalize()
    );
  };
  setLength(1);
  return { object, setLength, aim };
}
