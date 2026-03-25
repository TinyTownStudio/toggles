import { Home } from "./web/pages/Home.tsx";
import { Hono } from "hono";

const app = new Hono();

app.get("/",c=>{
  return c.html(<Home />)
})

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

export { app };
