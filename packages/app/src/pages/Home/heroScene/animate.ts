import { toThreeColor } from "./colors";
import {
  BRIDGE_LEFT,
  BRIDGE_LENGTH,
  CHARACTER_END_X,
  CHARACTER_START_X,
  CHARACTER_Y,
  LEVER_ANGLE_OFF,
  LEVER_ANGLE_ON,
  bridgeCenterX,
} from "./buildWorld";
import type { AnimationState, ThemeColors, WorldMeshes } from "./types";

const LOOP_DURATION = 6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function phase(t: number, start: number, end: number): number {
  return smoothstep(start, end, t);
}

function phaseOut(t: number, start: number, end: number): number {
  return 1 - smoothstep(start, end, t);
}

function between(t: number, start: number, end: number): number {
  if (t < start || t > end) return 0;
  const local = (t - start) / (end - start);
  return Math.sin(local * Math.PI);
}

/** Maps elapsed seconds to normalized animation state (mirrors CSS hero keyframes). */
export function computeAnimationState(elapsedSeconds: number): AnimationState {
  const t = (elapsedSeconds % LOOP_DURATION) / LOOP_DURATION;

  const leverPull =
    t < 0.22
      ? 0
      : t <= 0.27
        ? phase(t, 0.22, 0.27)
        : t <= 0.72
          ? 1
          : t <= 0.77
            ? phaseOut(t, 0.72, 0.77)
            : 0;

  const bridgeOpacity =
    t < 0.27
      ? 0
      : t <= 0.4
        ? phase(t, 0.27, 0.4)
        : t <= 0.68
          ? 1
          : t <= 0.77
            ? phaseOut(t, 0.68, 0.77)
            : 0;

  const towerGlow =
    t < 0.27
      ? 0
      : t <= 0.35
        ? phase(t, 0.27, 0.35)
        : t <= 0.68
          ? 0.6 + between(t, 0.35, 0.68) * 0.4
          : t <= 0.77
            ? phaseOut(t, 0.68, 0.77)
            : 0;

  const characterT =
    t < 0.3
      ? 0
      : t <= 0.68
        ? smoothstep(0.3, 0.68, t)
        : t <= 0.77
          ? 1 - smoothstep(0.68, 0.77, t)
          : 0;

  const particleBurst = between(t, 0.28, 0.38);

  return {
    leverPull,
    bridgeOpacity,
    towerGlow,
    characterT,
    particleBurst,
  };
}

/** Static unlocked frame for prefers-reduced-motion. */
export function staticAnimationState(): AnimationState {
  return {
    leverPull: 1,
    bridgeOpacity: 1,
    towerGlow: 0.8,
    characterT: 0.5,
    particleBurst: 0,
  };
}

export function applyAnimationState(
  world: WorldMeshes,
  state: AnimationState,
  colors: ThemeColors,
  isDark: boolean,
): void {
  const accent = toThreeColor(colors.accent);
  const raised = toThreeColor(colors.raised);
  const raisedHover = toThreeColor(colors.raisedHover);

  // Lever - pulls back before the bridge extends, returns as it retracts
  world.leverHandle.rotation.x =
    LEVER_ANGLE_OFF + state.leverPull * (LEVER_ANGLE_ON - LEVER_ANGLE_OFF);
  world.leverBaseMaterial.color.copy(raisedHover).lerp(accent, state.leverPull);
  world.leverBaseMaterial.emissive.copy(accent);
  world.leverBaseMaterial.emissiveIntensity = state.leverPull * (isDark ? 0.35 : 0.2);

  // Bridge - grows from the left gate toward the tower landing
  const scaleX = Math.max(0.001, state.bridgeOpacity);
  world.bridge.scale.x = scaleX;
  world.bridge.position.x = bridgeCenterX(scaleX);
  world.bridge.visible = state.bridgeOpacity > 0.001;
  world.bridgeMaterial.emissiveIntensity = state.bridgeOpacity * (isDark ? 0.7 : 0.45);
  world.bridgeMaterial.color.copy(raised).lerp(accent, state.bridgeOpacity * 0.85);

  // Tower glow
  world.towerGlowMaterial.emissiveIntensity = state.towerGlow * 1.6;
  world.towerGlowMaterial.opacity = state.towerGlow * 1.0;
  world.towerGlow.visible = state.towerGlow > 0.01;

  // Gate fades as the bridge extends
  world.lockedWallMaterial.opacity = 0.75 * (1 - state.bridgeOpacity);
  world.lockedWall.visible = state.bridgeOpacity < 0.95;

  // Character walks along the bridge once it has appeared
  const walkT = state.bridgeOpacity > 0.2 ? state.characterT : 0;
  world.character.position.x = CHARACTER_START_X + (CHARACTER_END_X - CHARACTER_START_X) * walkT;
  world.character.position.y = CHARACTER_Y + Math.sin(walkT * Math.PI * 4) * 0.03;

  // Particles burst at the bridge leading edge
  const positions = world.particles.geometry.getAttribute("position") as {
    array: Float32Array;
    needsUpdate: boolean;
  };
  const burst = state.particleBurst;
  const bridgeFrontX = BRIDGE_LEFT + BRIDGE_LENGTH * scaleX;
  world.particles.position.set(bridgeFrontX, 0.55, 0);
  for (let i = 0; i < positions.array.length / 3; i++) {
    const angle = (i / (positions.array.length / 3)) * Math.PI * 2;
    const radius = burst * (0.5 + (i % 5) * 0.15);
    positions.array[i * 3] = Math.cos(angle) * radius;
    positions.array[i * 3 + 1] = burst * (0.3 + (i % 3) * 0.2);
    positions.array[i * 3 + 2] = Math.sin(angle) * radius * 0.6;
  }
  positions.needsUpdate = true;
  world.particleMaterial.opacity = burst * 0.9;
}
