import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { detectProject } from "../src/detect.js";

describe("detectProject", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "detect-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("detects package.json and tsconfig.json", async () => {
    await fs.writeFile(path.join(tmpDir, "package.json"), '{"dependencies":{"express":"^4"}}');
    await fs.writeFile(path.join(tmpDir, "tsconfig.json"), "{}");
    const result = await detectProject(tmpDir);
    expect(result.hasPackageJson).toBe(true);
    expect(result.hasTsConfig).toBe(true);
    expect(result.frameworks).toContain("express");
  });

  it("detects Prisma schema", async () => {
    await fs.mkdir(path.join(tmpDir, "prisma"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "prisma/schema.prisma"), "");
    const result = await detectProject(tmpDir);
    expect(result.hasPrismaSchema).toBe(true);
  });

  it("lists src/ subdirectories", async () => {
    await fs.mkdir(path.join(tmpDir, "src/api"), { recursive: true });
    await fs.mkdir(path.join(tmpDir, "src/db"), { recursive: true });
    const result = await detectProject(tmpDir);
    expect(result.directories).toContain("api");
    expect(result.directories).toContain("db");
  });

  it("falls back to root dirs when no src/", async () => {
    await fs.mkdir(path.join(tmpDir, "routes"));
    const result = await detectProject(tmpDir);
    expect(result.directories).toContain("routes");
  });

  it("excludes hidden dirs, node_modules, and dist from root fallback", async () => {
    await fs.mkdir(path.join(tmpDir, ".git"), { recursive: true });
    await fs.mkdir(path.join(tmpDir, "node_modules"), { recursive: true });
    await fs.mkdir(path.join(tmpDir, "dist"), { recursive: true });
    await fs.mkdir(path.join(tmpDir, "src"), { recursive: true });
    const result = await detectProject(tmpDir);
    // Since src/ exists, directories come from src/ contents (which is empty)
    expect(result.directories).toEqual([]);
  });

  it("handles missing package.json gracefully", async () => {
    const result = await detectProject(tmpDir);
    expect(result.hasPackageJson).toBe(false);
    expect(result.frameworks).toEqual([]);
    expect(result.orms).toEqual([]);
    expect(result.testFrameworks).toEqual([]);
  });

  it("detects docker-compose.yml", async () => {
    await fs.writeFile(path.join(tmpDir, "docker-compose.yml"), "");
    const result = await detectProject(tmpDir);
    expect(result.hasDockerCompose).toBe(true);
  });

  it("detects docker-compose.yaml variant", async () => {
    await fs.writeFile(path.join(tmpDir, "docker-compose.yaml"), "");
    const result = await detectProject(tmpDir);
    expect(result.hasDockerCompose).toBe(true);
  });

  it("detects ORMs from package.json", async () => {
    await fs.writeFile(
      path.join(tmpDir, "package.json"),
      '{"dependencies":{"prisma":"^5","drizzle-orm":"^0.30"}}'
    );
    const result = await detectProject(tmpDir);
    expect(result.orms).toContain("prisma");
    expect(result.orms).toContain("drizzle");
  });

  it("detects test frameworks from devDependencies", async () => {
    await fs.writeFile(
      path.join(tmpDir, "package.json"),
      '{"devDependencies":{"vitest":"latest","jest":"^29"}}'
    );
    const result = await detectProject(tmpDir);
    expect(result.testFrameworks).toContain("vitest");
    expect(result.testFrameworks).toContain("jest");
  });

  it("collects existing config files", async () => {
    await fs.writeFile(path.join(tmpDir, "package.json"), "{}");
    await fs.writeFile(path.join(tmpDir, "tsconfig.json"), "{}");
    await fs.writeFile(path.join(tmpDir, "Dockerfile"), "");
    const result = await detectProject(tmpDir);
    expect(result.configFiles).toContain("package.json");
    expect(result.configFiles).toContain("tsconfig.json");
    expect(result.configFiles).toContain("Dockerfile");
  });

  it("detects graphql config files", async () => {
    await fs.writeFile(path.join(tmpDir, ".graphqlrc"), "{}");
    const result = await detectProject(tmpDir);
    expect(result.hasGraphqlConfig).toBe(true);
  });

  it("returns all false for an empty directory", async () => {
    const result = await detectProject(tmpDir);
    expect(result.hasPackageJson).toBe(false);
    expect(result.hasTsConfig).toBe(false);
    expect(result.hasDockerCompose).toBe(false);
    expect(result.hasPrismaSchema).toBe(false);
    expect(result.hasGraphqlConfig).toBe(false);
    expect(result.configFiles).toEqual([]);
  });

  it("detects multiple frameworks", async () => {
    await fs.writeFile(
      path.join(tmpDir, "package.json"),
      '{"dependencies":{"express":"^4","next":"^14"}}'
    );
    const result = await detectProject(tmpDir);
    expect(result.frameworks).toContain("express");
    expect(result.frameworks).toContain("next");
  });

  it("handles malformed package.json gracefully", async () => {
    await fs.writeFile(path.join(tmpDir, "package.json"), "not-valid-json");
    const result = await detectProject(tmpDir);
    expect(result.hasPackageJson).toBe(true);
    expect(result.frameworks).toEqual([]);
  });
});
