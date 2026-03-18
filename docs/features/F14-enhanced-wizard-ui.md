# F14: Enhanced Wizard UI with Colors & Visual Polish

## TLDR

Upgrade the wizard from plain `@inquirer/prompts` text to a visually polished CLI experience using chalk, ora, boxen, and gradient-string — making the setup feel professional, informative, and delightful.

## Description

The current wizard uses bare `@inquirer/prompts` with no color, no spinners, no visual grouping. Modern CLI tools (create-next-app, create-t3-app, Vite) set the bar for beautiful terminal UIs. This feature brings the wizard up to that standard.

### Visual Enhancements

1. **Header banner** — Gradient-colored title (`gradient-string`) with version and tagline in a box (`boxen`):

   ```
   ╭──────────────────────────────────────╮
   │                                      │
   │   ai-init v0.2.0                     │
   │   Bootstrap your AI dev environment  │
   │                                      │
   ╰──────────────────────────────────────╯
   ```

2. **Step indicators** — Colored step numbers with progress bar:

   ```
   [3/10] 🔧 Task Tracker Selection
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 30%
   ```

3. **Spinners for async operations** — `ora` spinners during Claude Code install check, MCP validation, audit:

   ```
   ⠋ Checking Claude Code installation...
   ✓ Claude Code v2.1.45 found
   ```

4. **Color-coded output** — `chalk` for consistent coloring:
   - Green for success/created files
   - Yellow for warnings/skipped steps
   - Red for errors
   - Cyan for info/hints
   - Dim for secondary information

5. **Summary table** — Boxed summary at the end showing what was generated:

   ```
   ╭─ Generated Files ─────────────────────╮
   │  ✓ CLAUDE.md          Agent config     │
   │  ✓ .mcp.json          5 MCP servers    │
   │  ✓ docs/              8 templates      │
   │  ✓ .claude/rules/     6 rules          │
   │  ✓ .claude/skills/    3 skills         │
   │  ✓ .claude/hooks/     Pre-commit gate  │
   │  ⊘ Agent teams        Skipped          │
   ╰────────────────────────────────────────╯
   ```

6. **Themed prompt options** — Descriptions with color-coded badges for choices:
   ```
   ? Choose a task tracker:
   ❯ Task Master  (recommended)  Full project management with subtasks
     Beads                       Git-native distributed tracking
     Simple Markdown             Lightweight, no dependencies
   ```

### Libraries to Add

| Package                       | Purpose                    | Size  |
| ----------------------------- | -------------------------- | ----- |
| `chalk` (v5)                  | Terminal string styling    | 41KB  |
| `ora` (v8)                    | Elegant spinners           | 20KB  |
| `boxen` (v8)                  | Boxes in terminal          | 15KB  |
| `gradient-string` (v3)        | Color gradients for header | 12KB  |
| `cli-progress` or `cli-width` | Progress bars              | ~10KB |

All are ESM-compatible, zero-vulnerability, well-maintained packages from the Sindre Sorhus ecosystem.

## Value

- **Professional first impression** — the tool looks polished and trustworthy
- **Better UX** — progress indicators reduce anxiety during long operations
- **Clearer output** — color-coded results are scannable at a glance
- **Competitive parity** — matches the visual quality of create-next-app, Vite, etc.

## Changes Required

| File                        | Change                                                                      |
| --------------------------- | --------------------------------------------------------------------------- |
| `package.json`              | Add `chalk`, `ora`, `boxen`, `gradient-string` as dependencies              |
| `src/wizard.ts`             | Wrap all prompts with colored headers, step indicators, progress bars       |
| `src/cli.ts`                | Add gradient banner on startup                                              |
| `src/phases/post-create.ts` | Add ora spinners for file generation, per-file success output               |
| `src/phases/post-start.ts`  | Colorize welcome banner and task progress                                   |
| `src/audit.ts`              | Add spinner during audit, color-code PASS/FILL/FIX results                  |
| `src/utils.ts`              | Add `ui` helper module exporting themed chalk instances and spinner factory |
| `test/`                     | Tests may need `--no-color` flag or chalk level override for assertions     |
