#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# ⚠️  DEPRECATED — This script has been replaced by the TypeScript CLI `ai-init`.
#
# The TypeScript CLI provides the same lifecycle commands plus new features:
#   - Interactive wizard with task tracker, architecture, and doc scaffolding
#   - Path-scoped rules, skills, and hooks generation
#   - Claude Code headless audit of generated files
#   - Agent teams opt-in configuration
#
# Migration:
#   Install:  curl -fsSL https://raw.githubusercontent.com/potgieterdl/ai-helper-tools/main/install.sh | bash
#   Usage:    ai-init                  # Interactive wizard (replaces ./setup-ai.sh)
#             ai-init on-create        # Replaces ./setup-ai.sh on-create
#             ai-init post-create      # Replaces ./setup-ai.sh post-create
#             ai-init post-start       # Replaces ./setup-ai.sh post-start
#
# This file is kept for reference only. It will be removed in a future release.
# =============================================================================
#
# setup-ai.sh — AI Development Environment Bootstrap for GitHub Codespaces
# (LEGACY — see deprecation notice above)
#
# Single-file bootstrap: copy into any new Codespace, chmod +x, and run.
# Creates devcontainer config so future rebuilds are automatic.
#
# Usage:
#   ./setup-ai.sh              Full first-time setup (interactive MCP selection)
#   ./setup-ai.sh on-create    Heavy installs (cached in Codespace prebuilds)
#   ./setup-ai.sh post-create  Project-specific configuration
#   ./setup-ai.sh post-start   Per-session setup (runs every container start)
#
# Environment:
#   SETUP_AI_MCPS="taskmaster,context7"   Pre-select MCPs (skip interactive menu)
#   SETUP_AI_NONINTERACTIVE=1             Skip all prompts, use defaults/env
# =============================================================================

# --- MCP Registry ---
# Each entry: name|description|npm_package|claude_mcp_name|always_required
MCP_REGISTRY=(
  "taskmaster|Task Master AI — task orchestration, dependency tracking, multi-agent coordination|task-master-ai|taskmaster-ai|1"
  "context7|Context7 — up-to-date library docs and code examples via MCP|@upstash/context7-mcp|context7|0"
  "browsermcp|BrowserMCP — browser automation for testing (navigate, click, screenshots)|@anthropic-ai/mcp-server-puppeteer|browsermcp|0"
  "sequential-thinking|Sequential Thinking — dynamic problem-solving through thought sequences|@anthropic-ai/mcp-server-sequential-thinking|sequential-thinking|0"
)

# Stores the user's chosen MCPs (populated by select_mcps)
SELECTED_MCPS=()

# =============================================================================
# Interactive MCP Selection
# =============================================================================
select_mcps() {
  # If pre-selected via environment, parse and return
  if [ -n "${SETUP_AI_MCPS:-}" ]; then
    IFS=',' read -ra SELECTED_MCPS <<< "${SETUP_AI_MCPS}"
    echo "[setup-ai] Using pre-selected MCPs: ${SETUP_AI_MCPS}"
    return 0
  fi

  # Non-interactive mode: install all
  if [ "${SETUP_AI_NONINTERACTIVE:-0}" = "1" ]; then
    for entry in "${MCP_REGISTRY[@]}"; do
      IFS='|' read -r name _ _ _ _ <<< "$entry"
      SELECTED_MCPS+=("$name")
    done
    echo "[setup-ai] Non-interactive mode: all MCPs selected."
    return 0
  fi

  # Interactive selection
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Select MCP Servers to Install"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  local idx=1
  local names=()
  local required=()

  for entry in "${MCP_REGISTRY[@]}"; do
    IFS='|' read -r name description _ _ is_required <<< "$entry"
    names+=("$name")
    required+=("$is_required")
    if [ "$is_required" = "1" ]; then
      echo "  ${idx}) [REQUIRED] ${name}"
    else
      echo "  ${idx}) ${name}"
    fi
    echo "     ${description}"
    echo ""
    idx=$((idx + 1))
  done

  echo "  a) All of the above"
  echo ""
  printf "  Enter selections (comma-separated numbers, or 'a' for all) [a]: "
  local answer
  read -r answer

  # Default to all
  if [ -z "$answer" ] || [ "$answer" = "a" ] || [ "$answer" = "A" ]; then
    for name in "${names[@]}"; do
      SELECTED_MCPS+=("$name")
    done
    echo ""
    echo "  → Selected: all MCPs"
  else
    # Always include required MCPs
    for i in "${!names[@]}"; do
      if [ "${required[$i]}" = "1" ]; then
        SELECTED_MCPS+=("${names[$i]}")
      fi
    done

    # Parse user selections
    IFS=',' read -ra choices <<< "$answer"
    for choice in "${choices[@]}"; do
      choice=$(echo "$choice" | tr -d ' ')
      if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#names[@]}" ]; then
        local selected_name="${names[$((choice - 1))]}"
        # Avoid duplicates
        local already_added=0
        for existing in "${SELECTED_MCPS[@]}"; do
          if [ "$existing" = "$selected_name" ]; then
            already_added=1
            break
          fi
        done
        if [ "$already_added" -eq 0 ]; then
          SELECTED_MCPS+=("$selected_name")
        fi
      else
        echo "  ⚠ Ignoring invalid selection: $choice"
      fi
    done

    echo ""
    echo "  → Selected: ${SELECTED_MCPS[*]}"
  fi
  echo ""
}

# Helper: check if an MCP was selected
is_mcp_selected() {
  local target="$1"
  for mcp in "${SELECTED_MCPS[@]}"; do
    if [ "$mcp" = "$target" ]; then
      return 0
    fi
  done
  return 1
}

# Helper: get MCP registry field by name
# Fields: 0=name, 1=description, 2=npm_package, 3=claude_name, 4=required
get_mcp_field() {
  local target_name="$1"
  local field_index="$2"
  for entry in "${MCP_REGISTRY[@]}"; do
    IFS='|' read -r name description npm_pkg claude_name is_required <<< "$entry"
    if [ "$name" = "$target_name" ]; then
      case "$field_index" in
        0) echo "$name" ;;
        1) echo "$description" ;;
        2) echo "$npm_pkg" ;;
        3) echo "$claude_name" ;;
        4) echo "$is_required" ;;
      esac
      return 0
    fi
  done
}

