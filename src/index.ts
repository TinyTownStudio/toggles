import { app } from "./app.ts";

Deno.serve({ port: 8000 }, app.fetch);