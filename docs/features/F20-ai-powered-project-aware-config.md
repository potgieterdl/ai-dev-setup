# F20: AI-Powered Project-Aware Configuration

## TLDR

Replace the deprecated npm-based Claude installation with the native installer, add an authentication gate, ask whether it's a new or existing project, and — for existing projects — use `claude --model haiku` in headless mode to scan the codebase and generate tailored rules, hooks, and CLAUDE.md content with correct path globs. Falls back to current defaults when Claude is unavailable or unauthenticated.

## Description

### The Problem

Today the architecture choice in the wizard generates nearly identical output for monolith, 3-tier, and microservices. Path globs in rules are hardcoded (`src/api/**`, `src/db/**`) regardless of actual project structure. The Claude Code installation uses the deprecated npm package. There's no authentication check, so the audit step can silently fail.

### Part A: Native Claude Installer + Auth Gate

**Installation:** Replace `npm install -g @anthropic-ai/claude-code` with the native installer:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

The npm package `@anthropic-ai/claude-code` is officially deprecated. The native installer downloads a standalone binary with auto-updates — no Node.js dependency.

**Authentication check:** After confirming Claude is installed, verify the user is authenticated before enabling AI features:

```typescript
// Check auth status programmatically
const authResult = await run("claude", ["auth", "status", "--text"]);
// Returns "Login method: ..." if authenticated
// Throws or returns error if not
```

If not authenticated, offer three options:

1. **Enter API key** — set `ANTHROPIC_API_KEY` for the session (best for Codespaces/CI)
2. **Run `claude auth login`** — opens browser OAuth flow (best for local dev)
3. **Skip AI features** — use current hardcoded defaults (zero regression)

### Part B: New vs Existing Project

Add an early wizard step:

```
? Is this a new project or an existing codebase?
  ❯ New project      Start fresh with architecture selection
    Existing project  Scan codebase to auto-detect structure
```

**New project:** Standard wizard flow. Architecture choice drives sensible defaults. The AI can optionally suggest path conventions based on the chosen architecture and framework, but this is a nice-to-have.

**Existing project:** This is where the real value lives. The wizard:

1. Runs deterministic file detection (fast, free, no LLM)
2. Feeds detection results to `claude --model haiku` for intelligent analysis
3. Shows the user a preview of detected config for confirmation

### Part C: AI-Enhanced Architecture Analysis (Existing Projects)

The four-step pattern: **detect deterministically → synthesize with LLM → validate structurally → confirm with user**.

#### Step 1: Deterministic Detection (No LLM)

Scan the filesystem for architecture signals:

```typescript
interface DetectionResult {
  // Files found
  hasPackageJson: boolean;
  hasTsConfig: boolean;
  hasDockerCompose: boolean;
  hasPrismaSchema: boolean;
  hasGraphqlConfig: boolean;
  // Directory patterns
  directories: string[]; // top-level src/ dirs
  configFiles: string[]; // detected config files
  // Dependencies (from package.json)
  frameworks: string[]; // ["express", "next", "fastapi"]
  orms: string[]; // ["prisma", "drizzle", "typeorm"]
  testFrameworks: string[]; // ["vitest", "jest", "pytest"]
}
```

This is fast (~50ms), free, and deterministic.

#### Step 2: Synthesize with Haiku

Pass the detection summary to Claude Haiku via headless mode:

```bash
claude --model haiku \
  -p "Given this project structure: ${JSON.stringify(detection)}, analyze and return..." \
  --output-format json \
  --json-schema '${JSON.stringify(analysisSchema)}' \
  --max-turns 1 \
  --allowedTools "Read"
```

The JSON Schema constrains the output to a strict, enum-heavy shape:

```typescript
interface ProjectAnalysis {
  detectedArchitecture: "monolith" | "2-tier" | "3-tier" | "microservices";
  apiPaths: string[]; // ["src/routes/**", "src/api/**"]
  dbPaths: string[]; // ["prisma/**", "src/db/**"]
  testPaths: string[]; // ["src/__tests__/**", "test/**"]
  architectureGuidance: string; // 2-3 sentences for CLAUDE.md (only free-text field)
  recommendedRules: string[]; // enum subset: ["general", "api", "database", "security", ...]
  hookSteps: string[]; // enum subset: ["format", "lint", "typecheck", "build", "test"]
}
```

**Why this is safe:**

