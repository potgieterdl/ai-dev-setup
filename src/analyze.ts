import { z } from "zod";
import { run, logToFile } from "./utils.js";
import { detectProject } from "./detect.js";
import type { ProjectAnalysis, DetectionResult } from "./types.js";
import { KNOWN_RULES, KNOWN_HOOK_STEPS } from "./types.js";

/**
 * Zod schema matching the --json-schema passed to Claude Haiku.
 * Validates that the LLM response conforms to the expected shape.
 */
const AnalysisSchema = z.object({
  detectedArchitecture: z.enum(["monolith", "2-tier", "3-tier", "microservices"]),
  apiPaths: z.array(z.string()).max(10),
  dbPaths: z.array(z.string()).max(10),
  testPaths: z.array(z.string()).max(10),
  architectureGuidance: z.string().max(500),
  recommendedRules: z.array(z.enum(KNOWN_RULES)),
  hookSteps: z.array(z.enum(KNOWN_HOOK_STEPS)),
});

/**
 * JSON Schema for --json-schema flag, constraining Haiku's output.
 * Must stay in sync with the Zod schema above.
 */
const JSON_SCHEMA = {
  type: "object" as const,
  required: [
    "detectedArchitecture",
    "apiPaths",
    "dbPaths",
    "testPaths",
    "architectureGuidance",
    "recommendedRules",
    "hookSteps",
  ],
  properties: {
    detectedArchitecture: {
      type: "string" as const,
      enum: ["monolith", "2-tier", "3-tier", "microservices"],
    },
    apiPaths: { type: "array" as const, items: { type: "string" as const }, maxItems: 10 },
    dbPaths: { type: "array" as const, items: { type: "string" as const }, maxItems: 10 },
    testPaths: { type: "array" as const, items: { type: "string" as const }, maxItems: 10 },
    architectureGuidance: { type: "string" as const, maxLength: 500 },
    recommendedRules: {
      type: "array" as const,
      items: { type: "string" as const, enum: [...KNOWN_RULES] },
    },
    hookSteps: {
      type: "array" as const,
      items: { type: "string" as const, enum: [...KNOWN_HOOK_STEPS] },
    },
  },
};

/**
 * Build the analysis prompt from detection results.
 */
function buildAnalysisPrompt(detection: DetectionResult): string {
  return `Given this project structure: ${JSON.stringify(detection, null, 2)}

Analyze the codebase and return structured configuration for AI-assisted development rules, hooks, and documentation. Consider the directory layout, dependencies, and config files to determine the architecture type, relevant file path globs, and which development rules and quality gate steps are appropriate.`;
}

/**
 * Call Claude Haiku in headless mode with JSON schema constraint.
 * Returns the raw parsed JSON response.
 */
/** Timeout for each Claude Haiku call (30 seconds). */
const HAIKU_TIMEOUT_MS = 30_000;

