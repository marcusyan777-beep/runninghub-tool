import { copyFileSync, existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const distDir = join(root, "pwa-dist");
const repoUrl = process.env.PAGES_REPO || "https://github.com/marcusyan777-beep/runninghub-tool.git";
const branch = process.env.PAGES_BRANCH || "main";
const gitUser = process.env.GIT_AUTHOR_NAME || "marcusyan777-beep";
const gitEmail = process.env.GIT_AUTHOR_EMAIL || "marcusyan777-beep@users.noreply.github.com";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false, ...options });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

if (!existsSync(distDir)) {
  throw new Error("pwa-dist 不存在，请先运行 npm run build:pwa");
}

const tmp = mkdtempSync(join(tmpdir(), "runninghub-tool-deploy-"));
run("git", ["clone", repoUrl, tmp]);

for (const name of readdirSync(distDir)) {
  copyFileSync(join(distDir, name), join(tmp, name));
}

run("git", ["config", "user.name", gitUser], { cwd: tmp });
run("git", ["config", "user.email", gitEmail], { cwd: tmp });
run("git", ["add", "."], { cwd: tmp });

const status = spawnSync("git", ["status", "--porcelain"], {
  cwd: tmp,
  encoding: "utf8",
  shell: false,
});

if (!status.stdout.trim()) {
  console.log("No deploy changes.");
  process.exit(0);
}

run("git", ["commit", "-m", process.env.DEPLOY_MESSAGE || "Deploy GitHub Pages"], { cwd: tmp });
run("git", ["push", "origin", `HEAD:${branch}`], { cwd: tmp });
console.log(`Deployed ${distDir} to ${repoUrl}#${branch}`);