# Helper: validate selected MCPs exist in registry, warn on unknowns
validate_selected_mcps() {
  local valid_mcps=()
  for mcp in "${SELECTED_MCPS[@]}"; do
    local found=0
    for entry in "${MCP_REGISTRY[@]}"; do
      IFS='|' read -r name _ _ _ _ <<< "$entry"
      if [ "$mcp" = "$name" ]; then
        found=1
        break
      fi
    done
    if [ "$found" -eq 1 ]; then
      valid_mcps+=("$mcp")
    else
      echo "  ⚠ WARNING: Unknown MCP '${mcp}' — not in registry, skipping."
    fi
  done
  SELECTED_MCPS=("${valid_mcps[@]}")

  if [ ${#SELECTED_MCPS[@]} -eq 0 ]; then
    echo "  ⚠ ERROR: No valid MCPs selected! Defaulting to all."
    for entry in "${MCP_REGISTRY[@]}"; do
      IFS='|' read -r name _ _ _ _ <<< "$entry"
      SELECTED_MCPS+=("$name")
    done
  fi
}

# =============================================================================
# Phase 1: on-create — Heavy package installs
# Runs once when the container is first created. Cached in Codespace prebuilds.
# =============================================================================
phase_on_create() {
  echo ""
  echo "=== [on-create] Installing global tools ==="

  npm config set fund false >/dev/null 2>&1 || true

  # --- Claude Code ---
  NEED_CLAUDE=1
  if command -v claude >/dev/null 2>&1 || command -v claude-code >/dev/null 2>&1; then
    INSTALLED_VERSION=$(claude --version 2>/dev/null || claude-code --version 2>/dev/null || true)
    LATEST_VERSION=$(npm view @anthropic-ai/claude-code version 2>/dev/null || echo "")
    if [ -n "${INSTALLED_VERSION}" ] && [ -n "${LATEST_VERSION}" ] && [ "${INSTALLED_VERSION}" = "${LATEST_VERSION}" ]; then
      NEED_CLAUDE=0
    fi
  fi
  if [ "${NEED_CLAUDE}" -eq 1 ]; then
    echo "[on-create] Installing/updating @anthropic-ai/claude-code..."
    npm install -g @anthropic-ai/claude-code
    echo "[on-create] Installed claude-code $(claude --version 2>/dev/null || echo 'unknown')"
  else
    echo "[on-create] claude-code already up-to-date (${INSTALLED_VERSION})."
  fi

  # --- Task Master AI ---
  if ! command -v task-master >/dev/null 2>&1; then
    echo "[on-create] Installing task-master-ai..."
    npm install -g task-master-ai
    echo "[on-create] Installed task-master-ai $(npm ls -g task-master-ai --depth=0 2>/dev/null | grep task-master-ai | awk '{print $NF}' || echo 'unknown')"
  else
    echo "[on-create] task-master-ai already present ($(task-master --version 2>/dev/null || echo 'unknown'))."
  fi

  echo "[on-create] Global tools ready."

  # Pre-cache MCP server npm packages (so npx -y doesn't download later).
  # We install ALL packages here regardless of selection, since on-create is
  # cached in Codespace prebuilds and the cost is only disk space.
  echo "[on-create] Pre-caching MCP server npm packages..."
  for entry in "${MCP_REGISTRY[@]}"; do
    IFS='|' read -r name _ npm_pkg _ _ <<< "$entry"
    if [ "$name" != "taskmaster" ]; then  # task-master-ai already installed globally above
      echo "[on-create]   caching ${npm_pkg}..."
      npm cache add "${npm_pkg}@latest" 2>/dev/null || \
        echo "[on-create]   WARNING: failed to cache ${npm_pkg} (will download on first use)"
    fi
  done
  echo "[on-create] MCP packages cached."
}

# =============================================================================
# Phase 2: post-create — Project-specific configuration
# Runs once after the container is created.
# =============================================================================
phase_post_create() {
  echo ""
  echo "=== [post-create] Configuring project ==="

  # --- Fix EXDEV cross-device link errors for Claude plugin installs ---
  # In Codespaces, /tmp is often on a different filesystem than ~/.claude.
  # Claude Code's plugin installer uses os.tmpdir() + fs.rename() which fails
  # across filesystems. Fix by putting TMPDIR on the same filesystem.
  # Always create the directory — $HOME/.claude may not exist yet on first run.
  mkdir -p "$HOME/.claude/tmp" 2>/dev/null
  export TMPDIR="$HOME/.claude/tmp"
  echo "[post-create] Set TMPDIR=$TMPDIR (fixes cross-device plugin installs)"

  # --- Initialize Claude Code ---
  # Check user-level credentials (not project .claude/ which gets created later
  # by configure_claude_settings). setup-token is idempotent and fast if already
  # configured, so we always run it unless credentials exist.
  if [ ! -f "$HOME/.claude/.credentials.json" ]; then
    echo "[post-create] Setting up Claude Code auth token..."
    claude setup-token || echo "[post-create] WARNING: claude setup-token failed (ensure ANTHROPIC_API_KEY is set in Codespaces Secrets)"
  else
    echo "[post-create] Claude Code auth already configured."
  fi

  # --- Initialize Task Master (with rules for Claude + VS Code) ---
  if [ ! -d .taskmaster ]; then
    echo "[post-create] Initializing task-master with Claude + VS Code rules..."
    task-master init --yes --rules claude,vscode
  else
    echo "[post-create] task-master already initialized."
  fi

  # --- Claude Code settings.json ---
  configure_claude_settings

  # --- Generate .mcp.json (project root — for Claude Code CLI) ---
  # NOTE: .mcp.json + enableAllProjectMcpServers=true in settings.json
  # is sufficient — no need for `claude mcp add` which creates duplicate
  # user-level registrations.
  generate_mcp_json

  # --- Generate .vscode/mcp.json (for VS Code / Copilot) ---
  generate_vscode_mcp_json

  # --- CLAUDE.md (native Claude Code project instructions) ---
  generate_claude_md

  # --- CLAUDE_MCP.md (MCP server documentation for Claude context) ---
  generate_claude_mcp_md

  # --- Configure Taskmaster models for claude-code provider ---
  configure_taskmaster_models

  # --- Scaffold PRD for user to edit ---
  scaffold_prd

  # --- Shell environment (deferred MCP loading + boot wrapper) ---
  inject_shell_config

  echo "[post-create] Project configuration complete."
}

# =============================================================================
# Helper: Generate .env file from Codespace secrets (environment variables)
# Runs every session start to keep .env in sync with injected secrets.
# Only writes keys that have non-empty values; never overwrites user edits
# if the values haven't changed.
# =============================================================================
generate_env_file() {
  local ENV_FILE=".env"
  local ENV_TMP=".env.tmp"

  # Build .env content from available environment variables
  {
    echo "# Auto-generated by setup-ai.sh from Codespace secrets"
    echo "# Re-generated each session start. Manual edits will be overwritten."
    echo ""
    [ -n "${ANTHROPIC_API_KEY:-}" ] && echo "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}"
    [ -n "${OPENAI_API_KEY:-}" ] && echo "OPENAI_API_KEY=${OPENAI_API_KEY}"
    [ -n "${PERPLEXITY_API_KEY:-}" ] && echo "PERPLEXITY_API_KEY=${PERPLEXITY_API_KEY}"
    [ -n "${GOOGLE_API_KEY:-}" ] && echo "GOOGLE_API_KEY=${GOOGLE_API_KEY}"
    [ -n "${MISTRAL_API_KEY:-}" ] && echo "MISTRAL_API_KEY=${MISTRAL_API_KEY}"
    [ -n "${XAI_API_KEY:-}" ] && echo "XAI_API_KEY=${XAI_API_KEY}"
    [ -n "${OPENROUTER_API_KEY:-}" ] && echo "OPENROUTER_API_KEY=${OPENROUTER_API_KEY}"
    true  # Ensure block exits 0 under set -e when all vars are empty
  } > "${ENV_TMP}"

  # Only overwrite if content changed
  if [ ! -f "${ENV_FILE}" ] || ! diff -q "${ENV_FILE}" "${ENV_TMP}" >/dev/null 2>&1; then
    mv "${ENV_TMP}" "${ENV_FILE}"
    echo "[post-start] .env updated from environment variables."
  else
    rm -f "${ENV_TMP}"
    echo "[post-start] .env already up-to-date."
  fi
}

# =============================================================================
# Phase 3: post-start — Per-session configuration
# Runs every time the Codespace starts. Shows status & next steps.
# =============================================================================
phase_post_start() {
  echo ""
  echo "=== [post-start] Configuring session ==="

  # Verify models are set (re-apply if config was lost)
  if command -v task-master >/dev/null 2>&1; then
    task-master models --set-main sonnet --set-research sonnet --set-fallback sonnet --claude-code 2>/dev/null || \
      echo "[post-start] WARNING: Failed to set TaskMaster models (check API keys)"
  fi

  # Generate .env from Codespace secrets (environment variables already injected)
  # This allows Task Master CLI and envFile-based VS Code MCP configs to pick up keys.
  generate_env_file

  echo "[post-start] Session ready."

  # --- Welcome Banner ---
  print_welcome_banner
}

# =============================================================================
# Welcome banner — shown on every Codespace start
# Shows task progress and immediate next action for the user.
# =============================================================================
print_welcome_banner() {
  local tasks_file=".taskmaster/tasks/tasks.json"

  echo ""
  echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
  echo "┃                    AI Dev Environment Ready                        ┃"
  echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"

  # Check if tasks exist
  if [ ! -f "${tasks_file}" ]; then
    # No tasks yet — guide user to create PRD
    echo ""
    echo "  No tasks generated yet. Get started:"
    echo ""
    echo "    1. Edit your PRD:     code .taskmaster/docs/prd.md"
    echo "    2. Generate tasks:    task-master parse-prd .taskmaster/docs/prd.md"
    echo "    3. Expand tasks:      task-master expand --all --research"
    echo "    4. Start coding:      claude"
    echo ""
    return 0
  fi

  # Tasks exist — show progress summary
  if command -v task-master >/dev/null 2>&1; then
    local total done_count in_progress pending next_info
    # Use python for reliable JSON parsing (jq not always available)
    if command -v python3 >/dev/null 2>&1; then
      eval "$(python3 -c "
import json, sys
try:
    with open('${tasks_file}') as f:
        data = json.load(f)
    # Handle tagged format (tasks nested under tags)
    tasks = data if isinstance(data, list) else []
    if isinstance(data, dict):
        # Try to find tasks in tagged structure
        for key in ['tasks', 'master']:
            if key in data and isinstance(data[key], list):
                tasks = data[key]
                break
        # Check tags object
        if not tasks and 'tags' in data:
            for tag_data in data['tags'].values():
                if isinstance(tag_data, dict) and 'tasks' in tag_data:
                    tasks = tag_data['tasks']
                    break
    total = len(tasks)
    done = sum(1 for t in tasks if t.get('status') == 'done')
    prog = sum(1 for t in tasks if t.get('status') == 'in-progress')
    pend = sum(1 for t in tasks if t.get('status') == 'pending')
    print(f'total={total}')
    print(f'done_count={done}')
    print(f'in_progress={prog}')
    print(f'pending={pend}')
    # Find next available task (pending, dependencies all done)
    done_ids = {t['id'] for t in tasks if t.get('status') == 'done'}
    for t in sorted(tasks, key=lambda x: (-{'high':3,'medium':2,'low':1}.get(x.get('priority','medium'),2), x.get('id',999))):
        if t.get('status') == 'pending':
            deps = t.get('dependencies', [])
            if all(d in done_ids for d in deps):
                title = t.get('title','')[:45]
                print(f\"next_info=\\\"#{t['id']} {title}\\\"\")
                break
    else:
        print('next_info=\"\"')
except Exception as e:
    print(f'total=0')
    print(f'done_count=0')
    print(f'in_progress=0')
    print(f'pending=0')
    print(f'next_info=\"\"')
    print(f'# Error: {e}', file=sys.stderr)
" 2>/dev/null)"

      echo ""
      if [ "${total:-0}" -gt 0 ]; then
        # Build progress bar
        local pct=0
        if [ "$total" -gt 0 ]; then
          pct=$(( (done_count * 100) / total ))
        fi
        local bar_width=30
        local filled=$(( (pct * bar_width) / 100 ))
        local empty=$(( bar_width - filled ))
        local bar
        bar=$(printf '█%.0s' $(seq 1 "$filled" 2>/dev/null) 2>/dev/null || true)
        bar="${bar}$(printf '░%.0s' $(seq 1 "$empty" 2>/dev/null) 2>/dev/null || true)"

        echo "  Progress: [${bar}] ${pct}%  (${done_count}/${total} tasks done)"
        if [ "${in_progress:-0}" -gt 0 ]; then
          echo "            ${in_progress} in progress, ${pending} pending"
        fi

        if [ -n "${next_info:-}" ]; then
          echo ""
          echo "  Next task: ${next_info}"
          echo ""
          echo "  Resume:  claude                    (agents pick up where you left off)"
          echo "           task-master next           (see next task details)"
        else
          echo ""
          if [ "$done_count" -eq "$total" ]; then
            echo "  All tasks complete! 🎉"
          else
            echo "  Run: task-master next"
          fi
        fi
      else
        echo "  Tasks file exists but appears empty."
        echo "  Run: task-master parse-prd .taskmaster/docs/prd.md"
      fi
    else
      # No python available — simple fallback
      echo ""
      echo "  Tasks file found. Run: task-master list"
    fi
  fi
  echo ""
}

# =============================================================================
# Helper: Claude Code settings.json
# =============================================================================
configure_claude_settings() {
  local CLAUDE_DIR=".claude"
  local SETTINGS_FILE="${CLAUDE_DIR}/settings.json"
  mkdir -p "${CLAUDE_DIR}"

  # Build MCP permission lines dynamically
  local MCP_PERMISSIONS=""
  for mcp_name in "${SELECTED_MCPS[@]}"; do
    local claude_name
    claude_name=$(get_mcp_field "$mcp_name" 3)
    MCP_PERMISSIONS="${MCP_PERMISSIONS}      \"mcp__${claude_name} *\",
"
  done

  # Build enabledMcpjsonServers list
  local MCP_SERVERS_LIST=""
  local first=1
  for mcp_name in "${SELECTED_MCPS[@]}"; do
    local claude_name
    claude_name=$(get_mcp_field "$mcp_name" 3)
    if [ "$first" -eq 1 ]; then
      MCP_SERVERS_LIST="\"${claude_name}\""
      first=0
    else
      MCP_SERVERS_LIST="${MCP_SERVERS_LIST},
    \"${claude_name}\""
    fi
  done

  cat > "${SETTINGS_FILE}" << SETTINGS_EOF
{
  "permissions": {
    "allow": [
      "Edit",
      "Bash(task-master *)",
      "Bash(git *)",
      "Bash(npm *)",
      "Bash(npx *)",
      "Bash(node *)",
      "Bash(mv *)",
      "Bash(rm *)",
      "Bash(cp *)",
      "Bash(mkdir *)",
      "Bash(echo *)",
      "Bash(cat *)",
      "Bash(find *)",
      "Bash(grep *)",
      "Bash(ls *)",
      "Bash(head *)",
      "Bash(tail *)",
      "Bash(wc *)",
      "Bash(sort *)",
      "Bash(curl *)",
      "Bash(sqlite3 *)",
${MCP_PERMISSIONS}      "WebFetch"
    ]
  },
  "enableAllProjectMcpServers": true,
  "enabledMcpjsonServers": [
    ${MCP_SERVERS_LIST}
  ]
}
SETTINGS_EOF

  chmod 644 "${SETTINGS_FILE}" 2>/dev/null || true
  echo "[post-create] Claude Code settings.json configured (${#SELECTED_MCPS[@]} MCPs)."
}

# =============================================================================
# Helper: Generate .mcp.json (project root — Claude Code CLI reads this)
# Claude Code uses { "mcpServers": { ... } } format with "type": "stdio".
# API keys are picked up from environment (Codespaces Secrets / .env).
# =============================================================================
generate_mcp_json() {
  local MCP_FILE=".mcp.json"

  echo "[post-create] Generating ${MCP_FILE} (Claude Code CLI)..."

  # Build servers JSON
  local servers_json=""
  local first=1

  for mcp_name in "${SELECTED_MCPS[@]}"; do
    local npm_pkg claude_name
    npm_pkg=$(get_mcp_field "$mcp_name" 2)
    claude_name=$(get_mcp_field "$mcp_name" 3)

    local server_block=""
    if [ "$mcp_name" = "taskmaster" ]; then
      server_block="    \"${claude_name}\": {
      \"type\": \"stdio\",
      \"command\": \"npx\",
      \"args\": [\"-y\", \"${npm_pkg}\"],
      \"env\": {
        \"TASK_MASTER_TOOLS\": \"all\"
      }
    }"
    else
      server_block="    \"${claude_name}\": {
      \"type\": \"stdio\",
      \"command\": \"npx\",
      \"args\": [\"-y\", \"${npm_pkg}\"]
    }"
    fi

    if [ "$first" -eq 1 ]; then
      servers_json="${server_block}"
      first=0
    else
      servers_json="${servers_json},
${server_block}"
    fi
  done

  cat > "${MCP_FILE}" << MCPEOF
{
  "mcpServers": {
${servers_json}
  }
}
MCPEOF

  echo "[post-create] ${MCP_FILE} created."
}

