import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, UserConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const node = (): Plugin => {
  return {
    name: "vite-plugin-node",
    config(_userConfig: UserConfig) {
      return {
        build: {
          outDir: "dist/client",
        },
        environments: {
          node: {
            consumer: "server",
            build: {
              outDir: "dist/node-server",
              rollupOptions: {
                input: {
                  index: resolve(__dirname, "../../server.entry.node.ts"),
                },
                external: [/^node:/],
              },
              emitAssets: false,
            },
          },
        },
        builder: {
          buildApp: async (builder) => {
            const clientEnv = builder.environments.client;
            if (clientEnv) await builder.build(clientEnv);

            const nodeEnv = builder.environments.node;
            if (nodeEnv && !nodeEnv.isBuilt) {
              await builder.build(nodeEnv);
            }
          },
        },
      };
    },
  };
};
