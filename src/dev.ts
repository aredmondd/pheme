/**
 * Styling dev loop — no API calls.
 *
 *   npm run dev
 *
 * - renders out/ from the newest data/days/*.json (`build.tsx --cached`), re-rendering on src/ or public/ changes
 * - runs Tailwind in watch mode
 * - serves out/ at http://localhost:3000 and reloads the browser when anything in out/ changes
 *
 * Need fresh data? Run `npm run build` once (hits the APIs, refreshes the cache), then keep using this.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { watch } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer, type ServerResponse } from "node:http";
import { extname, join, normalize } from "node:path";
import { OUT_DIR } from "./config.ts";

const PORT = Number(process.env.PORT ?? 3000);
const bin = (name: string) => join("node_modules", ".bin", name);

// --- HTML rebuilds (debounced, never overlapping) ---
let building: ChildProcess | null = null;
let queued = false;
function rebuild() {
  if (building) return void (queued = true);
  building = spawn(bin("tsx"), ["src/build.tsx", "--cached"], { stdio: "inherit" });
  building.on("exit", () => {
    building = null;
    if (queued) (queued = false), rebuild();
  });
}
let timer: NodeJS.Timeout | undefined;
watch("src", { recursive: true }, (_e, file) => {
  if (!file || file.endsWith("styles.css") || file === "dev.ts") return; // Tailwind handles CSS
  clearTimeout(timer);
  timer = setTimeout(rebuild, 100);
});
watch("public", { recursive: true }, () => {
  clearTimeout(timer);
  timer = setTimeout(rebuild, 100);
});
rebuild();

// --- Tailwind ---
const tailwind = spawn(bin("tailwindcss"), ["-i", "src/styles.css", "-o", join(OUT_DIR, "styles.css"), "--watch"], {
  stdio: "inherit",
});

// --- Static server + live reload (Server-Sent Events) ---
const clients = new Set<ServerResponse>();
let reloadTimer: NodeJS.Timeout | undefined;
watch(OUT_DIR, { recursive: true }, () => {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => clients.forEach((c) => c.write("data: reload\n\n")), 150);
});

const RELOAD_SNIPPET = `<script>new EventSource("/__reload").onmessage=()=>location.reload()</script>`;
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  if (url.pathname === "/__reload") {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }
  let path = join(OUT_DIR, normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, ""));
  try {
    if ((await stat(path)).isDirectory()) path = join(path, "index.html");
    let body: Buffer | string = await readFile(path);
    const type = TYPES[extname(path)] ?? "application/octet-stream";
    if (type.startsWith("text/html")) body = body.toString().replace("</body>", `${RELOAD_SNIPPET}</body>`);
    res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(PORT, () => console.log(`\n  Dev server: http://localhost:${PORT}  (cached data, live reload)\n`));

process.on("SIGINT", () => {
  tailwind.kill();
  building?.kill();
  process.exit(0);
});
