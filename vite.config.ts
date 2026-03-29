import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { node } from "./plugins/node"
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    preact(),
    tailwindcss(),
    node(),
  ],
});
