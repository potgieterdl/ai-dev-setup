# ADR-004: File I/O Utilities Design

- **Status:** Accepted
- **Context:** Generators are pure functions that return `FileDescriptor[]` and never touch the filesystem. A shared I/O layer is needed to write generator output to disk, run shell commands, check tool availability, fill template placeholders, and safely read optional files.
- **Decision:**
  - All file I/O funnels through a single `writeFiles()` function in `src/utils.ts` that accepts `FileDescriptor[]`, a root path, and an overwrite flag. This is the only place files are created on disk.
  - `writeFiles()` creates parent directories automatically (`mkdir -p` semantics), supports an `executable` flag for chmod 755, and returns the list of paths actually written.
  - `run()` wraps `child_process.execFile` (not `exec`) to avoid shell injection risks. It rejects on non-zero exit.
  - `commandExists()` uses `which` to check PATH availability — simple, portable on Linux/macOS.
  - `fillTemplate()` is a synchronous pure function using regex replacement of `{{PLACEHOLDER}}` markers. Unmatched placeholders are preserved, enabling multi-pass template filling.
  - `readOptional()` returns `null` instead of throwing when a file is missing, simplifying conditional logic in generators and phases.
- **Consequences:**
  - Generators remain trivially testable (no mocks needed — just assert on returned `FileDescriptor[]`).
  - Integration tests for `writeFiles` require temp directories but are straightforward.
  - The `which` approach in `commandExists` won't work on Windows, but Windows is out of scope (Linux/macOS/Codespaces only).
  - Using `execFile` instead of `exec` means commands must be passed as `(cmd, args[])` tuples, preventing accidental shell expansion.
