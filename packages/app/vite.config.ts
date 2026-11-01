import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { node } from "./plugins/node";
import tailwindcss from "@tailwindcss/vite";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

/** Hosted `APP_ORIGIN` from wrangler.jsonc — not used at runtime in self-host builds. */
function readWranglerAppOrigin(): string | undefined {
  try {
    const raw = readFileSync(path.join(appRoot, "wrangler.jsonc"), "utf8");
    const match = raw.match(/"APP_ORIGIN"\s*:\s*"([^"]+)"/);
    const origin = match?.[1]?.trim();
    return origin?.replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

/**
 * Build-time public origin for prerendered meta tags and docs examples.
 * Self-host Docker sets `TOGGLES_SELF_HOST_BUILD=true` so we do not inject the hosted domain.
 */
function resolvePublicAppOrigin(mode: string): string | undefined {
  const explicit = process.env.VITE_PUBLIC_APP_ORIGIN?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  if (process.env.TOGGLES_SELF_HOST_BUILD === "true") {
    return undefined;
  }
  if (mode !== "production") {
    return undefined;
  }
  return readWranglerAppOrigin();
}

function absoluteOgTags(html: string, origin: string): string {
  const base = origin.replace(/\/$/, "");
  return html
    .replace('property="og:url" content="/"', `property="og:url" content="${base}/"`)
    .replaceAll(
      'property="og:image" content="/og.png"',
      `property="og:image" content="${base}/og.png"`,
    )
    .replaceAll(
      'name="twitter:image" content="/og.png"',
      `name="twitter:image" content="${base}/og.png"`,
    );
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const publicAppOrigin = resolvePublicAppOrigin(mode);
  if (publicAppOrigin) {
    process.env.VITE_PUBLIC_APP_ORIGIN = publicAppOrigin;
  }

  return {
    plugins: [
      preact({
        prerender: {
          enabled: true,
          renderTarget: "#app",
          additionalPrerenderRoutes: ["/docs"],
          previewMiddlewareEnabled: true,
        },
      }),
      tailwindcss(),
      cloudflare(),
      node(),
      {
        name: "toggles-absolute-og-tags",
        transformIndexHtml(html) {
          if (!publicAppOrigin) {
            return html;
          }
          return absoluteOgTags(html, publicAppOrigin);
        },
      },
    ],
  };
});
