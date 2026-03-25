# Belo Figma Project Rules

## Critical Design Rules
1. **NO message bubbles** — The Belo app (dev branch) does NOT show colored bubble backgrounds around chat messages. Messages are plain text on the dark background.
2. **Background is NOT solid black** — Dark mode uses a mood-based teal-blue gradient, not flat #0C0415.
3. **Always place in open space** — Never create new frames on top of existing ones. Check node positions first.
4. **Group related layers** — Don't leave loose elements. Group components together.
5. **Fonts**: "Bumbbled" for "belo" logo, "ABC Arizona Mix Unlicensed Trial" for all UI text.

## Build Process
1. Build components in isolation first, verify each one
2. Reuse verified components — don't rebuild from scratch each iteration
3. Use measure-verify for ALL text (create off-screen → read width → position)
4. Use `create_vector` with SVG paths for icons (never use text characters as icons)
5. Use `set_effect` for shadows and `set_multiple_fills` for layered gradients

## WebSocket Relay
- Start: `bun socket` (port 3055)
- Discover channel: `curl -s http://localhost:3055/channels`
- Multiple channels may exist — test each with `get_document_info` to find active plugin
- Start relay automatically if not running — don't ask user

## Verification
- Always compare against emulator screenshot (source of truth for visual output)
- Code is source of truth for structure/values, emulator for visual appearance
- Score using the 100-point rubric in the emulator-screenshot skill

## Never Do
- Don't add colored backgrounds to messages
- Don't use emoji/text characters as icons (use create_vector)
- Don't estimate text widths (always measure)
- Don't ask user to restart Claude Code or Figma (find programmatic solutions)
- Don't add unnecessary setup steps that block progress
