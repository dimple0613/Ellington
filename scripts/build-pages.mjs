import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const outDir = resolve(root, ".vercel/output/static");

mkdirSync(outDir, { recursive: true });
rmSync(resolve(outDir, "_worker.js"), { force: true });

await build({
  entryPoints: [resolve(root, ".open-next/worker.js")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: resolve(outDir, "_worker.js"),
  external: ["cloudflare:*"],
  logLevel: "error",
});

cpSync(resolve(root, ".open-next/assets"), outDir, { recursive: true });

console.log("Pages build output ready in .vercel/output/static");