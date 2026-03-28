# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Belo messaging app workspace — Flutter app with bidirectional Figma design system. Uses the **Official Figma MCP** (`plugin:figma:figma`) for all Figma design work.

## Figma Integration

The official Figma MCP is provided by the Figma VS Code extension. No additional MCP servers needed.

### Key Tools
- `use_figma` — Execute Figma Plugin API JavaScript (create components, variables, effects, auto-layout)
- `get_screenshot` — Capture Figma screenshots for verification
- `get_design_context` — Read design structure and code hints
- `search_design_system` — Find components, variables, styles
- `get_metadata` — File metadata

### Figma File
- **Key:** `j9CUi0q2Jj5FAM1VZnEdTU`
- **URL:** `https://www.figma.com/design/j9CUi0q2Jj5FAM1VZnEdTU/Belo-Design`

### Design System (Created via use_figma)
- **Variables:** 48 primitives + 21 semantic (Light/Dark) + 9 spacing + 8 radius = 86 total
- **Text Styles:** 10 (Display, Headline, Title, Body, Label)
- **Effect Styles:** 3 (Glass/Shadow, Glass/Glow, Card/Shadow)
- **Components:** GlassBall (Dots/Mic variants), more in progress

## Belo App (Flutter)

Located at `balo/` (git submodule). Dev branch (`origin/dev`) has the latest code.
- Frontend: `balo/frontend/messaging_app/`
- Key screens: Home (orbital bubbles), Chat (DM + group), Flow, Pops

### Android Emulator
- Flutter SDK: `C:\Users\kmangibayev\flutter\`
- Android SDK: `C:\Users\kmangibayev\AppData\Local\Android\Sdk\`
- Emulator: Pixel 9, API 35
- Launch: `emulator -avd Pixel_9 -no-audio`
- Run app: `cd balo/frontend/messaging_app && flutter run -d emulator-5554`

### Design Tokens
```bash
cd balo/frontend/messaging_app && dart run test/golden/extract_design_tokens.dart
```
Output: `experiments/design-tokens.json`

## Skills & Agents (`.claude/`)
- `.claude/skills/flutter-to-figma.md` — Full pipeline using `use_figma` Plugin API
- `.claude/skills/figma-component-builder.md` — Component recipes with Plugin API patterns
- `.claude/skills/emulator-screenshot.md` — ADB screenshot capture and honest comparison
- `.claude/skills/design-token-extractor.md` — Dart source → JSON token extraction
- `.claude/agents/figma-designer.md` — Designer agent (uses `use_figma`)
- `.claude/agents/figma-auditor.md` — Auditor agent (brutally honest verification)
- `.claude/rules/belo-figma.md` — Project rules (no bubbles, component-first, etc.)
