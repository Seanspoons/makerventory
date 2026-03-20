import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const packageLockPath = join(process.cwd(), "package-lock.json");
const nodeModulesPath = join(process.cwd(), "node_modules");
const cacheDir = join(nodeModulesPath, ".makerventory-cache");
const lockHashPath = join(cacheDir, "package-lock.hash");

const packageLockHash = createHash("sha256")
  .update(readFileSync(packageLockPath))
  .digest("hex");

const needsInstall =
  !existsSync(nodeModulesPath) ||
  !existsSync(join(nodeModulesPath, ".bin")) ||
  !existsSync(lockHashPath) ||
  readFileSync(lockHashPath, "utf8") !== packageLockHash;

if (needsInstall) {
  console.log("Installing dependencies inside the container...");
  execSync("npm install", { stdio: "inherit" });
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(lockHashPath, packageLockHash);
} else {
  console.log("Node modules are up to date.");
}
