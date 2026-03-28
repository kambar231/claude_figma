# Flutter-to-Figma Design System Pipeline

## When to Use
When recreating Flutter screens in Figma, syncing between Flutter and Figma, or building a Figma design system from Flutter code.

## Prerequisites
- Official Figma MCP server authenticated (`plugin:figma:figma` — needs OAuth login)
- Figma file key (extract from URL: `figma.com/design/<fileKey>/...`)
- `figma-use` skill loaded before every `use_figma` call
- Android emulator with Flutter app (for verification screenshots)

## Pipeline (follows figma-generate-library phases)

### Phase 0: Discovery
1. Analyze Flutter codebase for tokens: `color_palette.dart`, `app_theme.dart`, `mood_colors.dart`
2. Run token extractor: `cd balo/frontend/messaging_app && dart run test/golden/extract_design_tokens.dart`
3. Inspect existing Figma file via `use_figma` (read-only script to list pages, variables, components)
4. Present plan to user — get explicit approval before creating anything

### Phase 1: Foundations (variables + styles)
Create via `use_figma`:
- **Primitives** collection: raw color values (scopes = [] to hide from pickers)
- **Color** collection: semantic tokens with Light/Dark modes, aliased to primitives
- **Spacing** collection: 2, 4, 8, 12, 16, 20, 24, 32, 48
- **Radius** collection: 0, 4, 8, 16, 20, 24, 50, 999
- **Text styles**: Display, Headline, Title, Body, Label (matching Flutter TextTheme)
- **Effect styles**: Glass/Shadow, Glass/Glow, Card/Shadow

### Phase 2: File Structure
Create pages: Cover → Foundations → --- → Component pages → --- → Screens

### Phase 3: Components (one at a time)
For each Flutter widget, create a Figma Component with:
- Proper auto-layout
- Variable bindings (fills, strokes bound to Color variables)
- Effect style bindings
- Variants (using `combineAsVariants`)
- Validate with `get_screenshot` after each component

### Phase 4: Assemble Screens
Instantiate components on Screens page, arrange to match Flutter layout.
Verify against emulator screenshot.

## Key Technical Rules
- `use_figma` code uses `return` to send data back (NOT `figma.closePlugin()`)
- Colors are 0-1 range (NOT 0-255)
- Load fonts before text ops: `await figma.loadFontAsync({family, style})`
- Page resets each call — always `await figma.setCurrentPageAsync(page)`
- Return ALL created node IDs for subsequent calls
- Work incrementally — one small operation per `use_figma` call
- Never parallelize `use_figma` calls

## Figma File
- File key: `j9CUi0q2Jj5FAM1VZnEdTU`
- URL: `https://www.figma.com/design/j9CUi0q2Jj5FAM1VZnEdTU/Belo-Design`

## Verification
- `get_screenshot` to visually verify components
- ADB screenshot for emulator comparison: `adb shell 'screencap /sdcard/screen.png' && adb pull //sdcard/screen.png`
- Compare side by side — be brutally honest about differences
