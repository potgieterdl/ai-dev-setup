import type { ProjectConfig, FileDescriptor } from "../types.js";
import { getSelectedServers } from "../registry.js";

interface DevcontainerSecret {
  description: string;
  documentationUrl?: string;
}

interface DevcontainerConfig {
  name: string;
  image: string;
  features: Record<string, Record<string, string>>;
  onCreateCommand: string;
  postCreateCommand: string;
  postStartCommand: string;
  customizations: {
    vscode: {
      extensions: string[];
    };
  };
  secrets?: Record<string, DevcontainerSecret>;
  containerEnv?: Record<string, string>;
  remoteEnv?: Record<string, string>;
}

/**
 * Build the secrets, containerEnv, and remoteEnv blocks based on selected MCP servers.
 * Each MCP server's env keys become Codespace secrets so users can configure them once
 * and have them available inside the container automatically.
 */
function buildMcpSecrets(config: ProjectConfig): {
  secrets: Record<string, DevcontainerSecret>;
  containerEnv: Record<string, string>;
  remoteEnv: Record<string, string>;
} {
  const secrets: Record<string, DevcontainerSecret> = {};
  const containerEnv: Record<string, string> = {};
  const remoteEnv: Record<string, string> = {};

  // Always include ANTHROPIC_API_KEY for Claude Code
  secrets["ANTHROPIC_API_KEY"] = {
    description: "Anthropic API key for Claude Code",
    documentationUrl: "https://console.anthropic.com/settings/keys",
  };
  containerEnv["ANTHROPIC_API_KEY"] = "${localEnv:ANTHROPIC_API_KEY}";
  remoteEnv["ANTHROPIC_API_KEY"] = "${localEnv:ANTHROPIC_API_KEY}";

  // Add env vars from selected MCP servers
  const servers = getSelectedServers(config.selectedMcps);
  for (const server of servers) {
    for (const key of Object.keys(server.env ?? {})) {
      // Skip ANTHROPIC_API_KEY (already added above) and non-secret values
      if (key === "ANTHROPIC_API_KEY") continue;
      if (!key.endsWith("_KEY") && !key.endsWith("_SECRET") && !key.endsWith("_TOKEN")) continue;

      secrets[key] = {
        description: `${key} for ${server.description.split("—")[0].trim()}`,
      };
      containerEnv[key] = `\${localEnv:${key}}`;
      remoteEnv[key] = `\${localEnv:${key}}`;
    }
  }

  return { secrets, containerEnv, remoteEnv };
}

/**
 * Generate `.devcontainer/devcontainer.json` with lifecycle hooks calling ai-init phases.
 *
 * Pure function — takes ProjectConfig, returns FileDescriptor[].
 * Always returns exactly 1 file descriptor.
 *
 * The lifecycle commands map to the three Codespace lifecycle events:
 *   - onCreateCommand:   heavy installs (npm globals)     → `ai-init on-create`
 *   - postCreateCommand: project config orchestration      → `ai-init post-create`
 *   - postStartCommand:  per-session setup (.env, banner)  → `ai-init post-start`
 *
 * Secrets and env vars are derived from selected MCP servers so that
 * API keys configured as Codespace secrets are forwarded into the container.
 */
export function generateDevcontainer(config: ProjectConfig): FileDescriptor[] {
  const { secrets, containerEnv, remoteEnv } = buildMcpSecrets(config);

  const devcontainer: DevcontainerConfig = {
    name: config.projectName,
    image: "mcr.microsoft.com/devcontainers/universal:2",
    features: {
      "ghcr.io/devcontainers/features/node:1": { version: "20" },
    },
    onCreateCommand: "ai-init on-create",
    postCreateCommand: "ai-init post-create",
    postStartCommand: "ai-init post-start",
    customizations: {
      vscode: {
        extensions: ["GitHub.copilot", "GitHub.copilot-chat"],
      },
    },
  };

  if (Object.keys(secrets).length > 0) {
    devcontainer.secrets = secrets;
  }
  if (Object.keys(containerEnv).length > 0) {
    devcontainer.containerEnv = containerEnv;
  }
  if (Object.keys(remoteEnv).length > 0) {
    devcontainer.remoteEnv = remoteEnv;
  }

  return [
    {
      path: ".devcontainer/devcontainer.json",
      content: JSON.stringify(devcontainer, null, 2),
    },
  ];
}
