# ADR-017: install.sh Bootstrap Script

- **Status:** Accepted
- **Context:** The PRD (F1) specifies a single-line install via `curl -fsSL ... | bash`. Users need to go from zero to a working `ai-init` command with only `bash` and `curl` as prerequisites. The script must handle the common case where Node.js is not installed or is too old.
- **Decision:**
  - Created `install.sh` as a self-contained bash bootstrap that handles four steps: ensure Node.js >= 20 (via fnm), clone/update the repo, install dependencies + build, and create a wrapper in `~/.local/bin/`.
  - Chose **fnm** (Fast Node Manager) as the Node.js installer because it's a single Rust binary with no dependencies, installs quickly, and supports version pinning. Used `--skip-shell` flag to avoid modifying shell config during piped execution (important for `curl | bash` safety).
  - Used a **bash wrapper script** (`~/.local/bin/ai-init`) instead of a direct symlink to `dist/cli.js`. A symlink requires the .js file to have a proper shebang and correct `node` resolution, which can break when fnm manages multiple Node versions. The wrapper explicitly calls `node` with the full path, making it robust across shell environments.
  - **Fallback strategy**: `npm ci` is preferred (reproducible builds from lockfile) but falls back to `npm install` if it fails (e.g., lockfile out of sync after a fresh clone).
  - **Git pull failure is non-fatal**: If the repo already exists and `git pull --ff-only` fails (e.g., local modifications), the script continues with the existing version rather than aborting. This prevents the installer from breaking when a user has made local changes.
  - The install directory defaults to `~/.ai-helper-tools` but is overridable via `$AI_HELPER_HOME` for custom setups.
- **Consequences:**
  - Users can install with a single command: `curl -fsSL <url> | bash`.
  - Running the installer again updates the existing installation (idempotent).
  - Node.js is installed if missing, but the script does not modify `.bashrc`/`.zshrc` — it only prints instructions if `~/.local/bin` is not in PATH.
  - The wrapper script approach means `ai-init` works even if the user switches Node versions via fnm later, as long as `node` is on PATH.