# =============================================================================
# Helper: Generate .vscode/mcp.json (VS Code / Copilot MCP config)
# VS Code uses { "servers": { ... } } format (not "mcpServers").
# API keys use ${env:VAR_NAME} syntax to reference Codespaces Secrets.
# =============================================================================
generate_vscode_mcp_json() {
  local VSCODE_DIR=".vscode"
  local VSCODE_MCP_FILE="${VSCODE_DIR}/mcp.json"
  mkdir -p "${VSCODE_DIR}"

  echo "[post-create] Generating ${VSCODE_MCP_FILE} (VS Code / Copilot)..."

  local servers_json=""
  local first=1

  for mcp_name in "${SELECTED_MCPS[@]}"; do
    local npm_pkg claude_name
    npm_pkg=$(get_mcp_field "$mcp_name" 2)
    claude_name=$(get_mcp_field "$mcp_name" 3)

    local server_block=""
    if [ "$mcp_name" = "taskmaster" ]; then
      server_block="    \"${claude_name}\": {
      \"command\": \"npx\",
      \"args\": [\"-y\", \"${npm_pkg}\"],
      \"cwd\": \"\${workspaceFolder}\",
      \"envFile\": \"\${workspaceFolder}/.env\",
      \"env\": {
        \"TASK_MASTER_TOOLS\": \"all\",
        \"TASK_MASTER_PROJECT_ROOT\": \"\${workspaceFolder}\",
        \"ANTHROPIC_API_KEY\": \"\${env:ANTHROPIC_API_KEY}\",
        \"PERPLEXITY_API_KEY\": \"\${env:PERPLEXITY_API_KEY}\",
        \"OPENAI_API_KEY\": \"\${env:OPENAI_API_KEY}\"
      },
      \"type\": \"stdio\"
    }"
    else
      server_block="    \"${claude_name}\": {
      \"command\": \"npx\",
      \"args\": [\"-y\", \"${npm_pkg}\"],
      \"cwd\": \"\${workspaceFolder}\",
      \"type\": \"stdio\"
    }"
    fi

    if [ "$first" -eq 1 ]; then
      servers_json="${server_block}"
      first=0
    else
      servers_json="${servers_json},