async function callHaiku(detection: DetectionResult, projectRoot: string): Promise<unknown> {
  const prompt = buildAnalysisPrompt(detection);
  const args = [
    "--model",
    "haiku",
    "-p",
    prompt,
    "--output-format",
    "json",
    "--json-schema",
    JSON.stringify(JSON_SCHEMA),
    "--max-turns",
    "1",
    "--allowedTools",
    "Read",
  ];

  // Log the full command to file for debugging
  logToFile("--- CLAUDE HAIKU CALL ---");
  logToFile(`CWD: ${projectRoot}`);
  logToFile(`CMD: claude ${args.map((a) => (a.includes(" ") || a.includes("{") ? `'${a}'` : a)).join(" ")}`);
  logToFile(`PROMPT:\n${prompt}`);

  let output: string;
  try {
    output = await run("claude", args, projectRoot, HAIKU_TIMEOUT_MS);
  } catch (err) {
    const stderr = (err as { stderr?: string }).stderr ?? "";
    logToFile(`STDERR:\n${stderr}`);
    logToFile(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }

  logToFile(`RESPONSE (stdout):\n${output}`);
  return JSON.parse(output);
}

/**
 * Orchestrate the four-step AI analysis pattern:
 * 1. Detect deterministically (filesystem scan)
 * 2. Synthesize with Haiku (LLM call with JSON schema)
 * 3. Validate structurally (Zod)
 * 4. Return result or null for fallback
 *
 * Graceful degradation:
 * - detectProject fails → return null
 * - Haiku call fails → return null
 * - Zod validation fails → retry once → return null
 * - JSON parse fails → return null
 *
 * At every failure point, callers fall back to current hardcoded defaults.
 *
 * Implements F20 Part C from the PRD.
 */
export async function analyzeProject(projectRoot: string): Promise<ProjectAnalysis | null> {
  logToFile(`analyzeProject() called for: ${projectRoot}`);

  // Step 1: Deterministic filesystem scan
  let detection: DetectionResult;
  try {
    console.log("    → Step 1/3: Scanning filesystem...");
    detection = await detectProject(projectRoot);
    console.log(
      `    ✓ Found: ${detection.directories.length} dirs, ` +
        `${detection.frameworks.length} frameworks, ` +
        `${detection.configFiles.length} config files`
    );
    logToFile(`Detection result:\n${JSON.stringify(detection, null, 2)}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`    ✗ Filesystem scan failed: ${msg}`);
    logToFile(`Detection FAILED: ${msg}`);
    return null;
  }

  // Step 2: Call Claude Haiku for AI analysis
  let raw: unknown;
  try {
    console.log("    → Step 2/3: Calling Claude Haiku for analysis (timeout: 30s)...");
    console.log("      Command: claude --model haiku -p <prompt> --output-format json");
    console.log("      (full command logged to ai-init.log)");
    raw = await callHaiku(detection, projectRoot);
    console.log("    ✓ Received AI response.");
  } catch (err) {
    const stderr = (err as { stderr?: string }).stderr ?? "";
    const msg = err instanceof Error ? err.message : String(err);
    // Show a concise error on console, full details go to log file
    if (msg.includes("SIGTERM") || msg.includes("timed out") || msg.includes("killed")) {
      console.log("    ✗ Claude call timed out after 30s — is ANTHROPIC_API_KEY set?");
    } else if (stderr) {
      // Show first line of stderr on console — it's usually the useful part
      const firstLine = stderr.trim().split("\n")[0];
      console.log(`    ✗ Claude call failed: ${firstLine}`);
      console.log("      See ai-init.log for full details.");
    } else {
      console.log(`    ✗ Claude call failed: ${msg.slice(0, 200)}`);
      console.log("      See ai-init.log for full details.");
    }
    return null;
  }

  // Step 3: Validate response
  console.log("    → Step 3/3: Validating response schema...");
  const result = AnalysisSchema.safeParse(raw);
  if (result.success) {
    console.log("    ✓ Validation passed.");
    logToFile("Validation PASSED.");
    return result.data;
  }

  // Retry once with validation errors as context
  console.log("    ⚠ Validation failed, retrying with error feedback...");
  logToFile(`Validation FAILED: ${JSON.stringify(result.error.issues)}`);
  try {
    const retryPrompt = `Previous response failed validation with errors: ${JSON.stringify(result.error.issues)}
Project structure: ${JSON.stringify(detection)}
Return valid JSON only.`;

    const retryRaw = await run(
      "claude",
      [
        "--model",
        "haiku",
        "-p",
        retryPrompt,
        "--output-format",
        "json",
        "--json-schema",
        JSON.stringify(JSON_SCHEMA),
        "--max-turns",
        "1",
        "--allowedTools",
        "Read",
      ],
      projectRoot,
      HAIKU_TIMEOUT_MS
    );

    logToFile(`RETRY RESPONSE:\n${retryRaw}`);
    const retryResult = AnalysisSchema.safeParse(JSON.parse(retryRaw));
    if (retryResult.success) {
      console.log("    ✓ Retry validation passed.");
      logToFile("Retry validation PASSED.");
      return retryResult.data;
    }
    console.log("    ✗ Retry validation also failed.");
    logToFile(`Retry validation FAILED: ${JSON.stringify(retryResult.error.issues)}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`    ✗ Retry failed: ${msg}`);
    logToFile(`Retry ERROR: ${msg}`);
  }

  return null;
}
