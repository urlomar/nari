import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { RoundedBoxGeometry } from "three-stdlib";
import * as THREE from "three";
import { motion, useReducedMotion, type MotionValue } from "motion/react";
import s from "./Cube.module.css";
import { useScrollProgress } from "@/styles/useScrollReveal";
import { useTheme } from "@/styles/useTheme";
// Refreshed photo pool (12 new images reviewed for rights/diversity — see
// DECISIONS.md "Cube photo refresh"). All 12 turned out to be clean stock
// photography (plain studio backdrops, no event backdrops or visible
// identifiable public figures) — unlike the last two photo drops, nothing
// here needed to be excluded. image1 is reserved for the About page; these
// 5 are picked from the remaining 11 for skin-tone and styling spread.
import photoFront from "@/assets/photos/images/image3.png";
import photoLeft from "@/assets/photos/images/image2.png";
import photoTop from "@/assets/photos/images/image9.png";
import photoRight from "@/assets/photos/images/image6.png";
import photoBack from "@/assets/photos/images/image11.png";

/**
 * The cube's Logo-face curl mark — cube-only, per Nya's request (does NOT
 * touch Logo.tsx or the site-wide "i" dot, which keeps its own original
 * spiral). This is a self-intersecting limaçon (`r = b + a·cos(θ)` with
 * `a > b`, which loops back and crosses itself once — the closest literal
 * match to a flipped ➰), generated parametrically and picked from 4
 * screenshotted variants — see DECISIONS.md "Cube curl mark" for the other
 * three and the full reasoning, and PLAN.md for which one was chosen.
 * Replaces the original tight logarithmic spiral, which Nya felt sat too
 * close to the stem — see makeLogoFaceTexture's clearance fix below, which
 * applies regardless of which curl shape is in use here.
 */
const CURL_PATH_2D: Array<[number, number]> = [
  [1.57, -4.32], [1.11, -4.45], [0.63, -4.48], [0.15, -4.44], [-0.3, -4.3],
  [-0.72, -4.09], [-1.09, -3.82], [-1.41, -3.48], [-1.65, -3.1], [-1.81, -2.69],
  [-1.9, -2.26], [-1.9, -1.84], [-1.83, -1.43], [-1.68, -1.05], [-1.48, -0.72],
  [-1.22, -0.44], [-0.93, -0.23], [-0.61, -0.09], [-0.28, -0.01], [0.04, 0],
  [0.34, -0.06], [0.61, -0.18], [0.84, -0.34], [1.02, -0.54], [1.14, -0.77],
  [1.19, -1], [1.19, -1.23], [1.13, -1.45], [1.02, -1.63], [0.87, -1.78],
  [0.68, -1.88], [0.48, -1.92], [0.27, -1.91], [0.06, -1.84], [-0.12, -1.71],
  [-0.27, -1.53], [-0.38, -1.32], [-0.43, -1.07], [-0.43, -0.8], [-0.36, -0.53],
  [-0.22, -0.27], [-0.03, -0.03], [0.22, 0.17], [0.52, 0.33], [0.86, 0.42],
  [1.22, 0.44], [1.6, 0.4], [1.97, 0.28], [2.32, 0.08], [2.64, -0.18],
  [2.91, -0.51], [3.11, -0.89], [3.25, -1.31], [3.31, -1.76], [3.29, -2.22],
  [3.19, -2.67], [3, -3.1], [2.73, -3.5], [2.4, -3.84], [2.01, -4.12],
  [1.57, -4.32],
];

const FACE_SIZE = 768;

/**
 * Center-crops any source image to a square via canvas "cover" math (scale
 * by the larger of width/height ratios, then let the overflow clip against
 * the canvas bounds) — never stretches non-square source photos to fit,
 * per the brief. Runs once per photo since the crop is baked into the
 * canvas pixels, not redone per frame.
 */
