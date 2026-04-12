import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, UserConfig, ViteDevServer } from "vite";

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

    configureServer(server: ViteDevServer) {
      const apiEntryPath = resolve(server.config.root, "api/index.ts");

      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "/";
        if (!url.startsWith("/api/") && url !== "/ping") {
          return next();
        }
        try {
          const mod = await server.ssrLoadModule(apiEntryPath);
          const fastifyInstance = await mod.devServer();
          fastifyInstance.routing(req, res);
        } catch (err) {
          next(err);
        }
      });
    },
  };
};
