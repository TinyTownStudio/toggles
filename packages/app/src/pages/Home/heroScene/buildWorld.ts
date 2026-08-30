import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CapsuleGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Points,
  PointsMaterial,
  SphereGeometry,
} from "three";
import { toThreeColor } from "./colors";
import type { ThemeColors, WorldMeshes } from "./types";

/** Shared layout constants for the hero diorama. */
export const CHARACTER_RADIUS = 0.22;
export const PLATFORM_TOP = 0.15;
export const WALK_SURFACE_TOP = PLATFORM_TOP + 0.12;
export const CHARACTER_Y = WALK_SURFACE_TOP + CHARACTER_RADIUS + 0.04;

export const BRIDGE_LEFT = -1.9;
export const BRIDGE_LENGTH = 3.5;
export const BRIDGE_HEIGHT = 0.12;
export const BRIDGE_DEPTH = 0.65;

export const CHARACTER_START_X = -2.1;
export const CHARACTER_END_X = 1.2;

export function bridgeCenterX(scaleX: number): number {
  return BRIDGE_LEFT + (BRIDGE_LENGTH / 2) * scaleX;
}

export function walkSurfaceCenterY(): number {
  return WALK_SURFACE_TOP - BRIDGE_HEIGHT / 2;
}

const PARTICLE_COUNT = 28;

export const TOGGLE_TRACK_WIDTH = 0.52;
export const TOGGLE_TRACK_HEIGHT = 0.14;
export const TOGGLE_THUMB_RADIUS = 0.054;
export const TOGGLE_THUMB_X_OFF = -0.17;
export const TOGGLE_THUMB_TRAVEL = 0.34;
export const TOGGLE_BASE_Y = 2.15;

function createToggle(colors: ThemeColors): {
  group: Group;
  trackMaterial: MeshStandardMaterial;
  thumb: Mesh;
} {
  const group = new Group();

  const trackRadius = TOGGLE_TRACK_HEIGHT / 2;
  const trackGeo = new CapsuleGeometry(
    trackRadius,
    TOGGLE_TRACK_WIDTH - TOGGLE_TRACK_HEIGHT,
    8,
    16,
  );
  trackGeo.rotateZ(Math.PI / 2);
  const trackMaterial = new MeshStandardMaterial({
    color: toThreeColor(colors.raisedHover),
    roughness: 0.55,
    metalness: 0.02,
  });
  const track = new Mesh(trackGeo, trackMaterial);
  group.add(track);

  const thumbGeo = new SphereGeometry(TOGGLE_THUMB_RADIUS, 12, 12);
  const thumb = new Mesh(
    thumbGeo,
    new MeshStandardMaterial({
      color: toThreeColor("#ffffff"),
      roughness: 0.35,
      metalness: 0.05,
    }),
  );
  thumb.position.set(TOGGLE_THUMB_X_OFF, 0, trackRadius + 0.01);
  group.add(thumb);

  group.position.set(2.85, TOGGLE_BASE_Y, 0.75);
  group.rotation.set(-0.22, 0.48, 0.06);

  return { group, trackMaterial, thumb };
}

