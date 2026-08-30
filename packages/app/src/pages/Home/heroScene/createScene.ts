import {
  AmbientLight,
  Color,
  DirectionalLight,
  Fog,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { applyAnimationState, computeAnimationState, staticAnimationState } from "./animate";
import { applyThemeToWorld, buildWorld } from "./buildWorld";
import { isSceneDark, readSceneColors, toThreeColor } from "./colors";
import type { SceneContext } from "./types";

export function createHeroScene(container: HTMLElement): SceneContext | null {
  let canvas: HTMLCanvasElement;
  try {
    canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.className = "absolute inset-0 w-full h-full pointer-events-none";
    container.prepend(canvas);
  } catch {
    return null;
  }

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  } catch {
    canvas.remove();
    return null;
  }

  const colors = readSceneColors();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scene = new Scene();
  scene.fog = new Fog(toThreeColor(colors.page).getHex(), 14, 28);

  const camera = new PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(4, 4.5, 6);
  camera.lookAt(0, 0.5, 0);

  const ambientLight = new AmbientLight(new Color("#ffffff"), 0.95);
  scene.add(ambientLight);

  const directionalLight = new DirectionalLight(new Color("#ffffff"), 1.15);
  directionalLight.position.set(5, 8, 4);
  scene.add(directionalLight);

  const fillLight = new DirectionalLight(new Color("#9adce8"), 0);
  fillLight.position.set(-3, 4, 6);
  scene.add(fillLight);

  const world = buildWorld(colors);
  scene.add(world.root);

  let lastAppliedDark = isSceneDark();

  function syncLighting(dark: boolean): void {
    ambientLight.intensity = dark ? 1.35 : 0.95;
    directionalLight.intensity = dark ? 1.55 : 1.15;
    fillLight.intensity = dark ? 0.45 : 0;
    if (scene.fog instanceof Fog) {
      scene.fog.near = dark ? 20 : 14;
      scene.fog.far = dark ? 45 : 28;
    }
  }

  function applySceneTheme(force = false): void {
    const dark = isSceneDark();
    if (!force && dark === lastAppliedDark) return;
    lastAppliedDark = dark;

    syncLighting(dark);
    const themeColors = readSceneColors(dark);
    applyThemeToWorld(world, themeColors, dark);

    const pageColor = toThreeColor(themeColors.page);
    if (scene.fog instanceof Fog) {
      scene.fog.color.copy(pageColor);
    }
    renderer.setClearColor(pageColor, 0);
  }

  const ctx: SceneContext = {
    renderer,
    scene,
    camera,
    ambientLight,
    directionalLight,
    fillLight,
    world,
    container,
    reducedMotion,
    isDark: lastAppliedDark,
    syncLighting,
    applySceneTheme,
    refresh: () => {},
    dispose: () => {},
  };

  applySceneTheme(true);

  function resize(): void {
    const { width, height } = container.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  resize();

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  let rafId = 0;
  let visible = true;
  let startTime = performance.now();
  let elapsed = 0;

  function renderFrame(now: number): void {
    if (!visible) return;

    if (!ctx.reducedMotion) {
      elapsed = (now - startTime) / 1000;
    }

    const state = ctx.reducedMotion ? staticAnimationState() : computeAnimationState(elapsed);

    applySceneTheme();
    ctx.isDark = lastAppliedDark;

    const currentColors = readSceneColors(lastAppliedDark);
    applyAnimationState(world, state, currentColors, lastAppliedDark);

    ctx.renderer.render(ctx.scene, ctx.camera);
  }

  function tick(now: number): void {
    renderFrame(now);
    if (!ctx.reducedMotion && visible) {
      rafId = requestAnimationFrame(tick);
    }
  }

  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible && !ctx.reducedMotion) {
        cancelAnimationFrame(rafId);
        startTime = performance.now() - elapsed * 1000;
        rafId = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(rafId);
      }
    },
    { threshold: 0.05 },
  );
  intersectionObserver.observe(container);

  ctx.refresh = () => renderFrame(performance.now());

  if (ctx.reducedMotion) {
    renderFrame(performance.now());
  } else {
    rafId = requestAnimationFrame(tick);
  }

  ctx.dispose = () => {
    cancelAnimationFrame(rafId);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    canvas.remove();

    renderer.dispose();
    world.root.traverse((obj) => {
      if ("geometry" in obj && obj.geometry) {
        (obj.geometry as { dispose?: () => void }).dispose?.();
      }
      if ("material" in obj && obj.material) {
        const mat = obj.material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose?.());
        } else {
          (mat as { dispose?: () => void }).dispose?.();
        }
      }
    });
  };

  return ctx;
}

export function updateSceneTheme(ctx: SceneContext): void {
  ctx.applySceneTheme(true);
  ctx.isDark = isSceneDark();
  ctx.refresh();
}