- `--json-schema` uses constrained decoding — output physically cannot violate the schema
- Haiku costs ~$0.001 per call, completes in ~1-2 seconds
- `--max-turns 1` caps cost; `--allowedTools "Read"` limits what it can do
- The only free-text field is `architectureGuidance` (2-3 sentences) — everything else is enums or path arrays

#### Step 3: Validate Structurally

Validate the Haiku response with Zod:

```typescript
const AnalysisSchema = z.object({
  detectedArchitecture: z.enum(["monolith", "2-tier", "3-tier", "microservices"]),
  apiPaths: z.array(z.string()).max(10),
  dbPaths: z.array(z.string()).max(10),
  testPaths: z.array(z.string()).max(10),
  architectureGuidance: z.string().max(500),
  recommendedRules: z.array(z.enum(KNOWN_RULES)),
  hookSteps: z.array(z.enum(KNOWN_HOOK_STEPS)),
});
```

If validation fails, retry once with error context. If it fails again, fall back to current hardcoded defaults.

#### Step 4: Confirm with User

```
🔍 AI detected your project structure:

  Architecture:  3-tier (Express + Prisma + React)
  API paths:     src/server/routes/**, src/api/**
  DB paths:      prisma/**, src/models/**
  Test paths:    src/__tests__/**, test/e2e/**
  Rules:         general, api, database, testing, security, git
  Hook steps:    format, lint, typecheck, build, test

  Guidance for CLAUDE.md:
  "3-tier architecture with Express API layer and Prisma ORM.
   Keep business logic in services, not route handlers.
   Database migrations managed via prisma migrate."

? Accept this configuration? (Y/n/edit)
```

- **Y** — proceed with AI-detected config
- **n** — discard AI results, fall back to manual wizard steps
- **edit** — drop into step-by-step confirmation of each field

### Graceful Degradation Chain

```
Claude not installed     → install via native installer → continue
Install fails            → skip all AI features, use defaults
Claude not authenticated → offer auth options → if skipped, use defaults
Auth fails               → skip AI features, use defaults
Haiku call fails         → use defaults (network error, rate limit)
Validation fails (2x)    → use defaults
User rejects AI config   → fall back to manual wizard steps
Non-interactive mode     → skip AI entirely, use env vars + defaults
```

At every failure point, the tool works exactly as it does today. AI features are additive.

## Value

- **Correct path globs** — rules actually match the project's directory structure instead of hardcoded `src/api/**`
- **Architecture-aware generation** — monolith, 3-tier, and microservices finally produce meaningfully different output
- **Existing project support** — the wizard becomes useful for brownfield projects, not just greenfield
- **Native installer** — removes deprecated npm dependency, adds auto-updates
- **Auth gate** — prevents silent failures in audit and AI features; clear user guidance
- **Zero regression** — every AI feature degrades gracefully to current behavior

## Changes Required

| File                          | Change                                                                                                               |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `install.sh`                  | Replace `npm install -g @anthropic-ai/claude-code` with `curl -fsSL https://claude.ai/install.sh \| bash`            |
| `src/audit.ts`                | Update `installClaudeCode()` to use native installer; add `checkClaudeAuthenticated()` using `claude auth status`    |
| `src/types.ts`                | Add `ProjectAnalysis` interface; add `isExistingProject`, `analysisResult`, `claudeAuthenticated` to `ProjectConfig` |
| `src/detect.ts`               | **New**: deterministic filesystem detection — scan dirs, package.json deps, config files                             |
| `src/analyze.ts`              | **New**: orchestrate detect → haiku call → zod validate → fallback chain                                             |
| `src/wizard.ts`               | Add Step 0.5 (auth check), new-vs-existing prompt, AI analysis step after architecture; show preview                 |
| `src/generators/rules.ts`     | Use `config.analysisResult.apiPaths` / `dbPaths` instead of hardcoded globs                                          |
| `src/generators/hooks.ts`     | Use `config.analysisResult.hookSteps` to conditionally include steps                                                 |
| `src/generators/claude-md.ts` | Include `config.analysisResult.architectureGuidance` section                                                         |
| `templates/rules/api.md`      | Replace hardcoded `src/api/**` with `{{API_PATHS}}` placeholder                                                      |
| `templates/rules/database.md` | Replace hardcoded `src/db/**` with `{{DB_PATHS}}` placeholder                                                        |
| `test/detect.test.ts`         | **New**: test filesystem detection with mock directory structures                                                    |
| `test/analyze.test.ts`        | **New**: test haiku call mocking, zod validation, fallback chain                                                     |
| `test/auth.test.ts`           | **New**: test auth check, API key flow, graceful degradation                                                         |
