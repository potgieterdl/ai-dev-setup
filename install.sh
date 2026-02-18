#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# AI Dev Setup — Bootstrap Installer
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/potgieterdl/ai-dev-setup/main/install.sh | bash
#
# What it does:
#   1. Ensures Node.js >= 20 is available (installs via fnm if missing)
#   2. Clones or updates the repo to ~/.ai-dev-setup (or $AI_HELPER_HOME)
#   3. Installs dependencies and builds
#   4. Symlinks 'ai-init' to ~/.local/bin/
#
# Environment:
#   AI_HELPER_HOME   Override install directory (default: ~/.ai-dev-setup)
# =============================================================================

AI_HELPER_HOME="${AI_HELPER_HOME:-$HOME/.ai-dev-setup}"
BIN_DIR="${HOME}/.local/bin"
REPO_URL="https://github.com/potgieterdl/ai-dev-setup.git"
NODE_MIN_VERSION=20

# --- Helpers ---

log()  { echo "[ai-init] $*"; }
pass() { echo "  ✓ $*"; }
fail() { echo "  ✗ $*" >&2; }

# --- Step 1: Ensure Node.js >= $NODE_MIN_VERSION ---

ensure_node() {
  if command -v node &>/dev/null; then
    local version
    version=$(node --version | sed 's/v//' | cut -d. -f1)
    if [ "$version" -ge "$NODE_MIN_VERSION" ]; then
      pass "Node.js $(node --version) found"
      return 0
    fi
    log "Node.js $(node --version) is too old (need >= ${NODE_MIN_VERSION}). Installing newer version via fnm..."
  else
    log "Node.js not found. Installing via fnm..."
  fi

  # Install fnm (fast Node version manager — single binary)
  if ! command -v fnm &>/dev/null; then
    curl -fsSL https://fnm.vercel.app/install | bash -s -- --skip-shell
    export PATH="$HOME/.local/share/fnm:$PATH"
  fi

  eval "$(fnm env)"
  fnm install "$NODE_MIN_VERSION"
  fnm use "$NODE_MIN_VERSION"
  fnm default "$NODE_MIN_VERSION"
  pass "Node.js $(node --version) installed via fnm"
}

# --- Step 2: Clone or update the repository ---

ensure_repo() {
  if [ -d "$AI_HELPER_HOME" ]; then
    if [ ! -d "$AI_HELPER_HOME/.git" ]; then
      # Directory exists but isn't a git repo (e.g. failed previous clone)
      log "Removing incomplete installation at $AI_HELPER_HOME..."
      rm -rf "$AI_HELPER_HOME"
    else
      # Verify the remote points to the correct repo
      local current_remote
      current_remote=$(git -C "$AI_HELPER_HOME" remote get-url origin 2>/dev/null || echo "")
      if [ "$current_remote" != "$REPO_URL" ]; then
        log "Existing repo has wrong remote ($current_remote). Re-cloning..."
        rm -rf "$AI_HELPER_HOME"
      fi
    fi
  fi

  if [ -d "$AI_HELPER_HOME/.git" ]; then
    log "Updating ai-dev-setup..."
    git -C "$AI_HELPER_HOME" pull --ff-only || {
      fail "git pull failed — continuing with existing version"
    }
  else
    log "Cloning ai-dev-setup to $AI_HELPER_HOME..."
    git clone "$REPO_URL" "$AI_HELPER_HOME"
  fi
  pass "Repository ready at $AI_HELPER_HOME"
}

# --- Step 3: Install dependencies and build ---

install_deps() {
  log "Installing dependencies..."
  npm ci --prefix "$AI_HELPER_HOME" --silent 2>/dev/null || \
    npm install --prefix "$AI_HELPER_HOME" --silent
  pass "Dependencies installed"

  log "Building..."
  npm run build --prefix "$AI_HELPER_HOME" --silent
  pass "Build complete"
}

# --- Step 4: Symlink ai-init to PATH ---

setup_bin() {
  mkdir -p "$BIN_DIR"

  # Create presets directory for saved wizard configurations (F18)
  PRESETS_DIR="${HOME}/.ai-dev-setup/presets"
  mkdir -p "${PRESETS_DIR}"
  pass "Created presets directory: ${PRESETS_DIR}"

  # Create a wrapper script rather than symlinking the .js file directly.
  # This ensures node resolves the script correctly regardless of PATH state.
  cat > "$BIN_DIR/ai-init" <<WRAPPER
#!/usr/bin/env bash
exec node "$AI_HELPER_HOME/dist/cli.js" "\$@"
WRAPPER
  chmod +x "$BIN_DIR/ai-init"
  pass "ai-init installed to $BIN_DIR/ai-init"

  # Check if BIN_DIR is in PATH
  if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo ""
    log "Add this to your shell config (~/.bashrc or ~/.zshrc):"
    echo "  export PATH=\"$BIN_DIR:\$PATH\""
  fi
}

# --- Main ---

main() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  AI Dev Setup — Installer"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  ensure_node
  ensure_repo
  install_deps
  setup_bin

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Installation complete!"
  echo "  Run 'ai-init' in any project directory to get started."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

main "$@"
