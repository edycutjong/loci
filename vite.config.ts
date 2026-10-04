import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { defineConfig, loadEnv, type Connect, type Plugin } from "vite";
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

// The story page and the pitch deck are plain HTML in public/<page>/index.html, outside the React app.
// As on Vercel (vercel.json redirects): "/story" redirects to "/story/" so their relative paths resolve, and
// "/story/" serves its index.html. Preview also answers unknown pages with 404.html and a 404, like Vercel does.
const STATIC_PAGES = ["story", "deck"];

function staticPages(): Plugin {
  const pages: Connect.NextHandleFunction = (req, res, next) => {
    const [path, query] = (req.url ?? "").split("?");
    const page = STATIC_PAGES.find((name) => path === `/${name}` || path === `/${name}/`);
    if (!page) return next();
    const search = query === undefined ? "" : `?${query}`;
    if (!path.endsWith("/")) {
      res.writeHead(308, { Location: `/${page}/${search}` });
      res.end();
      return;
    }
    req.url = `/${page}/index.html${search}`;
    next();
  };
  return {
    name: "loci-static-pages",
    configureServer(server) {
      server.middlewares.use(pages);
    },
    configurePreviewServer(server) {
      const dist = resolve(server.config.root, server.config.build.outDir);
      server.middlewares.use(pages);
      server.middlewares.use((req, res, next) => {
        const path = decodeURIComponent((req.url ?? "/").split("?")[0]);
        const page = req.method === "GET" && (req.headers.accept ?? "").includes("text/html");
        if (!page || existsSync(join(dist, path.endsWith("/") ? `${path}index.html` : path))) return next();
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end(readFileSync(join(dist, "404.html")));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Make .env.local keys visible to the helpers in dev, exactly like Vercel environment variables.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    plugins: [react(), staticPages(), devApi()],
    server: { port: 5174, strictPort: true },
    preview: { port: 4174, strictPort: true },
  };
});
