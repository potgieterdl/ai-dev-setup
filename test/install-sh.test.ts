import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const INSTALL_SH = path.resolve(__dirname, "../install.sh");

describe("install.sh", () => {
  const content = fs.readFileSync(INSTALL_SH, "utf8");

  it("exists and is not empty", () => {
    expect(content.length).toBeGreaterThan(0);
  });

  it("is executable", () => {
    const stat = fs.statSync(INSTALL_SH);
    // Check owner execute bit (0o100)
    expect(stat.mode & 0o111).toBeGreaterThan(0);
  });

  it("starts with a bash shebang", () => {
    expect(content.startsWith("#!/usr/bin/env bash")).toBe(true);
  });

  it("uses strict mode (set -euo pipefail)", () => {
    expect(content).toContain("set -euo pipefail");
  });

  it("defines AI_HELPER_HOME with a default", () => {
    expect(content).toMatch(/AI_HELPER_HOME=.*\$HOME\/\.ai-dev-setup/);
  });

  it("defines REPO_URL pointing to the GitHub repository", () => {
    expect(content).toContain("https://github.com/potgieterdl/ai-dev-setup.git");
  });

  it("checks for Node.js >= 20", () => {
    expect(content).toContain("NODE_MIN_VERSION=20");
    expect(content).toContain("ensure_node");
  });

  it("installs fnm as Node.js version manager when Node is missing", () => {
    expect(content).toContain("fnm.vercel.app/install");
    expect(content).toContain("fnm install");
    expect(content).toContain("fnm use");
    expect(content).toContain("fnm default");
  });

  it("clones or pulls the repository", () => {
    expect(content).toContain("git clone");
    expect(content).toContain("git -C");
    expect(content).toContain("pull --ff-only");
  });

  it("runs npm ci for dependency installation", () => {
    expect(content).toContain("npm ci");
  });

  it("runs npm run build after installing dependencies", () => {
    expect(content).toContain("npm run build");
  });

  it("creates a wrapper script in ~/.local/bin", () => {
    expect(content).toContain("BIN_DIR");
    expect(content).toContain(".local/bin");
    expect(content).toContain("ai-init");
    expect(content).toContain("chmod +x");
  });

  it("advises user to add BIN_DIR to PATH if not already present", () => {
    expect(content).toContain("export PATH=");
    expect(content).toContain(".bashrc");
    expect(content).toContain(".zshrc");
  });

  it("prints installation complete message", () => {
    expect(content).toContain("Installation complete!");
    expect(content).toContain("ai-init");
  });

  it("passes bash syntax check", () => {
    // bash -n checks syntax without executing
    const result = execSync(`bash -n "${INSTALL_SH}" 2>&1`, {
      encoding: "utf8",
    });
    expect(result).toBe("");
  });

  it("uses fnm --skip-shell to avoid modifying shell config during piped install", () => {
    expect(content).toContain("--skip-shell");
  });

  it("handles git pull failure gracefully", () => {
    // The script should not abort if pull fails (e.g., local changes)
    expect(content).toMatch(/pull --ff-only.*\|\|/s);
  });

  it("falls back to npm install if npm ci fails", () => {
    expect(content).toContain("npm ci");
    expect(content).toContain("npm install");
  });

  it("wraps ai-init in a bash wrapper instead of direct symlink", () => {
    // A wrapper script is more robust than a direct symlink to a .js file
    expect(content).toContain("exec node");
    expect(content).toContain("dist/cli.js");
  });
});