${server_block}"
    fi
  done

  cat > "${VSCODE_MCP_FILE}" << VSCMCPEOF
{
  "servers": {
${servers_json}
  }
}
VSCMCPEOF

  echo "[post-create] ${VSCODE_MCP_FILE} created."
}

# =============================================================================
# Helper: Configure Taskmaster models — use claude-code provider
# Uses Claude CLI's OAuth token, so no separate ANTHROPIC_API_KEY needed
# for task-master AI operations.
# =============================================================================
configure_taskmaster_models() {
  if ! command -v task-master >/dev/null 2>&1; then
    echo "[post-create] WARNING: task-master not found, skipping model config."
    return 0
  fi

  echo "[post-create] Configuring Taskmaster models (claude-code provider)..."
  task-master models --set-main sonnet --set-research sonnet --set-fallback sonnet --claude-code 2>/dev/null || \
    echo "[post-create] WARNING: Failed to set Taskmaster models."
}

# =============================================================================
# Helper: Scaffold PRD — copy example template to ready-to-edit location
# Creates .taskmaster/docs/prd.md from the example template so the user
# can open it, write their requirements, and run parse-prd immediately.
# =============================================================================
scaffold_prd() {
  local PRD_DIR=".taskmaster/docs"
  local PRD_FILE="${PRD_DIR}/prd.md"
  local TEMPLATE_DIR=".taskmaster/templates"
  local BASIC_TEMPLATE="${TEMPLATE_DIR}/example_prd.txt"

  if [ -f "${PRD_FILE}" ]; then
    echo "[post-create] PRD already exists at ${PRD_FILE}, skipping scaffold."
    return 0
  fi

  mkdir -p "${PRD_DIR}"

  if [ -f "${BASIC_TEMPLATE}" ]; then
    # Copy template and prepend helpful instructions
    cat > "${PRD_FILE}" << 'PRD_HEADER'
# Product Requirements Document (PRD)
#
# Edit this file with your project requirements, then run:
#
#   task-master parse-prd .taskmaster/docs/prd.md
#
# Tips:
#   - Be specific about tech stack, libraries, and frameworks
#   - Define clear features with acceptance criteria
#   - Task Master will fill in implementation gaps you don't specify
#   - For complex projects, consider using the RPG template instead:
#     cp .taskmaster/templates/example_prd_rpg.txt .taskmaster/docs/prd.md
#
# ─────────────────────────────────────────────────────────────────

PRD_HEADER
    cat "${BASIC_TEMPLATE}" >> "${PRD_FILE}"
    echo "[post-create] PRD scaffold created at ${PRD_FILE}"
  else
    # No template available — create a minimal scaffold
    cat > "${PRD_FILE}" << 'PRD_MINIMAL'
# Product Requirements Document (PRD)
#
# Edit this file with your project requirements, then run:
#
#   task-master parse-prd .taskmaster/docs/prd.md
#

<context>
# Overview
[What does your product do? What problem does it solve? Who is it for?]

# Core Features
[List your main features. For each: what it does, why it matters, how it works.]

# User Experience
[User personas, key flows, UI/UX considerations.]
</context>

<PRD>
# Technical Architecture
[System components, data models, APIs, infrastructure, tech stack.]

# Development Roadmap
[Break development into phases. Focus on scope, not timelines.]
[Phase 1: MVP — what's the minimum to be usable?]
[Phase 2: Enhancements — what comes next?]

# Logical Dependency Chain
[Which features must be built first? What's the foundation?]
[Goal: get to something visible and usable as fast as possible.]

# Risks and Mitigations
[Technical challenges, unknowns, resource constraints.]
</PRD>
PRD_MINIMAL
    echo "[post-create] PRD scaffold created at ${PRD_FILE} (minimal template)"
  fi
}

# =============================================================================
# CLAUDE.md — Native Claude Code project instructions
# Uses the @import syntax to pull in Task Master's auto-generated instructions
# from .taskmaster/CLAUDE.md (created by task-master init --rules claude).
# =============================================================================
generate_claude_md() {
  local CLAUDE_MD_FILE="CLAUDE.md"

  if [ -f "${CLAUDE_MD_FILE}" ] && grep -q "SETUP-AI-MANAGED" "${CLAUDE_MD_FILE}" 2>/dev/null; then
    echo "[post-create] CLAUDE.md already configured."
    return 0
  fi

  echo "[post-create] Creating CLAUDE.md..."

  cat > "${CLAUDE_MD_FILE}" << 'CLAUDE_MD_EOF'
<!-- SETUP-AI-MANAGED — regenerated by setup-ai.sh -->

# Project Instructions for Claude Code

## Task Master AI Instructions

**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

## Agent Coordination System

When working with tasks via Task Master (MCP), use the three-tier agent system:

- **task-orchestrator**: Analyzes dependencies, identifies parallel work, deploys executors for available tasks, monitors progress.
- **task-executor**: Implements specific tasks/subtasks. Marks work as `review` after completing implementation and self-checks.
- **task-checker**: Quality gate — verifies implementation, tests, and requirements before transitioning `review` → `done`.

## Dependency & Library Management

When installing or adding **any** npm package, pip package, or other dependency:

1. **Prefer `@latest` / no pinned version** — use `npm install <pkg>@latest` (or the equivalent `pip install <pkg>` without version pin) rather than hard-coding a specific version number that may be outdated.
2. **Verify current versions before pinning** — if a specific version IS required (e.g. peer dependency compatibility), use one of these strategies **before** writing the version string:
   - Use the **Context7 MCP** (`resolve-library-id` → `get-library-docs`) to look up current docs and version info.
   - Use **WebFetch** to check the npm registry (`https://registry.npmjs.org/<pkg>/latest`) or PyPI (`https://pypi.org/pypi/<pkg>/json`).
   - Run `npm view <pkg> version` or `pip index versions <pkg>` in the shell.
3. **Never guess versions from training data** — training data is stale. Always confirm via a live lookup.
4. **Lock files are source of truth** — after installing, let `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml` capture the resolved version. Do not manually edit lock files.
5. **Update `package.json` ranges sensibly** — prefer caret ranges (`^`) for libraries, exact versions for critical tooling.

## Task Completion Quality Gate

**Before marking ANY task or subtask as `done` (or transitioning to `review`), you MUST complete ALL of the following steps in order.** Do not skip steps. If any step fails, fix the issue and re-run from that step.

### Mandatory Pre-Completion Checklist

1. **Format / Prettify** — Run the project's configured formatter:
   - `npm run format` or `npx prettier --write .` (JS/TS projects)
   - `black .` or `ruff format .` (Python projects)
   - If no formatter is configured, skip but note it in the subtask update.
2. **Lint** — Run the project's linter and fix all errors (warnings are acceptable):
   - `npm run lint` or `npx eslint . --fix` (JS/TS)
   - `ruff check --fix .` or `flake8` (Python)
3. **Type-check** (if applicable):
   - `npm run typecheck` or `npx tsc --noEmit` (TypeScript projects)
   - `mypy .` or `pyright` (typed Python)
4. **Build** — Run the project's build command and verify zero errors:
   - `npm run build` (JS/TS)
   - `python -m build` or equivalent (Python)
   - If the project has no build step, skip.
5. **Test** — Run the full test suite (or at minimum, tests related to changed files):
   - `npm test` / `npm run test` (JS/TS)
   - `pytest` / `python -m pytest` (Python)
   - If no tests exist yet, write at least basic tests for the implemented functionality before proceeding.
6. **Fix any failures** — If any of steps 1–5 produce errors, fix them and re-run from the failed step.
7. **Log findings** — Use `update_subtask` to record what was done, any issues found and fixed, and confirmation that all checks passed.

### Only Then:
- Call `set_task_status --status=done` (or `--status=review` if using the checker workflow).
- If you cannot make all checks pass, set status to `blocked` and explain the blocker in the subtask update.

> **Rationale:** Code that doesn't format, build, or pass tests is not done. The task-checker agent will reject it anyway — save time by self-checking first.

## Workflow Rules

1. Confirm with the user before proceeding to the next top-level parent task.
2. Use `/clear` between different parent tasks to maintain focus.
3. When starting a new parent task, list its subtasks first. If none exist, call `expand_task` with `--research` flag.
4. On first interaction, confirm which agent to use and ask if the user wants to see current task state.
5. Use `update_subtask` to log implementation findings and progress as you work.

## MCP Servers

@CLAUDE_MCP.md

## Quick Reference

- `task-master list` / MCP `get_tasks` — View all tasks and status
- `task-master next` / MCP `next_task` — Get the next actionable task
- `task-master show <id>` / MCP `get_task` — View task details
- `task-master expand --id=<id> --research` / MCP `expand_task` — Break down a task
- `task-master set-status --id=<id> --status=done` / MCP `set_task_status` — Mark complete
- `task-master update-subtask --id=<id> --prompt="..."` / MCP `update_subtask` — Log progress
CLAUDE_MD_EOF

  echo "[post-create] CLAUDE.md created."
}

# =============================================================================
# CLAUDE_MCP.md — MCP server documentation (dynamically generated)
# =============================================================================
generate_claude_mcp_md() {
  echo "[post-create] Generating CLAUDE_MCP.md..."

  # Header
  echo "# MCP Servers Available" > CLAUDE_MCP.md
  echo "" >> CLAUDE_MCP.md

  # Add documentation for each selected MCP
  if is_mcp_selected "taskmaster"; then
    cat >> CLAUDE_MCP.md << 'MCP_TM_EOF'
## Task Master AI (`taskmaster-ai`)

Task orchestration, dependency tracking, and multi-agent coordination.

**Key Tools:** `get_tasks`, `next_task`, `get_task`, `expand_task`, `set_task_status`, `update_subtask`, `update_task`, `research`, `models`, `parse_prd`, `analyze_project_complexity`, `add_task`, `add_subtask`

Manages task state in `.taskmaster/tasks/tasks.json`. Use `expand_task --research` before starting new parent tasks.

**Tool tier**: `all` (full feature set — 44+ tools including tags, dependencies, research, and autopilot).

MCP_TM_EOF
  fi

  if is_mcp_selected "context7"; then
    cat >> CLAUDE_MCP.md << 'MCP_CTX_EOF'
## Context7 (`context7`)

Provides up-to-date library documentation and code examples directly in your development workflow.

**Key Tools:** `resolve-library-id`, `get-library-docs`

Use to look up current API docs for any library — always get accurate, version-specific documentation rather than relying on training data.

MCP_CTX_EOF
  fi

  if is_mcp_selected "browsermcp"; then
    cat >> CLAUDE_MCP.md << 'MCP_BROWSER_EOF'
## BrowserMCP (`browsermcp`)

Browser automation for testing and interaction. Controls headless browsers, fills forms, clicks elements, takes screenshots.

**Key Tools:** `browser_navigate`, `browser_fill`, `browser_click`, `browser_screenshot`, `browser_wait`

MCP_BROWSER_EOF
  fi

  if is_mcp_selected "sequential-thinking"; then
    cat >> CLAUDE_MCP.md << 'MCP_SEQ_EOF'
## Sequential Thinking (`sequential-thinking`)

Dynamic problem-solving through thought sequences. Useful for complex reasoning, planning, and analysis tasks that benefit from step-by-step thinking.

**Key Tools:** `sequentialthinking`

Use when facing complex problems that need structured, multi-step reasoning.

MCP_SEQ_EOF
  fi

  echo "[post-create] CLAUDE_MCP.md created."
}

# =============================================================================
# Devcontainer generator — creates .devcontainer/devcontainer.json
# =============================================================================
generate_devcontainer() {
  if [ -f .devcontainer/devcontainer.json ]; then
    echo "[setup-ai] .devcontainer/devcontainer.json already exists, skipping."
    echo "[setup-ai]   To regenerate: rm -rf .devcontainer/"
    return 0
  fi

  echo "[setup-ai] Creating .devcontainer/devcontainer.json..."
  mkdir -p .devcontainer

  cat > .devcontainer/devcontainer.json << 'DEVCONTAINER_EOF'
{
  "name": "AI Dev Environment",
  "image": "mcr.microsoft.com/devcontainers/universal:2",

  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "lts"
    }
  },

  "onCreateCommand": "bash setup-ai.sh on-create",
  "postCreateCommand": "bash setup-ai.sh post-create",
  "postStartCommand": "bash setup-ai.sh post-start",
  "postAttachCommand": "echo '[setup-ai] VS Code attached — MCP servers should be available in Copilot Chat'",

  "secrets": {
    "ANTHROPIC_API_KEY": {
      "description": "Required for Claude Code & Task Master AI operations",
      "documentationUrl": "https://console.anthropic.com/settings/keys"
    },
    "OPENAI_API_KEY": {
      "description": "Optional: enables OpenAI models in Task Master",
      "documentationUrl": "https://platform.openai.com/api-keys"
    },
    "PERPLEXITY_API_KEY": {
      "description": "Optional: enables Task Master --research flag for web search",
      "documentationUrl": "https://www.perplexity.ai/settings/api"
    },
    "GOOGLE_API_KEY": {
      "description": "Optional: enables Google Gemini models",
      "documentationUrl": "https://aistudio.google.com/app/apikey"
    }
  },

  "containerEnv": {
    "ANTHROPIC_API_KEY": "${localEnv:ANTHROPIC_API_KEY}",
    "OPENAI_API_KEY": "${localEnv:OPENAI_API_KEY}",
    "PERPLEXITY_API_KEY": "${localEnv:PERPLEXITY_API_KEY}",
    "GOOGLE_API_KEY": "${localEnv:GOOGLE_API_KEY}"
  },

  "remoteEnv": {
    "ANTHROPIC_API_KEY": "${localEnv:ANTHROPIC_API_KEY}",
    "OPENAI_API_KEY": "${localEnv:OPENAI_API_KEY}",
    "PERPLEXITY_API_KEY": "${localEnv:PERPLEXITY_API_KEY}",
    "GOOGLE_API_KEY": "${localEnv:GOOGLE_API_KEY}"
  },

  "customizations": {
    "vscode": {
      "extensions": [
        "github.copilot",
        "github.copilot-chat"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "chat.mcp.discovery.enabled": {
          "claude": true
        },
        "chat.mcp.access": "all"
      }
    }
  }
}
DEVCONTAINER_EOF

  echo "[setup-ai] .devcontainer/devcontainer.json created."
}

