import { Color } from "three";
import type { ThemeColors } from "./types";

const TOKEN_KEYS: (keyof ThemeColors)[] = [
  "page",
  "surface",
  "raised",
  "raisedHover",
  "accent",
  "accentText",
  "contentFaint",
];

const TOKEN_CSS: Record<keyof ThemeColors, string> = {
  page: "--t-page",
  surface: "--t-surface",
  raised: "--t-raised",
  raisedHover: "--t-raised-hover",
  accent: "--t-accent",
  accentText: "--t-accent-text",
  contentFaint: "--t-content-faint",
};

export function readThemeColors(): ThemeColors {
  const styles = getComputedStyle(document.documentElement);
  const colors = {} as ThemeColors;

  for (const key of TOKEN_KEYS) {
    colors[key] = styles.getPropertyValue(TOKEN_CSS[key]).trim();
  }

  return colors;
}

export function isSceneDark(): boolean {
  return document.documentElement.classList.contains("dark");
}

/** Lift stone tones in dark mode so geometry stays visible against the page bg. */
export function readSceneColors(isDark = isSceneDark()): ThemeColors {
  const colors = readThemeColors();
  if (!isDark) return colors;

  const lift = (hex: string, amount: number): string => {
    const c = new Color(hex);
    c.lerp(new Color("#a8a29e"), amount);
    return `#${c.getHexString()}`;
  };

  return {
    ...colors,
    surface: lift(colors.surface, 0.42),
    raised: lift(colors.raised, 0.48),
    raisedHover: lift(colors.raisedHover, 0.32),
    contentFaint: lift(colors.contentFaint, 0.22),
  };
}

export function toThreeColor(hex: string): Color {
  return new Color(hex);
}
