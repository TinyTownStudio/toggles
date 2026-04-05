import { serve } from "@hono/node-server";
import app from "../api/index";
import process from "node:process";

const server = serve(app);

process.on("SIGINT", () => {
  server.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.close((err: Error) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
});
