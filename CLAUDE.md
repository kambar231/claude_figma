# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP (Model Context Protocol) server that bridges Cursor AI IDE with Figma. Three components communicate in a pipeline:

```
Cursor AI ←(stdio)→ MCP Server ←(WebSocket)→ WebSocket Relay ←(WebSocket)→ Figma Plugin
```

## Build & Development Commands

```bash
bun install              # Install dependencies
bun run build            # Build MCP server (tsup → dist/)
bun run dev              # Build in watch mode
bun socket               # Start WebSocket relay server (port 3055)
bun run start            # Run built MCP server
bun setup                # Full setup (install + write .cursor/mcp.json + .mcp.json)
```

There is no test suite or linter configured.

## Architecture

### MCP Server (`src/talk_to_figma_mcp/server.ts`)
The main server implementing the MCP protocol via `@modelcontextprotocol/sdk`. Exposes 50+ tools (create shapes, modify text, manage layouts, export images, etc.) and several AI prompts (design strategies). Communicates with Cursor over stdio and with the WebSocket relay via `ws`. Each request gets a UUID, is tracked in a `pendingRequests` Map with timeout/promise callbacks, and resolves when the plugin responds.

### WebSocket Relay (`src/socket.ts`)
Lightweight Bun WebSocket server on port 3055 (configurable via `PORT` env). Routes messages between MCP server and Figma plugin using channel-based isolation. Clients call `join` to enter a channel; messages broadcast only within the same channel.

### Figma Plugin (`figma/`)
Runs inside Figma. `code.js` is the plugin main thread handling 30+ commands via a dispatcher. `ui.html` is the plugin UI for WebSocket connection management. `manifest.json` declares permissions (dynamic-page access, localhost network). The plugin is **not built/bundled** — `code.js` is written directly as the runtime artifact.

## Key Patterns

- **Colors**: Figma uses RGBA 0-1 range. The MCP tools accept 0-1 floats and the filter converts to hex for display.
- **Logging**: All logs go to stderr. Stdout is reserved for MCP protocol messages.
- **Timeouts**: 30s default per command. Progress updates from the plugin reset the inactivity timer.
- **Chunking**: Large operations (scanning 100+ nodes) are chunked with progress updates to prevent Figma UI freezing.
- **Reconnection**: WebSocket auto-reconnects after 2 seconds on disconnect.
- **Zod validation**: All tool parameters are validated with Zod schemas.

## Setup

1. Run `bun setup` — installs dependencies and writes MCP config for both Cursor (`.cursor/mcp.json`) and Claude Code (`.mcp.json`)
2. `bun socket` in one terminal (WebSocket relay)
3. In Figma: Plugins → Development → Link existing plugin → select `figma/manifest.json`
4. Run plugin in Figma, join a channel, then use tools from Cursor or Claude Code

The MCP config written by `bun setup` uses the published package:

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

You can also add it manually for Claude Code via the CLI:

```bash
claude mcp add TalkToFigma -- bunx cursor-talk-to-figma-mcp@latest
```

## Belo App Integration

This repo also contains a bidirectional Flutter↔Figma workflow for the Belo messaging app.

### Belo App (Flutter)
Located at `balo/` (git submodule). The dev branch (`origin/dev`) has the latest code.
- Frontend: `balo/frontend/messaging_app/`
- Key screens: Home (orbital bubbles), Chat (DM + group), Flow, Pops

### Skills & Agents (`.claude/`)
Project-specific Claude Code skills for Flutter↔Figma workflow:
- `.claude/skills/flutter-to-figma.md` — Full pipeline for recreating Flutter screens in Figma
- `.claude/skills/figma-component-builder.md` — Build reusable UI components (glass ball, eclipse avatar, nav bar)
- `.claude/skills/emulator-screenshot.md` — ADB screenshot capture and comparison
- `.claude/skills/design-token-extractor.md` — Extract colors/fonts/gradients from Dart code
- `.claude/agents/figma-designer.md` — Designer agent (code → Figma)
- `.claude/agents/figma-auditor.md` — Auditor agent (emulator screenshot verification)
- `.claude/rules/belo-figma.md` — Project-specific rules (no bubbles, correct fonts, etc.)

### Utility Scripts
- `scripts/figma-cmd.js` — Generic Figma command runner via WebSocket
- `scripts/extract-layout.js` — ADB UI hierarchy extractor (exact element positions)
- `scripts/flutter-inspect.js` — Flutter VM service inspector
- `scripts/icon-paths.json` — Material Design SVG paths (14 icons)
- `scripts/set-avatar.js` — Helper for base64 image fills

### Design Tokens
Run `cd balo/frontend/messaging_app && dart run test/golden/extract_design_tokens.dart` to extract all design tokens to `experiments/design-tokens.json`.

### Android Emulator
- Flutter SDK: `C:\Users\kmangibayev\flutter\`
- Android SDK: `C:\Users\kmangibayev\AppData\Local\Android\Sdk\`
- Emulator: Pixel 9, API 35
- Launch: `emulator -avd Pixel_9 -no-audio`
- Run app: `cd balo/frontend/messaging_app && flutter run -d emulator-5554`
