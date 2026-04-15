import "dotenv/config";

import app from "./api/index";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import path, { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use("/*", serveStatic({ root: join(__dirname, "../client") }));
app.get("*", serveStatic({ path: join(__dirname, "../client/index.html") }));

serve(app, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});