# =============================================================================
# Shell config — deferred MCP loading + optional boot wrapper
# =============================================================================
inject_shell_config() {
  local CLAUDE_RC="$HOME/.bashrc"
  local BLOCK_START="# >>> CLAUDE_AI_ENV START >>>"
  local BLOCK_END="# <<< CLAUDE_AI_ENV END <<<"

  echo "[post-create] Configuring shell environment..."

  local shell_content
  shell_content=$(cat << 'SHELL_EOF'
# >>> CLAUDE_AI_ENV START >>>
# AI Development Environment — injected by setup-ai.sh

# Enable deferred MCP loading for Claude Code (reduces startup token overhead)
export ENABLE_EXPERIMENTAL_MCP_CLI=true

# Fix EXDEV (cross-device link) errors in Codespaces / containers.
# Claude Code plugin install uses os.tmpdir() + rename() which fails when /tmp
# is on a different filesystem (e.g. /dev/sda1) than ~/.claude (overlay).
# Setting TMPDIR to a dir on the same filesystem as ~/.claude fixes this.
if [ -d "$HOME/.claude" ]; then
  _claude_tmp="$HOME/.claude/tmp"
  mkdir -p "$_claude_tmp" 2>/dev/null
  if [ -d "$_claude_tmp" ]; then
    export TMPDIR="$_claude_tmp"
  fi
  unset _claude_tmp
fi

# Claude CLI wrapper — optional interactive prompt for boot guidance.
# CLAUDE.md provides native guidance automatically; this is a convenience layer.
#
# Env overrides:
#   CLAUDE_BOOT_DISABLE=1  -> never prompt
#   CLAUDE_BOOT_AUTO=1     -> auto-show guidance (no prompt)
#   CLAUDE_BOOT_VERBOSE=1  -> debug output
#   CLAUDE_BOOT_PROMPT_FILE -> override guidance file path
#
claude() {
  local real
  real="$(command -v claude 2>/dev/null || command -v claude-code 2>/dev/null || true)"
  if [ -z "$real" ]; then
    echo "Claude CLI not installed yet." >&2
    return 1
  fi

  # Pass through if arguments supplied
  if [ $# -gt 0 ]; then
    [ "${CLAUDE_BOOT_VERBOSE:-0}" = "1" ] && echo "[claude-wrapper] args -> pass through" >&2
    command "$real" "$@"; return $?
  fi

  # Disabled check
  if [ "${CLAUDE_BOOT_DISABLE:-0}" = "1" ]; then
    command "$real"; return $?
  fi

  local repo_root boot_file show=0
  repo_root="${CLAUDE_REPO_ROOT_OVERRIDE:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
  boot_file="${CLAUDE_BOOT_PROMPT_FILE:-$repo_root/.claude/boot-prompt.txt}"

  if [ "${CLAUDE_BOOT_AUTO:-0}" = "1" ]; then
    show=1
  elif [ -t 0 ] && [ -t 1 ]; then
    printf "Load Claude boot guidance? [Y/n] "
    local ans; read -r ans
    case "$ans" in [nN]*) show=0 ;; *) show=1 ;; esac
  fi

  if [ $show -eq 1 ] && [ -f "$boot_file" ]; then
    command "$real" "$(cat "$boot_file")"; return $?
  fi

  # Fallback: launch claude normally
  command "$real"; return $?
}
# <<< CLAUDE_AI_ENV END <<<
SHELL_EOF
  )

  if grep -q "$BLOCK_START" "$CLAUDE_RC" 2>/dev/null; then
    # Replace existing block
    local tmpfile
    tmpfile="$(mktemp)"
    awk -v start="$BLOCK_START" -v end="$BLOCK_END" '
      BEGIN{skip=0}
      index($0,start){skip=1; next}
      index($0,end){skip=0; next}
      !skip{print}
    ' "$CLAUDE_RC" > "$tmpfile"
    echo "$shell_content" >> "$tmpfile"
    mv "$tmpfile" "$CLAUDE_RC"
    echo "[post-create] Updated shell environment block."
  else
    echo "$shell_content" >> "$CLAUDE_RC"
    echo "[post-create] Added shell environment to ~/.bashrc."
  fi

  # Generate boot prompt file
  generate_boot_prompt
}

