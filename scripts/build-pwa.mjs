import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const publicDir = join(root, "public");
const distDir = join(root, "pwa-dist");

if (!existsSync(publicDir)) {
  throw new Error("public 目录不存在");
}

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

for (const name of readdirSync(publicDir)) {
  copyFileSync(join(publicDir, name), join(distDir, name));
}

writeFileSync(join(distDir, ".nojekyll"), "");
console.log(`PWA files written to ${distDir}`);
