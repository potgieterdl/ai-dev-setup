/**
 * Barrel export for lifecycle phases.
 *
 * Three phases map to Codespace lifecycle events:
 *   - on-create:   Heavy installs (npm globals) — runs once per Codespace creation
 *   - post-create: Project config orchestration — generates all project files
 *   - post-start:  Per-session setup (.env sync, welcome banner) — runs every start
 */
export { runOnCreate } from "./on-create.js";
export { runPostCreate } from "./post-create.js";
export { runPostStart } from "./post-start.js";