# =============================================================================
# Boot prompt — used by the optional bashrc wrapper
# =============================================================================
generate_boot_prompt() {
  local BOOT_PROMPT_FILE=".claude/boot-prompt.txt"
  local BOOT_PROMPT_TMP="${BOOT_PROMPT_FILE}.tmp"
  mkdir -p .claude

  cat > "${BOOT_PROMPT_TMP}" << 'BOOT_EOF'
When working with tasks via Task Master (MCP), use the three-tier agent system:
- task-orchestrator: analyzes dependencies, identifies parallel work, deploys executors
- task-executor: implements specific tasks/subtasks, marks as review when done
- task-checker: quality gate, verifies implementation before marking done

REMINDER — Before marking ANY task done:
  1. Format/prettify → 2. Lint → 3. Type-check → 4. Build → 5. Test → 6. Fix failures
  Only mark done when ALL checks pass. See CLAUDE.md "Task Completion Quality Gate" for details.

REMINDER — When adding dependencies:
  Use @latest or verify current version via Context7/WebFetch/npm-view. Never guess from training data.

Confirm with the user before proceeding to the next parent task. Use /clear between parent tasks.
If no subtasks exist, call expand_task with --research flag first.

Don't start anything yet — confirm which agent to use and ask if the user wants current task state.
BOOT_EOF

  if [ ! -f "${BOOT_PROMPT_FILE}" ] || ! diff -q "${BOOT_PROMPT_FILE}" "${BOOT_PROMPT_TMP}" >/dev/null 2>&1; then
    mv "${BOOT_PROMPT_TMP}" "${BOOT_PROMPT_FILE}"
    echo "[post-create] Updated boot prompt."
  else
    rm -f "${BOOT_PROMPT_TMP}"
    echo "[post-create] Boot prompt already up-to-date."
  fi
}

