// Tiny local preview server: node serve.mjs  →  http://localhost:5178/digilax/
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
const root = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".json": "application/json", ".txt": "text/plain", ".xml": "application/xml" };
createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (!p.startsWith("/digilax")) { res.writeHead(302, { Location: "/digilax/" }); return res.end(); }
  p = normalize(p.slice(8) || "/").replace(/^[\\/]+/, "");
  let f = join(root, p);
  try { if ((await stat(f)).isDirectory()) f = join(f, "index.html"); res.writeHead(200, { "Content-Type": types[extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); res.end(await readFile(f)); }
  catch { res.writeHead(404, { "Content-Type": "text/html" }); res.end(await readFile(join(root, "404.html")).catch(() => "Not found")); }
}).listen(5178, () => console.log("http://localhost:5178/digilax/"));
