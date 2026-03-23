# My Figma MCP Environment Setup

This document describes my exact working setup for the `cursor-talk-to-figma-mcp` project so Claude Code can replicate it on a new device.

## Prerequisites

Install these first:

| Tool | Version | Install |
|------|---------|---------|
| Node.js | v24.13.0 | https://nodejs.org/ |
| npm | 11.6.2 | Comes with Node.js |
| Bun | 1.3.10+ | `npm install -g bun` (installed globally via npm) |
| Claude Code | 2.1.70+ | `npm install -g @anthropic-ai/claude-code` |
| Figma Desktop | Latest | https://www.figma.com/downloads/ |

## Step 1: Clone the repo

```bash
git clone https://github.com/kambar231/claude_figma.git
cd claude_figma
```

## Step 2: Install dependencies and build

```bash
bun install
bun run build
```

## Step 3: Configure Claude Code settings

Create/update `~/.claude/settings.json`:

```json
{
  "autoUpdatesChannel": "latest",
  "skipDangerousModePermissionPrompt": true,
  "effortLevel": "max",
  "enabledPlugins": {
    "figma@claude-plugins-official": true
  }
}
```

## Step 4: Install the Figma plugin for Claude Code

From the Claude Code CLI:

```bash
claude plugin install figma@claude-plugins-official
```

This installs the official Figma plugin (v1.2.0) which provides `mcp__figma__download_figma_images` and `mcp__figma__get_figma_data` tools.

## Step 5: Configure the TalkToFigma MCP server

The project has a `.mcp.json` in the repo root that Claude Code picks up automatically:

```json
{
  "mcpServers": {
    "TalkToFigma": {
      "command": "bunx",
      "args": ["cursor-talk-to-figma-mcp@latest"]
    }
  }
}
```

This file is already committed. If it's missing, run:

```bash
bun setup
```

Or add it manually:

```bash
claude mcp add TalkToFigma -- bunx cursor-talk-to-figma-mcp@latest
```

## Step 6: Set up the Figma plugin inside Figma

1. Open Figma Desktop
2. Go to **Plugins > Development > Import plugin from manifest...**
3. Navigate to `src/cursor_mcp_plugin/manifest.json` in this repo
4. The plugin "Cursor Talk to Figma" will appear under Development plugins

## Step 7: Running it all

You need three things running simultaneously:

### Terminal 1: WebSocket relay server
```bash
bun socket
```
This starts the relay on `localhost:3055`.

### Terminal 2: Claude Code (or Cursor)
```bash
claude
```
Claude Code auto-discovers the MCP server from `.mcp.json` in the project root.

### Figma
1. Open your Figma file
2. Run the "Cursor Talk to Figma" plugin (Plugins > Development > Cursor Talk to Figma)
3. The plugin UI shows a WebSocket connection panel
4. It auto-connects to `ws://localhost:3055`
5. Join a channel (note the channel name)
6. In Claude Code, use the `join_channel` tool with the same channel name

## Architecture Recap

```
Claude Code ←(stdio)→ MCP Server ←(WebSocket)→ Relay (port 3055) ←(WebSocket)→ Figma Plugin
```

- **MCP Server**: Published npm package (`cursor-talk-to-figma-mcp`), exposes 50+ Figma tools
- **WebSocket Relay**: `src/socket.ts`, routes messages between MCP server and Figma plugin via channels
- **Figma Plugin**: `src/cursor_mcp_plugin/`, runs inside Figma, executes commands on the canvas

## Claude Code Rules & Agents (optional)

My setup also includes custom rules and agents in `~/.claude/rules/` and `~/.claude/agents/`. These are general-purpose (not Figma-specific) and cover coding style, testing, security, and agent orchestration. They are documented in the repo's `CLAUDE.md` and the rules files themselves. To replicate:

```bash
# Copy the rules directory structure
~/.claude/rules/
  common/     # agents.md, coding-style.md, git-workflow.md, hooks.md, patterns.md, performance.md, security.md, testing.md, user-preferences.md
  typescript/ # coding-style.md, hooks.md, patterns.md, security.md, testing.md
  python/     # coding-style.md, hooks.md, patterns.md, security.md, testing.md
```

These are checked into the `claude_figma` repo under their respective paths if you want to copy them, or you can skip them for a minimal Figma-only setup.

## Quick Verification

Once everything is running, test in Claude Code:

```
> join channel "test-channel"     # joins the WebSocket channel
> get_document_info               # should return current Figma document info
```

If both commands succeed, the full pipeline is working.
