import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Serves the server helpers in api/*.ts at /api/* during `npm run dev`, so a local run needs no Vercel CLI.
// Each helper exports Web-standard handlers (POST/GET) that take a Request and return a Response, as on Vercel.
function devApi(): Plugin {
  return {
    name: "loci-dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const match = (req.url ?? "").match(/^\/api\/([a-z-]+)(?:\?.*)?$/);
        if (!match) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${match[1]}.ts`);
          const handler = mod[req.method ?? "GET"];
          if (typeof handler !== "function") {
            res.statusCode = 405;
            res.end();
            return;
          }
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const request = new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers: { "Content-Type": req.headers["content-type"] ?? "application/json" },
            body: req.method === "GET" || req.method === "HEAD" ? undefined : Buffer.concat(chunks),
          });
          const response: Response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Make .env.local keys visible to the helpers in dev, exactly like Vercel environment variables.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    plugins: [react(), devApi()],
    server: { port: 5174, strictPort: true },
    preview: { port: 4174, strictPort: true },
  };
});
