import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { detectPackageManager, PACKAGE_MANAGERS, isValidPmName } from "../../src/pm.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pm-test-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("PACKAGE_MANAGERS", () => {
  it("smoke: all 4 package managers are defined", () => {
    expect(Object.keys(PACKAGE_MANAGERS)).toEqual(["npm", "pnpm", "yarn", "bun"]);
  });

  it("smoke: each PM has all required fields", () => {
    for (const pm of Object.values(PACKAGE_MANAGERS)) {
      expect(pm.name).toBeTruthy();
      expect(pm.install).toBeTruthy();
      expect(pm.installGlobal).toBeTruthy();
      expect(pm.run).toBeTruthy();
      expect(pm.exec).toBeTruthy();
      expect(pm.lockFile).toBeTruthy();
      expect(pm.runIfPresent).toBeTruthy();
      expect(pm.test).toBeTruthy();
    }
  });
});

describe("isValidPmName", () => {
  it("returns true for valid PM names", () => {
    expect(isValidPmName("npm")).toBe(true);
    expect(isValidPmName("pnpm")).toBe(true);
    expect(isValidPmName("yarn")).toBe(true);
    expect(isValidPmName("bun")).toBe(true);
  });

  it("returns false for invalid names", () => {
    expect(isValidPmName("invalid")).toBe(false);
    expect(isValidPmName("")).toBe(false);
    expect(isValidPmName("deno")).toBe(false);
  });
});

describe("detectPackageManager", () => {
  describe("lock file detection", () => {
    it("demo: detects npm from package-lock.json", async () => {
      await fs.writeFile(path.join(tmpDir, "package-lock.json"), "{}");
      const pm = await detectPackageManager(tmpDir);
      expect(pm.name).toBe("npm");
    });

    it("demo: detects pnpm from pnpm-lock.yaml", async () => {
      await fs.writeFile(path.join(tmpDir, "pnpm-lock.yaml"), "lockfileVersion: 9");
      const pm = await detectPackageManager(tmpDir);
      expect(pm.name).toBe("pnpm");
    });

    it("demo: detects yarn from yarn.lock", async () => {
      await fs.writeFile(path.join(tmpDir, "yarn.lock"), "# yarn");
      const pm = await detectPackageManager(tmpDir);
      expect(pm.name).toBe("yarn");
    });

    it("demo: detects bun from bun.lock", async () => {
      await fs.writeFile(path.join(tmpDir, "bun.lock"), "{}");
      const pm = await detectPackageManager(tmpDir);
      expect(pm.name).toBe("bun");
    });

    it("demo: detects bun from bun.lockb", async () => {
      await fs.writeFile(path.join(tmpDir, "bun.lockb"), Buffer.alloc(0));
      const pm = await detectPackageManager(tmpDir);
      expect(pm.name).toBe("bun");
    });
  });

  describe("packageManager field detection", () => {
    it("demo: detects pnpm from packageManager field in package.json", async () => {
      await fs.writeFile(
        path.join(tmpDir, "package.json"),
        JSON.stringify({ packageManager: "pnpm@9.15.0" })
      );
      const pm = await detectPackageManager(tmpDir);
      expect(pm.name).toBe("pnpm");
    });

    it("demo: detects yarn from packageManager field in package.json", async () => {
      await fs.writeFile(
        path.join(tmpDir, "package.json"),
        JSON.stringify({ packageManager: "yarn@4.0.0" })
      );
      const pm = await detectPackageManager(tmpDir);
      expect(pm.name).toBe("yarn");
    });
  });

  describe("priority order", () => {
    it("demo: lock file takes priority over packageManager field", async () => {
      await fs.writeFile(path.join(tmpDir, "package-lock.json"), "{}");
      await fs.writeFile(
        path.join(tmpDir, "package.json"),
        JSON.stringify({ packageManager: "pnpm@9.15.0" })
      );
      const pm = await detectPackageManager(tmpDir);
      expect(pm.name).toBe("npm");
    });
  });

  describe("fallback", () => {
    it("demo: falls back to npm when no lock file or packageManager field", async () => {
      const pm = await detectPackageManager(tmpDir);
      expect(pm.name).toBe("npm");
    });

    it("demo: falls back to npm with empty package.json", async () => {
      await fs.writeFile(path.join(tmpDir, "package.json"), "{}");
      const pm = await detectPackageManager(tmpDir);
      expect(pm.name).toBe("npm");
    });
  });
});
