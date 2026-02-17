import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  writeFiles,
  fillTemplate,
  commandExists,
  readOptional,
} from "../../src/utils.js";
import type { FileDescriptor } from "../../src/types.js";

describe("writeFiles", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "utils-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("creates files in the root directory", async () => {
    const files: FileDescriptor[] = [
      { path: "hello.txt", content: "Hello, world!" },
    ];
    const written = await writeFiles(files, tmpDir);
    expect(written).toEqual(["hello.txt"]);

    const content = await fs.readFile(path.join(tmpDir, "hello.txt"), "utf8");
    expect(content).toBe("Hello, world!");
  });

  it("creates nested directories as needed", async () => {
    const files: FileDescriptor[] = [
      { path: "deep/nested/dir/file.txt", content: "nested content" },
    ];
    const written = await writeFiles(files, tmpDir);
    expect(written).toEqual(["deep/nested/dir/file.txt"]);

    const content = await fs.readFile(
      path.join(tmpDir, "deep/nested/dir/file.txt"),
      "utf8",
    );
    expect(content).toBe("nested content");
  });

  it("writes multiple files in a single call", async () => {
    const files: FileDescriptor[] = [
      { path: "a.txt", content: "aaa" },
      { path: "b.txt", content: "bbb" },
      { path: "sub/c.txt", content: "ccc" },
    ];
    const written = await writeFiles(files, tmpDir);
    expect(written).toHaveLength(3);
    expect(written).toContain("a.txt");
    expect(written).toContain("b.txt");
    expect(written).toContain("sub/c.txt");
  });

  it("overwrites existing files by default", async () => {
    const filePath = path.join(tmpDir, "overwrite.txt");
    await fs.writeFile(filePath, "original", "utf8");

    const files: FileDescriptor[] = [
      { path: "overwrite.txt", content: "updated" },
    ];
    const written = await writeFiles(files, tmpDir);
    expect(written).toEqual(["overwrite.txt"]);

    const content = await fs.readFile(filePath, "utf8");
    expect(content).toBe("updated");
  });

  it("skips existing files when overwrite is false", async () => {
    const filePath = path.join(tmpDir, "keep.txt");
    await fs.writeFile(filePath, "original", "utf8");

    const files: FileDescriptor[] = [
      { path: "keep.txt", content: "should not overwrite" },
    ];
    const written = await writeFiles(files, tmpDir, false);
    expect(written).toEqual([]);

    const content = await fs.readFile(filePath, "utf8");
    expect(content).toBe("original");
  });

  it("writes new files even when overwrite is false", async () => {
    const files: FileDescriptor[] = [
      { path: "new-file.txt", content: "new content" },
    ];
    const written = await writeFiles(files, tmpDir, false);
    expect(written).toEqual(["new-file.txt"]);

    const content = await fs.readFile(
      path.join(tmpDir, "new-file.txt"),
      "utf8",
    );
    expect(content).toBe("new content");
  });

  it("sets executable permission when specified", async () => {
    const files: FileDescriptor[] = [
      { path: "script.sh", content: "#!/bin/bash\necho hi", executable: true },
    ];
    await writeFiles(files, tmpDir);

    const stats = await fs.stat(path.join(tmpDir, "script.sh"));
    // Check that the file has execute permission (owner)
    expect(stats.mode & 0o100).toBeTruthy();
  });

  it("returns an empty array for an empty input", async () => {
    const written = await writeFiles([], tmpDir);
    expect(written).toEqual([]);
  });
});

describe("fillTemplate", () => {
  it("replaces all matching placeholders", () => {
    const template = "Hello {{NAME}}, welcome to {{PROJECT}}!";
    const result = fillTemplate(template, {
      NAME: "Alice",
      PROJECT: "MyApp",
    });
    expect(result).toBe("Hello Alice, welcome to MyApp!");
  });

  it("leaves unmatched placeholders as-is", () => {
    const template = "{{KNOWN}} and {{UNKNOWN}}";
    const result = fillTemplate(template, { KNOWN: "replaced" });
    expect(result).toBe("replaced and {{UNKNOWN}}");
  });

  it("replaces multiple occurrences of the same placeholder", () => {
    const template = "{{X}} + {{X}} = 2{{X}}";
    const result = fillTemplate(template, { X: "a" });
    expect(result).toBe("a + a = 2a");
  });

  it("handles an empty vars object", () => {
    const template = "Nothing to {{REPLACE}} here";
    const result = fillTemplate(template, {});
    expect(result).toBe("Nothing to {{REPLACE}} here");
  });

  it("handles an empty template string", () => {
    const result = fillTemplate("", { KEY: "value" });
    expect(result).toBe("");
  });

  it("handles templates with no placeholders", () => {
    const template = "No placeholders here.";
    const result = fillTemplate(template, { KEY: "value" });
    expect(result).toBe("No placeholders here.");
  });
});

describe("commandExists", () => {
  it("returns true for a command that exists (node)", async () => {
    const exists = await commandExists("node");
    expect(exists).toBe(true);
  });

  it("returns false for a command that does not exist", async () => {
    const exists = await commandExists(
      "this-command-definitely-does-not-exist-xyz",
    );
    expect(exists).toBe(false);
  });
});

describe("readOptional", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "readopt-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("reads an existing file", async () => {
    const filePath = path.join(tmpDir, "exists.txt");
    await fs.writeFile(filePath, "file content", "utf8");

    const result = await readOptional(filePath);
    expect(result).toBe("file content");
  });

  it("returns null for a missing file", async () => {
    const result = await readOptional(path.join(tmpDir, "missing.txt"));
    expect(result).toBeNull();
  });
});
