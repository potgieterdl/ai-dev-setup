import fs from "node:fs/promises";
import path from "node:path";
import type { DetectionResult } from "./types.js";

const KNOWN_FRAMEWORKS = [
  "express",
  "fastify",
  "next",
  "nuxt",
  "remix",
  "nestjs",
  "hono",
  "fastapi",
  "flask",
  "django",
];

const KNOWN_ORMS = ["prisma", "drizzle", "typeorm", "sequelize", "mongoose", "sqlalchemy"];

const KNOWN_TEST_FRAMEWORKS = ["vitest", "jest", "mocha", "pytest", "unittest"];

const CONFIG_FILES = [
  "package.json",
  "tsconfig.json",
  ".eslintrc.js",
  ".prettierrc",
  "vite.config.ts",
  "vitest.config.ts",
  "docker-compose.yml",
  "Dockerfile",
  "prisma/schema.prisma",
  "pyproject.toml",
  "requirements.txt",
];

/**
 * Check if a file exists at the given path.
 */
async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Deterministic filesystem detection — scans project structure for architecture signals.
 *
 * No LLM calls. Pure filesystem/JSON reads. Runs in ~50ms even for large projects.
 * Uses Promise.all for parallel filesystem checks. Gracefully handles missing directories.
 *
 * Implements F20 Part C Step 1 from the PRD.
 */
export async function detectProject(projectRoot: string): Promise<DetectionResult> {
  const check = (file: string) => exists(path.join(projectRoot, file));

  const [hasPackageJson, hasTsConfig, hasDockerComposeYml, hasDockerComposeYaml] =
    await Promise.all([
      check("package.json"),
      check("tsconfig.json"),
      check("docker-compose.yml"),
      check("docker-compose.yaml"),
    ]);

  const [hasPrismaSchema, hasGraphqlConfigTs, hasGraphqlConfigJs, hasGraphqlRc] = await Promise.all(
    [
      check("prisma/schema.prisma"),
      check("graphql.config.ts"),
      check("graphql.config.js"),
      check(".graphqlrc"),
    ]
  );

  const hasDockerCompose = hasDockerComposeYml || hasDockerComposeYaml;
  const hasGraphqlConfig = hasGraphqlConfigTs || hasGraphqlConfigJs || hasGraphqlRc;

  // Scan top-level src/ directories (or project root dirs if no src/)
  let directories: string[] = [];
  const srcPath = path.join(projectRoot, "src");
  try {
    const entries = await fs.readdir(srcPath, { withFileTypes: true });
    directories = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    // No src/ — try project root top-level dirs
    try {
      const entries = await fs.readdir(projectRoot, { withFileTypes: true });
      directories = entries
        .filter(
          (e) =>
            e.isDirectory() &&
            !e.name.startsWith(".") &&
            e.name !== "node_modules" &&
            e.name !== "dist"
        )
        .map((e) => e.name);
    } catch {
      // Empty or inaccessible — leave empty
    }
  }

  // Collect config files that exist
  const configFiles = (
    await Promise.all(CONFIG_FILES.map(async (f) => ((await check(f)) ? f : null)))
  ).filter(Boolean) as string[];

  // Parse package.json for framework/orm/test deps
  let frameworks: string[] = [];
  let orms: string[] = [];
  let testFrameworks: string[] = [];

  if (hasPackageJson) {
    try {
      const pkgRaw = await fs.readFile(path.join(projectRoot, "package.json"), "utf8");
      const pkg = JSON.parse(pkgRaw) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const allDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });

      frameworks = KNOWN_FRAMEWORKS.filter((f) => allDeps.some((d) => d === f || d.includes(f)));
      orms = KNOWN_ORMS.filter((f) => allDeps.some((d) => d === f || d.includes(f)));
      testFrameworks = KNOWN_TEST_FRAMEWORKS.filter((f) =>
        allDeps.some((d) => d === f || d.includes(f))
      );
    } catch {
      /* ignore parse errors */
    }
  }

  return {
    hasPackageJson,
    hasTsConfig,
    hasDockerCompose,
    hasPrismaSchema,
    hasGraphqlConfig,
    directories,
    configFiles,
    frameworks,
    orms,
    testFrameworks,
  };
}
