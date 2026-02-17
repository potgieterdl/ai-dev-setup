# ADR-015: Claude Code Bootstrap and Audit Runner

- **Status:** Accepted
- **Feature:** F11 (Claude Code Bootstrap & Audit)
- **Task:** 15 — Implement Claude Code Bootstrap and Audit Runner
- **Date:** 2026-02-17

## Context

The tool scaffolds dozens of files during setup — CLAUDE.md, rules, skills, hooks, MCP configs, doc templates. A human reviewing all of that manually is tedious and error-prone. Claude Code in headless mode can systematically audit the output, catching structural issues, missing cross-references, and placeholder gaps. Key design questions:

- How should the audit runner be structured for testability?
- How should graceful degradation work when Claude Code is unavailable?
- Where in the CLI flow should the audit be called?
- How should the audit prompt be scoped to only generated files?

## Decision

- **Separate `src/audit.ts` module** — The audit functionality lives in its own module rather than being embedded in the wizard or post-create phase. This keeps the audit concerns isolated and makes each function independently testable. The module exports: `checkClaudeCodeAvailable()`, `installClaudeCode()`, `buildAuditPrompt()`, and `runAudit()`.

- **`buildAuditPrompt()` is a pure function** — Following the project's generator pattern, the audit prompt builder is a pure function that takes a file list and returns a string. This makes it trivially testable — no mocks needed, just assert on string content.

- **Manifest-driven scoping** — The audit prompt includes only files tracked in `config.generatedFiles[]`, which is populated by `runPostCreate()`. This ensures the audit reviews only what was just generated, not pre-existing project code.

- **Graceful degradation at every level** — The `runAudit()` function handles three failure modes without throwing: (1) no files generated → skip with warning, (2) Claude Code not available → skip with warning, (3) audit execution fails → catch error, warn, return undefined. The wizard never blocks on audit failure.

- **Audit called from `cli.ts`, not `post-create.ts`** — The audit runs after `runPostCreate()` completes, triggered by `config.runAudit` flag. This keeps the post-create phase focused on file generation and avoids coupling it to Claude Code availability. The CLI orchestrates the sequence: wizard → post-create → audit.

- **Claude Code invoked with `--print` flag** — The audit uses `claude --print <prompt>` to run Claude Code in non-interactive headless mode. This outputs the audit result to stdout which is captured and saved to `.ai-init-audit.md`.

- **Results saved to `.ai-init-audit.md`** — The audit output is written to the project root as a markdown file. This file is already in `.gitignore` since it's a transient setup artifact, not source code.

- **Structured 7-point audit checklist** — The audit prompt includes specific checks for: structure compliance, cross-references, rules consistency, MCP config validity, template completeness, gaps, and instruction quality. Each check has concrete criteria, not vague instructions.

- **Tests use `vi.spyOn` on utils** — Since `audit.ts` imports `commandExists` and `run` from `utils.ts`, tests spy on these to control behavior without mocking the module. This follows the established test pattern in the project.

## Consequences

- The audit step is fully optional — it degrades gracefully at every level and never blocks the wizard.
- Adding new audit checks requires only updating the `AUDIT_PROMPT_TEMPLATE` constant.
- The `installClaudeCode()` function is available for use by the `on-create` phase but the audit module does not call it automatically — installation is a separate concern handled during Codespace creation.
- Audit quality depends on the Claude model's ability to follow the structured prompt. The tightly scoped, manifest-driven approach minimizes hallucination risk.
- 13 unit tests cover all audit functions including graceful degradation paths, prompt construction, and successful audit flow.
