import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { node } from "./plugins/node";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
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
  ],
});
