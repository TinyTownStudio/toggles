import type {
  AmbientLight,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  WebGLRenderer,
} from "three";

export interface ThemeColors {
  page: string;
  surface: string;
  raised: string;
  raisedHover: string;
  accent: string;
  accentText: string;
  contentFaint: string;
}

export interface WorldMeshes {
  root: Group;
  bridge: Mesh;
  bridgeMaterial: MeshStandardMaterial;
  lever: Group;
  leverBaseMaterial: MeshStandardMaterial;
  leverHandle: Group;
  tower: Mesh;
  towerMaterial: MeshStandardMaterial;
  towerGlow: Mesh;
  towerGlowMaterial: MeshStandardMaterial;
  character: Mesh;
  lockedWall: Mesh;
  lockedWallMaterial: MeshStandardMaterial;
  platform: Mesh;
  platformMaterial: MeshStandardMaterial;
  walkSurfaceMaterial: MeshStandardMaterial;
  particles: Points;
  particleMaterial: PointsMaterial;
}

export interface SceneContext {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  ambientLight: AmbientLight;
  directionalLight: DirectionalLight;
  fillLight: DirectionalLight;
  world: WorldMeshes;
  container: HTMLElement;
  reducedMotion: boolean;
  isDark: boolean;
  syncLighting: (dark: boolean) => void;
  applySceneTheme: () => void;
  refresh: () => void;
  dispose: () => void;
}

export interface AnimationState {
  leverPull: number;
  bridgeOpacity: number;
  towerGlow: number;
  characterT: number;
  particleBurst: number;
}