# =============================================================================
# Next steps — printed after full first-time setup
# =============================================================================
print_next_steps() {
  local claude_ver task_master_ver
  claude_ver=$(claude --version 2>/dev/null || echo '(pending)')
  task_master_ver=$(task-master --version 2>/dev/null || echo '(pending)')

  echo ""
  echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
  echo "┃           AI Development Environment — Setup Complete              ┃"
  echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
  echo ""
  echo "  Installed:  Claude Code ${claude_ver}  |  Task Master ${task_master_ver}"
  echo ""
  echo "  MCP Servers:"
  for mcp_name in "${SELECTED_MCPS[@]}"; do
    local claude_name
    claude_name=$(get_mcp_field "$mcp_name" 3)
    echo "    ✓ ${claude_name}"
  done

  # --- Required: API Keys ---
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  REQUIRED: Configure Codespaces Secrets"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "  Go to: https://github.com/settings/codespaces"
  echo "  (or: Repo Settings → Secrets and variables → Codespaces)"
  echo ""
  echo "  Add these secrets:"
  echo "    ANTHROPIC_API_KEY    Required — Claude Code & Task Master"
  echo "    OPENAI_API_KEY       Optional — OpenAI models"
  echo "    PERPLEXITY_API_KEY   Optional — Task Master --research flag"
  echo "    GOOGLE_API_KEY       Optional — Google Gemini models"
  echo ""
  echo "  Then rebuild the Codespace to pick them up."

  # --- Quick Start Workflow ---
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  QUICK START — From Idea to Agents Coding"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "  STEP 1: Write your Product Requirements Document (PRD)"
  echo ""
  if [ -f ".taskmaster/docs/prd.md" ]; then
    echo "    → Your PRD is ready to edit at:  .taskmaster/docs/prd.md"
  else
    echo "    → A template has been prepared at:  .taskmaster/docs/prd.md"
  fi
  echo "    → Example templates in:  .taskmaster/templates/"
  echo "    → Tip: For complex projects, use the RPG template"
  echo "         (example_prd_rpg.txt — based on Microsoft Research methodology)"
  echo ""
  echo "    Open and edit your PRD:"
  echo "      code .taskmaster/docs/prd.md"
  echo ""
  echo "  STEP 2: Generate tasks from your PRD"
  echo ""
  echo "      task-master parse-prd .taskmaster/docs/prd.md"
  echo ""
  echo "    Options:"
  echo "      --num-tasks 15     Generate ~15 top-level tasks (default: 10)"
  echo "      --research         Use Perplexity AI for research-backed generation"
  echo "      --force            Overwrite existing tasks without confirmation"
  echo ""
  echo "  STEP 3: Analyze complexity & break down tasks"
  echo ""
  echo "      task-master analyze-complexity --research"
  echo "      task-master expand --all --research"
  echo ""
  echo "  STEP 4: Start the agents"
  echo ""
  echo "    Option A — Interactive (recommended):"
  echo "      claude"
  echo "      → The orchestrator will find the next task and begin"
  echo ""
  echo "    Option B — See what's next first:"
  echo "      task-master next"
  echo "      task-master show <id>"
  echo "      claude"
  echo ""
  echo "    Option C — Headless (fully automated, sandboxed environments only):"
  echo "      claude -p --dangerously-skip-permissions \\"
  echo "        \"Get the next task with task-master, then implement it\""

  # --- Key Commands ---
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  KEY COMMANDS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "  Planning:"
  echo "    task-master list                  View all tasks & status"
  echo "    task-master next                  Get next actionable task"
  echo "    task-master show <id>             View task details"
  echo "    task-master expand --id=<id>      Break down a task into subtasks"
  echo ""
  echo "  Working:"
  echo "    task-master set-status --id=<id> --status=in-progress"
  echo "    task-master update-subtask --id=<id> --prompt=\"findings...\""
  echo "    task-master set-status --id=<id> --status=done"
  echo ""
  echo "  Research:"
  echo "    task-master research \"How to implement X?\""
  echo "    task-master research \"Best practices for Y\" --save-to=<id>"
  echo ""
  echo "  In Claude Code (via MCP — same commands, different interface):"
  echo "    \"Get my tasks\"           → calls get_tasks"
  echo "    \"What's next?\"           → calls next_task"
  echo "    \"Expand task 5\"          → calls expand_task"

  # --- Optional Extras ---
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  OPTIONAL EXTRAS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "  Codespace Prebuilds (faster startup):"
  echo "    Repo Settings → Codespaces → Set up prebuilds"
  echo ""
  echo "  Claude Code Plugin (49 slash commands + 3 AI agents):"
  echo "    In Claude Code run:"
  echo "      /plugin marketplace add eyaltoledano/claude-task-master"
  echo "      /plugin install taskmaster@taskmaster"
  echo ""
  echo "  Commit to your repo:"
  echo "    git add setup-ai.sh .devcontainer/ .mcp.json .vscode/mcp.json"
  echo "    git add CLAUDE.md CLAUDE_MCP.md .claude/ .taskmaster/ .env.example"
  echo "    git commit -m \"chore: add AI dev environment bootstrap\""
  echo ""
}