function createParticles(colors: ThemeColors): { points: Points; material: PointsMaterial } {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));

  const material = new PointsMaterial({
    color: toThreeColor(colors.accent),
    size: 0.08,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const points = new Points(geometry, material);
  points.position.set(BRIDGE_LEFT, PLATFORM_TOP + 0.5, 0);
  return { points, material };
}

export function buildWorld(colors: ThemeColors): WorldMeshes {
  const root = new Group();
  root.position.set(0, -0.8, 0);

  const surfaceColor = toThreeColor(colors.surface);
  const raisedColor = toThreeColor(colors.raised);
  const faintColor = toThreeColor(colors.contentFaint);
  const accentColor = toThreeColor(colors.accent);

  // Ground platform
  const platformGeo = new BoxGeometry(5, 0.3, 3);
  const platformMat = new MeshStandardMaterial({ color: surfaceColor, roughness: 0.85 });
  const platform = new Mesh(platformGeo, platformMat);
  platform.position.set(0, 0, 0);
  root.add(platform);

  // Left gap - raised ledge the character starts on
  const walkY = walkSurfaceCenterY();
  const leftLedgeGeo = new BoxGeometry(1.2, BRIDGE_HEIGHT, BRIDGE_DEPTH);
  const leftLedgeMat = new MeshStandardMaterial({ color: raisedColor, roughness: 0.8 });
  const leftLedge = new Mesh(leftLedgeGeo, leftLedgeMat);
  leftLedge.position.set(-2.35, walkY, 0);
  root.add(leftLedge);

  // Gate blocking the gap until the flag unlocks the bridge
  const lockedWallGeo = new BoxGeometry(0.2, 0.75, BRIDGE_DEPTH);
  const lockedWallMaterial = new MeshStandardMaterial({
    color: faintColor,
    roughness: 0.9,
    transparent: true,
    opacity: 0.75,
  });
  const lockedWall = new Mesh(lockedWallGeo, lockedWallMaterial);
  lockedWall.position.set(BRIDGE_LEFT + 0.05, WALK_SURFACE_TOP + 0.375 - BRIDGE_HEIGHT / 2, 0);
  root.add(lockedWall);

  // Bridge - spans from the gate to the tower landing
  const bridgeGeo = new BoxGeometry(BRIDGE_LENGTH, BRIDGE_HEIGHT, BRIDGE_DEPTH);
  const bridgeMaterial = new MeshStandardMaterial({
    color: raisedColor,
    emissive: accentColor,
    emissiveIntensity: 0,
    roughness: 0.55,
    metalness: 0.05,
  });
  const bridge = new Mesh(bridgeGeo, bridgeMaterial);
  bridge.position.set(bridgeCenterX(0.001), walkY, 0);
  bridge.scale.set(0.001, 1, 1);
  root.add(bridge);

  // Right landing pad where the bridge meets the tower
  const landingGeo = new BoxGeometry(0.9, BRIDGE_HEIGHT, BRIDGE_DEPTH);
  const landing = new Mesh(landingGeo, leftLedgeMat);
  landing.position.set(1.55, walkY, -0.05);
  root.add(landing);

  // Tower / beacon - base sits on the right landing
  const towerGeo = new BoxGeometry(0.55, 1.1, 0.55);
  const towerMaterial = new MeshStandardMaterial({
    color: raisedColor,
    roughness: 0.7,
  });
  const tower = new Mesh(towerGeo, towerMaterial);
  tower.position.set(1.65, WALK_SURFACE_TOP + 0.55, -0.05);
  root.add(tower);

  const towerCapGeo = new BoxGeometry(0.7, 0.18, 0.7);
  const towerCap = new Mesh(towerCapGeo, towerMaterial);
  towerCap.position.set(1.65, WALK_SURFACE_TOP + 1.19, -0.05);
  root.add(towerCap);

  const towerGlowGeo = new BoxGeometry(0.85, 0.3, 0.85);
  const towerGlowMaterial = new MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 0,
    transparent: true,
    opacity: 0,
  });
  const towerGlow = new Mesh(towerGlowGeo, towerGlowMaterial);
  towerGlow.position.set(1.65, WALK_SURFACE_TOP + 1.38, -0.05);
  root.add(towerGlow);

  // Character (smooth sphere blob)
  const characterGeo = new SphereGeometry(CHARACTER_RADIUS, 16, 16);
  const characterMat = new MeshStandardMaterial({
    color: toThreeColor(colors.accentText),
    roughness: 0.5,
  });
  const character = new Mesh(characterGeo, characterMat);
  character.position.set(CHARACTER_START_X, CHARACTER_Y, 0);
  root.add(character);

  const { points, material: particleMaterial } = createParticles(colors);
  root.add(points);

  const {
    group: toggle,
    trackMaterial: toggleTrackMaterial,
    thumb: toggleThumb,
  } = createToggle(colors);
  root.add(toggle);

  return {
    root,
    bridge,
    bridgeMaterial,
    toggle,
    toggleTrackMaterial,
    toggleThumb,
    tower,
    towerMaterial,
    towerGlow,
    towerGlowMaterial,
    character,
    lockedWall,
    lockedWallMaterial,
    platform,
    platformMaterial: platformMat,
    walkSurfaceMaterial: leftLedgeMat,
    particles: points,
    particleMaterial,
  };
}

export function applyThemeToWorld(world: WorldMeshes, colors: ThemeColors, isDark = false): void {
  const surfaceColor = toThreeColor(colors.surface);
  const raisedColor = toThreeColor(colors.raised);
  const raisedHoverColor = toThreeColor(colors.raisedHover);
  const faintColor = toThreeColor(colors.contentFaint);
  const accentColor = toThreeColor(colors.accent);
  const structureGlow = isDark ? 0.2 : 0;

  world.toggleTrackMaterial.color.copy(raisedHoverColor);
  world.toggleTrackMaterial.emissive.copy(accentColor);
  world.towerMaterial.color.copy(raisedColor);
  world.towerMaterial.emissive.copy(raisedColor);
  world.towerMaterial.emissiveIntensity = structureGlow;
  world.lockedWallMaterial.color.copy(faintColor);
  world.towerGlowMaterial.color.copy(accentColor);
  world.towerGlowMaterial.emissive.copy(accentColor);
  world.particleMaterial.color.copy(accentColor);
  world.platformMaterial.color.copy(surfaceColor);
  world.platformMaterial.emissive.copy(surfaceColor);
  world.platformMaterial.emissiveIntensity = structureGlow;
  world.walkSurfaceMaterial.color.copy(raisedColor);
  world.walkSurfaceMaterial.emissive.copy(raisedColor);
  world.walkSurfaceMaterial.emissiveIntensity = structureGlow;
  (world.character.material as MeshStandardMaterial).color.copy(toThreeColor(colors.accentText));
  (world.bridge.material as MeshStandardMaterial).emissive.copy(accentColor);
}
