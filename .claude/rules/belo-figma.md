# Belo Figma Project Rules

## The #1 Rule: Use `use_figma`, NOT WebSocket Commands
**ALWAYS use the official Figma MCP `use_figma` tool** (from `plugin:figma:figma`) for ALL Figma design work.
**NEVER use `mcp__TalkToFigma__*` WebSocket commands** for design creation — they produce amateur results.

The `use_figma` tool executes real Figma Plugin API JavaScript, giving access to:
- Components with variants (`figma.createComponent()`, `combineAsVariants()`)
- Variables with modes (`figma.variables.createVariable()`)
- Real effects (backdrop blur, drop shadows, inner shadows)
- Auto-layout with proper sizing
- Variable bindings on fills, strokes, padding

## Figma File
- **File key:** `j9CUi0q2Jj5FAM1VZnEdTU`
- **URL:** `https://www.figma.com/design/j9CUi0q2Jj5FAM1VZnEdTU/Belo-Design`

## Design System Architecture (Created)
- **Primitives** collection: 48 raw color variables
- **Color** collection: 21 semantic tokens with Light/Dark modes
- **Spacing** collection: 9 values (2-48px)
- **Radius** collection: 8 values (0-999px)
- **Text styles**: 10 (Display, Headline, Title, Body, Label)
- **Effect styles**: 3 (Glass/Shadow, Glass/Glow, Card/Shadow)

## Critical Design Rules
1. **NO message bubbles** — Dev branch uses `_GioiaMessageBubble` with NO colored backgrounds
2. **Mood-based glow** — Default visible state is CALM (#468CC8 teal-blue), NOT dormant purple
3. **Build components first** — Never draw raw shapes for a full screen. Build each element as a Figma component, verify it, then instantiate
4. **Always verify** — Use `get_screenshot` after every component build. Compare to emulator via ADB
5. **Be brutally honest** — Never inflate accuracy scores. If it doesn't look identical, say so

## Workflow: figma-generate-library Phases
Follow this order strictly:
1. Phase 0: Discovery (analyze code + inspect Figma)
2. Phase 1: Foundations (variables, styles)
3. Phase 2: File structure (pages)
4. Phase 3: Components (one at a time, verify each)
5. Phase 4: Screens (assemble from components)

Get user approval at each checkpoint.

## Skills to Load
- `figma-use` — MUST load before every `use_figma` call
- `figma-generate-library` — for design system builds
- `figma-generate-design` — for screen assembly

## Never Do
- Don't use WebSocket MCP commands for design work
- Don't hardcode colors — bind to variables
- Don't skip user checkpoints
- Don't rebuild verified components from scratch
- Don't inflate audit scores
- Don't ask user to restart anything — find programmatic solutions
