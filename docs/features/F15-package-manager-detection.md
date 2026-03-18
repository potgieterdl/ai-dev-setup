# F15: Package Manager Detection & Abstraction

## TLDR

Auto-detect whether the project uses npm, pnpm, yarn, or bun — then use the correct commands everywhere (install, run scripts, lockfile handling). Currently the tool hardcodes `npm` throughout.

## Description

The tool currently assumes `npm` for all operations: `npm install -g`, `npm ci`, `npm run build`, `npm test`, and the pre-commit hook uses `npm run --if-present`. This breaks or is suboptimal for the ~40% of JS/TS projects using pnpm, yarn, or bun.

### Detection Strategy

Use the same approach as Turborepo and `@antfu/ni`:

1. **Lock file detection** (highest priority):
   - `package-lock.json` → npm
   - `pnpm-lock.yaml` → pnpm
   - `yarn.lock` → yarn
   - `bun.lock` or `bun.lockb` → bun

2. **`packageManager` field in `package.json`** (second priority):

   ```json
   { "packageManager": "pnpm@9.15.0" }
   ```

3. **Wizard fallback** — if no lock file and no `packageManager` field, ask the user.

4. **`--pm` flag override** — explicit CLI flag: `ai-init --pm=pnpm`

### Command Abstraction Layer

Create a `PackageManager` interface:

```typescript
interface PackageManager {
  name: "npm" | "pnpm" | "yarn" | "bun";
  install: string; // "npm ci" | "pnpm install --frozen-lockfile" | ...
  installGlobal: string; // "npm install -g" | "pnpm add -g" | ...
  run: string; // "npm run" | "pnpm" | "yarn" | "bun run"
  exec: string; // "npx" | "pnpm dlx" | "yarn dlx" | "bunx"
  lockFile: string; // "package-lock.json" | "pnpm-lock.yaml" | ...
  runIfPresent: string; // "npm run --if-present" | "pnpm run --if-present" | ...
}
```

### Impact on Generated Files

| Generated File                    | Current (npm-only)                    | New (PM-aware)                       |
| --------------------------------- | ------------------------------------- | ------------------------------------ |
| `.claude/hooks/pre-commit.sh`     | `npm run format --if-present`         | `{{PM_RUN}} format --if-present`     |
| `install.sh`                      | `npm ci && npm run build`             | Detect PM, use correct commands      |
| `.devcontainer/devcontainer.json` | `npm install -g` in postCreateCommand | Use detected PM's global install     |
| `CLAUDE.md` quality gate          | `npm run lint`, `npm test`            | `{{PM_RUN}} lint`, `{{PM_RUN}} test` |
| `.claude/rules/general.md`        | References npm                        | References detected PM               |
| `docs/onboarding.md`              | `npm install`, `npm run dev`          | PM-specific commands                 |

### Future: Beyond Node.js

This feature also lays the groundwork for polyglot support. The `PackageManager` interface can be extended to a `ToolChain` concept:

```typescript
interface ToolChain {
  language: "node" | "python" | "go" | "rust";
  packageManager: PackageManager | PythonPM | GoPM;
  buildCommand: string;
  testCommand: string;
  lintCommand: string;
}
```

For now, we only implement Node.js package managers. Python/Go/Rust support is deferred to F19.

## Value

- **Works for everyone** — pnpm and bun users no longer get broken hooks and instructions
- **Correct lockfile handling** — generated devcontainer uses the right install command
- **Future-proof** — abstraction layer makes adding new PMs or languages straightforward
- **Detection is standard** — same strategy used by Turborepo, ni, and create-next-app

## Changes Required

| File                             | Change                                                                      |
| -------------------------------- | --------------------------------------------------------------------------- |
| `src/types.ts`                   | Add `PackageManager` interface, add `pm: PackageManager` to `ProjectConfig` |
| `src/defaults.ts`                | Default PM to npm                                                           |
| `src/utils.ts`                   | Add `detectPackageManager(projectRoot): PackageManager` function            |
| `src/wizard.ts`                  | Auto-detect PM at start; add fallback prompt if ambiguous                   |
| `src/cli.ts`                     | Add `--pm` flag to meow flags                                               |
| `src/generators/hooks.ts`        | Use `config.pm.runIfPresent` instead of hardcoded `npm run --if-present`    |
| `src/generators/claude-md.ts`    | Use `config.pm.run` in quality gate section                                 |
| `src/generators/devcontainer.ts` | Use `config.pm.installGlobal` and `config.pm.install`                       |
| `src/generators/docs.ts`         | Use PM-specific commands in onboarding.md template                          |
| `templates/hooks/pre-commit.sh`  | Replace `npm run` with `{{PM_RUN}}` placeholders                            |
| `templates/rules/general.md`     | Replace npm references with `{{PM_NAME}}`                                   |
| `templates/docs/onboarding.md`   | Replace npm commands with PM placeholders                                   |
| `install.sh`                     | Detect PM in target project for build step                                  |
| `test/utils.test.ts`             | Test `detectPackageManager` with all lock files                             |
| `test/generators/*.test.ts`      | Test PM substitution in generated files                                     |
