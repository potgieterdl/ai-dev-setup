import fs from "node:fs/promises";
import path from "node:path";
import type { PackageManager, PackageManagerName } from "./types.js";

/** Pre-defined command maps for each supported package manager. */
export const PACKAGE_MANAGERS: Record<PackageManagerName, PackageManager> = {
  npm: {
    name: "npm",
    install: "npm ci",
    installGlobal: "npm install -g",
    run: "npm run",
    exec: "npx",
    lockFile: "package-lock.json",
    runIfPresent: "npm run --if-present",
    test: "npm test",
  },
  pnpm: {
    name: "pnpm",
    install: "pnpm install --frozen-lockfile",
    installGlobal: "pnpm add -g",
    run: "pnpm",
    exec: "pnpm dlx",
    lockFile: "pnpm-lock.yaml",
    runIfPresent: "pnpm run --if-present",
    test: "pnpm test",
  },
  yarn: {
    name: "yarn",
    install: "yarn install --immutable",
    installGlobal: "yarn global add",
    run: "yarn",
    exec: "yarn dlx",
    lockFile: "yarn.lock",
    runIfPresent: "yarn run --if-present",
    test: "yarn test",
  },
  bun: {
    name: "bun",
    install: "bun install --frozen-lockfile",
    installGlobal: "bun add -g",
    run: "bun run",
    exec: "bunx",
    lockFile: "bun.lock",
    runIfPresent: "bun run --if-present",
    test: "bun test",
  },
};

/** Lock file → package manager name mapping. */
const LOCK_FILE_MAP: Record<string, PackageManagerName> = {
  "package-lock.json": "npm",
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
  "bun.lock": "bun",
  "bun.lockb": "bun",
};

/**
 * Detect the project's package manager using (in priority order):
 *   1. Lock file presence in projectRoot
 *   2. `packageManager` field in package.json
 *   3. Falls back to npm
 */
export async function detectPackageManager(projectRoot: string): Promise<PackageManager> {
  // Priority 1: lock file presence
  for (const [lockFile, pmName] of Object.entries(LOCK_FILE_MAP)) {
    try {
      await fs.access(path.join(projectRoot, lockFile));
      return PACKAGE_MANAGERS[pmName];
    } catch {
      // lock file not found — try next
    }
  }

  // Priority 2: packageManager field in package.json
  try {
    const raw = await fs.readFile(path.join(projectRoot, "package.json"), "utf8");
    const pkgJson = JSON.parse(raw) as { packageManager?: string };
    if (pkgJson.packageManager) {
      const pmName = pkgJson.packageManager.split("@")[0] as PackageManagerName;
      if (PACKAGE_MANAGERS[pmName]) {
        return PACKAGE_MANAGERS[pmName];
      }
    }
  } catch {
    // no package.json or parse error
  }

  // Fallback: npm
  return PACKAGE_MANAGERS.npm;
}

/** Validate that a string is a valid PackageManagerName. */
export function isValidPmName(name: string): name is PackageManagerName {
  return name in PACKAGE_MANAGERS;
}
