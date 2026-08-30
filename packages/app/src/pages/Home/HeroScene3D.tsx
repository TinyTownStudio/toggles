import { useEffect, useRef } from "preact/hooks";
import { useModel } from "@preact/signals";
import { ThemeModel } from "../../models/theme";
import type { SceneContext } from "./heroScene/types";

type SceneModule = typeof import("./heroScene/createScene");

export function HeroScene3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneContext | null>(null);
  const sceneModuleRef = useRef<SceneModule | null>(null);
  const theme = useModel(ThemeModel);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    void (async () => {
      const mod = await import("./heroScene/createScene");
      if (disposed || !containerRef.current) return;
      sceneModuleRef.current = mod;
      sceneRef.current = mod.createHeroScene(containerRef.current);
    })();

    return () => {
      disposed = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
      sceneModuleRef.current = null;
    };
  }, []);

  useEffect(() => {
    const ctx = sceneRef.current;
    const mod = sceneModuleRef.current;
    if (ctx && mod) mod.updateSceneTheme(ctx);
  }, [theme.isDark.value]);

  return <div ref={containerRef} class="absolute inset-0 overflow-hidden" aria-hidden="true" />;
}
