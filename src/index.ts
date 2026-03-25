import { app } from "./app.ts";
import { openDb } from "./db.ts";

openDb("test.db")

Deno.serve({ port: 8000 }, app.fetch);