function cropToSquareTexture(image: unknown, maxAnisotropy: number) {
  const img = image as HTMLImageElement;
  const iw = img.naturalWidth || img.width || FACE_SIZE;
  const ih = img.naturalHeight || img.height || FACE_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = FACE_SIZE;
  canvas.height = FACE_SIZE;
  const ctx = canvas.getContext("2d")!;
  const scale = Math.max(FACE_SIZE / iw, FACE_SIZE / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (FACE_SIZE - dw) / 2, (FACE_SIZE - dh) / 2, dw, dh);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

function makeLogoFaceTexture(theme: "light" | "dark", maxAnisotropy: number) {
  const canvas = document.createElement("canvas");
  canvas.width = FACE_SIZE;
  canvas.height = FACE_SIZE;
  const ctx = canvas.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, FACE_SIZE, FACE_SIZE);
  if (theme === "dark") {
    bg.addColorStop(0, "#1D1728");
    bg.addColorStop(1, "#2A1F3D");
  } else {
    bg.addColorStop(0, "#F7F4FB");
    bg.addColorStop(1, "#F3E8FF");
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, FACE_SIZE, FACE_SIZE);

  const textColor = theme === "dark" ? "#F7F4FB" : "#241C30";
  const fontSize = 220;
  ctx.font = `700 ${fontSize}px Figtree, Inter, sans-serif`;
  ctx.textBaseline = "alphabetic";
  const narWidth = ctx.measureText("Nar").width;
  const stemW = fontSize * 0.11;
  const gap = fontSize * 0.1;
  const totalWidth = narWidth + gap + stemW + fontSize * 0.16;
  const startX = (FACE_SIZE - totalWidth) / 2;
  const baselineY = FACE_SIZE / 2 + fontSize * 0.32;

  ctx.fillStyle = textColor;
  ctx.fillText("Nar", startX, baselineY);

  const stemX = startX + narWidth + gap;
  const stemH = fontSize * 0.52;
  const stemY = baselineY - stemH;
  const stemR = stemW / 2;
  ctx.beginPath();
  ctx.roundRect(stemX, stemY, stemW, stemH, stemR);
  ctx.fill();

  const curlScale = fontSize * 0.052;
  const curlCx = stemX + stemW / 2;
  // Positioned from the curl's own bottom edge, not a blind center offset —
  // the old `stemY - fontSize * 0.16` ignored this specific shape's vertical
  // extent and could put the curl's lowest point *past* the stem's top
  // (measured: ~0.054*fontSize of real overlap with the original spiral).
  // clearanceGap is real, proportional gap between them — this generalizes
  // to any curl shape without re-tuning, per Nya's "too close to the stem"
  // note. See DECISIONS.md "Cube curl mark."
  const curlBottomLocal = Math.max(...CURL_PATH_2D.map(([, y]) => y));
  const clearanceGap = fontSize * 0.09;
  const curlCy = stemY - clearanceGap - curlBottomLocal * curlScale;
  ctx.strokeStyle = textColor;
  ctx.lineWidth = fontSize * 0.034;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  CURL_PATH_2D.forEach(([x, y], i) => {
    const px = curlCx + x * curlScale;
    const py = curlCy + y * curlScale;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

function makeRimGradientTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#FB923C");
  gradient.addColorStop(0.4, "#EC4899");
  gradient.addColorStop(0.75, "#A855F7");
  gradient.addColorStop(1, "#60A5FA");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

interface RotatingCubeProps {
  scrollProgress: MotionValue<number>;
  reducedMotion: boolean;
  theme: "light" | "dark";
}

function RotatingCube({ scrollProgress, reducedMotion, theme }: RotatingCubeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const rimRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>(null);
  const { gl } = useThree();

  const [texFront, texLeft, texTop, texRight, texBack] = useTexture([
    photoFront,
    photoLeft,
    photoTop,
    photoRight,
    photoBack,
  ]);

  const maxAnisotropy = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);
  const geometry = useMemo(() => new RoundedBoxGeometry(2, 2, 2, 5, 0.16), []);
  const rimGeometry = useMemo(() => new RoundedBoxGeometry(2.16, 2.16, 2.16, 5, 0.18), []);

  const materials = useMemo(() => {
    const photoOpts = { roughness: 0.55, metalness: 0.05 };
    const logoTex = makeLogoFaceTexture(theme, maxAnisotropy);
    return [
      new THREE.MeshStandardMaterial({ map: cropToSquareTexture(texRight.image, maxAnisotropy), ...photoOpts }), // +x right
      new THREE.MeshStandardMaterial({ map: cropToSquareTexture(texLeft.image, maxAnisotropy), ...photoOpts }), // -x left
      new THREE.MeshStandardMaterial({ map: cropToSquareTexture(texTop.image, maxAnisotropy), ...photoOpts }), // +y top
      new THREE.MeshStandardMaterial({ map: logoTex, roughness: 0.5, metalness: 0.08 }), // -y bottom (Logo face)
      new THREE.MeshStandardMaterial({ map: cropToSquareTexture(texFront.image, maxAnisotropy), ...photoOpts }), // +z front
      new THREE.MeshStandardMaterial({ map: cropToSquareTexture(texBack.image, maxAnisotropy), ...photoOpts }), // -z back
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texFront, texLeft, texTop, texRight, texBack, theme, maxAnisotropy]);

  const rimTexture = useMemo(() => makeRimGradientTexture(), []);
  const rimMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: rimTexture,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [rimTexture]
  );

  // Mutable interaction state kept out of React state so pointer/scroll
  // updates never trigger a re-render — useFrame reads it every tick instead.
  const mouseTarget = useRef({ x: 0, y: 0 });
  const mouseCurrent = useRef({ x: 0, y: 0 });
  const hoverTarget = useRef(0); // 0 or 1, eased toward each frame
  const hoverCurrent = useRef(0);
  const drag = useRef({
    active: false,
    lastX: 0,
    lastY: 0,
    lastT: 0,
    velX: 0, // rad/sec
    velY: 0,
    offsetX: 0,
    offsetY: 0,
  });

  useEffect(() => {
    if (reducedMotion) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    function onMove(e: MouseEvent) {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      mouseTarget.current.x = ny * 0.16;
      mouseTarget.current.y = nx * 0.2;
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reducedMotion]);

  const DRAG_SENSITIVITY = 0.007; // rad per px

  function onPointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current.active = true;
    drag.current.lastX = e.clientX;
    drag.current.lastY = e.clientY;
    drag.current.lastT = performance.now();
    drag.current.velX = 0;
    drag.current.velY = 0;
  }
  function onPointerMove(e: ThreeEvent<PointerEvent>) {
    if (!drag.current.active) return;
    const now = performance.now();
    const dt = Math.max((now - drag.current.lastT) / 1000, 1 / 120); // seconds, floored so a 0ms gap can't divide-by-near-zero
    const dx = e.clientX - drag.current.lastX;
    const dy = e.clientY - drag.current.lastY;
    drag.current.lastX = e.clientX;
    drag.current.lastY = e.clientY;
    drag.current.lastT = now;
    const rotY = dx * DRAG_SENSITIVITY;
    const rotX = dy * DRAG_SENSITIVITY;
    drag.current.offsetY += rotY;
    drag.current.offsetX += rotX;
    // Velocity in rad/sec (not rad/event) so release inertia reflects how
    // fast the drag actually moved, independent of how many pointermove
    // events the browser happened to fire for it.
    drag.current.velX = rotX / dt;
    drag.current.velY = rotY / dt;
  }
  function onPointerUp() {
    drag.current.active = false;
  }
  function onPointerOver() {
    hoverTarget.current = 1;
  }
  function onPointerOut() {
    hoverTarget.current = 0;
    drag.current.active = false;
  }

  useFrame((_state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (reducedMotion) {
      group.rotation.set(-0.18, 0.6, 0);
      group.scale.setScalar(1);
      if (rimRef.current) rimRef.current.material.opacity = 0;
      return;
    }

    const progress = scrollProgress.get();
    // The cube sits within the fold, so `progress` is already partway
    // through its 0->1 range at rest (scroll 0) rather than starting at 0
    // — these constants are tuned against that rest value (~0.45 at a
    // typical viewport height), not against progress=0, so the resting
    // pose reads as a deliberate 3/4 product-shot angle with a photo face
    // dominant, not a coin-flip of whichever face the raw math lands on.
    const idleY = 0.15 + progress * 1.0;
    const idleX = -0.22 + progress * 0.15;

    const lerpAmt = Math.min(1, delta * 4);
    mouseCurrent.current.x += (mouseTarget.current.x - mouseCurrent.current.x) * lerpAmt;
    mouseCurrent.current.y += (mouseTarget.current.y - mouseCurrent.current.y) * lerpAmt;
    hoverCurrent.current += (hoverTarget.current - hoverCurrent.current) * Math.min(1, delta * 6);

    if (!drag.current.active) {
      // Inertia + ease-back, both decaying on a fixed real-world half-life
      // via Math.pow(base, delta) rather than a flat per-frame multiplier —
      // a per-frame `*= 0.94` only decays at the intended rate if useFrame
      // is actually ticking at ~60fps, and silently barely decays at all
      // under a slower/irregular tick rate. Math.pow(base, delta) instead
      // reaches the same real-world decay regardless of how often (or
      // unevenly) frames actually land.
      drag.current.offsetX += drag.current.velX * delta;
      drag.current.offsetY += drag.current.velY * delta;
      drag.current.velX *= Math.pow(0.002, delta); // velocity ~0.2% left after 1s
      drag.current.velY *= Math.pow(0.002, delta);
      drag.current.offsetX *= Math.pow(0.001, delta); // offset ~0.1% left after 1s
      drag.current.offsetY *= Math.pow(0.001, delta);
    }

    // Single blended rotation: scroll idle pose + mouse tilt (boosted while
    // hovered, "magnetic lean") + drag offset, all summed once and applied
    // once — four inputs driving one state rather than fighting each other.
    const hoverLean = 1 + hoverCurrent.current * 0.8;
    group.rotation.x = idleX + mouseCurrent.current.x * hoverLean + drag.current.offsetX;
    group.rotation.y = idleY + mouseCurrent.current.y * hoverLean + drag.current.offsetY;

    // Single blended scale: 1 at rest, up to 1.06 while hovered — the only
    // other per-frame output, alongside rotation above.
    const targetScale = 1 + hoverCurrent.current * 0.06;
    group.scale.setScalar(targetScale);

    if (rimRef.current) {
      rimRef.current.material.opacity = hoverCurrent.current * 0.55;
    }
  });

  return (
    <group
      ref={groupRef}
      rotation={[-0.14, 0.6, 0]}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <mesh
        geometry={geometry}
        material={materials}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
      <mesh ref={rimRef} geometry={rimGeometry} material={rimMaterial} />
    </group>
  );
}

/**
 * Hero centerpiece: an interactive 3D cube (three.js via @react-three/fiber
 * + drei) with 5 real, center-cropped photo faces and 1 Logo-mark face.
 * Rotation/scale are driven by one blended state per frame (see
 * RotatingCube's useFrame) combining scroll progress, mouse tilt, drag, and
 * hover — not four competing transforms. See CLAUDE.md for the go/no-go
 * call on this feature.
 */
export function Cube() {
  const { ref, scrollYProgress } = useScrollProgress<HTMLDivElement>();
  const reducedMotion = useReducedMotion() ?? false;
  const { theme } = useTheme();

  return (
    <motion.div
      ref={ref}
      className={s.canvasWrap}
      initial={reducedMotion ? false : { opacity: 0, y: 28, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <Canvas camera={{ position: [0, 0, 5.2], fov: 38 }} dpr={[1, 2]}>
        <ambientLight intensity={0.65} />
        <directionalLight position={[3, 4, 5]} intensity={1.3} />
        <directionalLight position={[-4, -2, -3]} intensity={0.35} color="#A855F7" />
        <Suspense fallback={null}>
          <RotatingCube scrollProgress={scrollYProgress} reducedMotion={reducedMotion} theme={theme} />
        </Suspense>
      </Canvas>
    </motion.div>
  );
}
