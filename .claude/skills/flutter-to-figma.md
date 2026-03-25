# Flutter-to-Figma Screen Recreation Pipeline

## When to Use
When the user asks to recreate a Flutter screen in Figma, convert a Flutter app page to a Figma design, or sync between Flutter and Figma.

## Prerequisites
- WebSocket relay running: `bun socket` (port 3055)
- Figma plugin "Cursor MCP Plugin" running and connected
- Android emulator with the Flutter app (optional but recommended for verification)
- Fonts installed: "Bumbbled" (logo), "ABC Arizona Mix Unlicensed Trial" (UI text)

## Pipeline Steps

### Step 1: Establish Ground Truth
NEVER start building without a reference image. Priority order:
1. Emulator screenshot (best): `adb shell 'screencap /sdcard/screen.png' && adb pull //sdcard/screen.png`
2. User-provided phone screenshot
3. HTML simulation (last resort)

### Step 2: Extract Design Tokens
Run the Dart token extractor:
```bash
cd balo/frontend/messaging_app && dart run test/golden/extract_design_tokens.dart
```
Output: `experiments/design-tokens.json` — all colors, fonts, gradients from code.

### Step 3: Extract Layout Positions (if emulator available)
```bash
bun run scripts/extract-layout.js
```
Output: `experiments/layout-dump.json` — exact element positions from ADB UIAutomator.
Scale to iPhone: `figmaX = dumpX * (393/411)`, `figmaY = dumpY * (852/923)`

### Step 4: Build Components First
Build each UI element in isolation before assembling:
1. Glass ball button (glow + ring + icon)
2. Eclipse avatar bubble (glow + frosted ring + image + online dot)
3. Navigation item (dot + label)
4. Message text (measure-verify approach)
5. Input area (glass balls + text field + placeholder)

### Step 5: Assemble Screen
Place verified components at positions from layout-dump.json.
Frame: 393×852 (iPhone 14 Pro), corner radius 50.

### Step 6: Verify
Export Figma screenshot → compare to emulator screenshot → score → fix differences.

## Key Rules
- NO colored bubble backgrounds on chat messages (dev branch uses _GioiaMessageBubble)
- Always use measure-verify for text: create off-screen → read width → position correctly
- Use `create_vector` with SVG paths from `scripts/icon-paths.json` for proper icons
- Use `set_multiple_fills` for layered gradients
- Use `set_effect` for glass/glow effects (DROP_SHADOW + LAYER_BLUR)
- Background in dark mode: NOT solid black — it's a mood-based teal-blue gradient
- Place new designs in open Figma canvas space, never on top of existing frames
- Group related layers together

## Available Figma Commands
Standard: create_frame, create_rectangle, create_text, create_ellipse, create_vector,
set_fill_color, set_fill_gradient, set_corner_radius, set_stroke_color, move_node,
resize_node, delete_node, get_node_info, export_node_as_image, set_selections
Advanced: set_effect, set_opacity, set_image_fill, set_blend_mode, set_multiple_fills,
set_multiple_effects, group_nodes, flatten_node

## Fonts
- Logo "belo": fontFamily "Bumbbled"
- UI text: fontFamily "ABC Arizona Mix Unlicensed Trial"
- Fallback: "Inter"

## Channel Discovery
```bash
curl -s http://localhost:3055/channels
```
Pick the channel with the most clients. Test with `get_document_info` before building.
