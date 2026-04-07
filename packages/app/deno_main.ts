import app from "./api/index";
import { serveStatic } from "hono/deno";

app.use("/*", serveStatic({ root: "./dist/client" }));
app.get("*", serveStatic({ path: "./dist/client/index.html" }));

const port = Deno.env.get("PORT") || "3000";

Deno.serve({ port: parseInt(port, 10) }, (req: Request) => {
  return app.fetch(req);
});