# =============================================================================
# Main dispatcher
# =============================================================================
case "${1:-}" in
  on-create)
    phase_on_create
    ;;
  post-create)
    # In devcontainer lifecycle, resolve MCP selection:
    # 1. SETUP_AI_MCPS env var (highest priority — can be set in devcontainer remoteEnv)
    # 2. .setup-ai-mcps file (saved from interactive first-time setup)
    # 3. Default: all MCPs
    if [ -n "${SETUP_AI_MCPS:-}" ]; then
      IFS=',' read -ra SELECTED_MCPS <<< "${SETUP_AI_MCPS}"
      echo "[post-create] Using MCPs from SETUP_AI_MCPS env: ${SETUP_AI_MCPS}"
    elif [ -f ".setup-ai-mcps" ]; then
      SETUP_AI_MCPS=$(cat .setup-ai-mcps)
      IFS=',' read -ra SELECTED_MCPS <<< "${SETUP_AI_MCPS}"
      echo "[post-create] Using MCPs from .setup-ai-mcps: ${SETUP_AI_MCPS}"
    else
      for entry in "${MCP_REGISTRY[@]}"; do
        IFS='|' read -r name _ _ _ _ <<< "$entry"
        SELECTED_MCPS+=("$name")
      done
      echo "[post-create] No MCP selection found, defaulting to all."
    fi

    # Validate selected MCPs against registry
    validate_selected_mcps

    phase_post_create
    ;;
  post-start)
    phase_post_start
    ;;
  *)
    echo "============================================="
    echo "  AI Development Environment Setup"
    echo "============================================="
    echo ""

    # Interactive MCP selection
    select_mcps

    # Validate selections against registry
    validate_selected_mcps

    # Save selections for devcontainer lifecycle reuse
    local_mcps=$(IFS=','; echo "${SELECTED_MCPS[*]}")
    echo "${local_mcps}" > .setup-ai-mcps

    echo "[setup-ai] Running full first-time setup..."

    # Generate devcontainer for future rebuilds
    generate_devcontainer

    # Run all three phases in order
    phase_on_create
    phase_post_create
    phase_post_start

    # Show user what to do next
    print_next_steps
    ;;
esac
