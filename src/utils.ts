import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { FileDescriptor, SavedConfig } from "./types.js";

const execFileAsync = promisify(execFile);

/**
 * Write all file descriptors to disk. Creates parent directories as needed.
 * Skips writing if the file already exists and overwrite is false.
 * Returns the list of relative paths actually written.
 */
export async function writeFiles(
  files: FileDescriptor[],
  root: string,
  overwrite = true
): Promise<string[]> {
  const written: string[] = [];
  for (const file of files) {
    const fullPath = path.resolve(root, file.path);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    if (!overwrite) {
      try {
        await fs.access(fullPath);
        continue; // skip existing file
      } catch {
        // file doesn't exist, proceed
      }
    }
    await fs.writeFile(fullPath, file.content, "utf8");
    if (file.executable) {
      await fs.chmod(fullPath, 0o755);
    }
    written.push(file.path);
  }
  return written;
}

/**
 * Run a shell command and return stdout. Throws on non-zero exit.
 */
export async function run(cmd: string, args: string[], cwd?: string): Promise<string> {
  const { stdout } = await execFileAsync(cmd, args, { cwd });
  return stdout.trim();
}

/**
 * Check if a command is available on PATH.
 */
export async function commandExists(cmd: string): Promise<boolean> {
  try {
    await execFileAsync("which", [cmd]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Replace {{PLACEHOLDER}} markers in a template string.
 * Unmatched placeholders are left as-is.
 */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => vars[key] ?? match);
}

/**
 * Read a file and return its content, or null if the file doesn't exist.
 */
export async function readOptional(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

/* ──────────────────────────────────────────────────────────
 * Config persistence & backup helpers (F16)
 * ────────────────────────────────────────────────────────── */

const SAVED_CONFIG_FILENAME = ".ai-init.json";

/** Read the persisted config from <projectRoot>/.ai-init.json, or null if absent/invalid. */
export async function readSavedConfig(projectRoot: string): Promise<SavedConfig | null> {
  const filePath = path.join(projectRoot, SAVED_CONFIG_FILENAME);
  const raw = await readOptional(filePath);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedConfig;
  } catch {
    return null;
  }
}

/** Write the persisted config to <projectRoot>/.ai-init.json. */
export async function writeSavedConfig(projectRoot: string, config: SavedConfig): Promise<void> {
  const filePath = path.join(projectRoot, SAVED_CONFIG_FILENAME);
  await fs.writeFile(filePath, JSON.stringify(config, null, 2) + "\n", "utf8");
}

/**
 * Copy a list of relative file paths to .ai-init-backup/<timestamp>/ before destructive changes.
 * Silently skips files that don't exist.
 * Returns the backup directory path.
 */
export async function backupFiles(projectRoot: string, relativePaths: string[]): Promise<string> {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(projectRoot, ".ai-init-backup", ts);
  await fs.mkdir(backupDir, { recursive: true });
  for (const rel of relativePaths) {
    const src = path.join(projectRoot, rel);
    const dst = path.join(backupDir, rel);
    await fs.mkdir(path.dirname(dst), { recursive: true });
    try {
      await fs.copyFile(src, dst);
    } catch {
      /* file may not exist — skip */
    }
  }
  return backupDir;
}
