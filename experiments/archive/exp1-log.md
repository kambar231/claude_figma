# Experiment 1: HTML Rendering Pipeline

## Objective
Recreate the Belo messaging app's chat screen (dark mode) from Flutter source code into Figma, using an intermediate HTML representation as a pixel-perfect reference.

## Files Created
- `exp1-chat.html` — Self-contained HTML/CSS rendering of the chat screen at 393x852px
- `exp1-convert.js` — Bun script that recreates the screen in Figma via WebSocket relay

## Flutter Sources Read
- `features/chat/widgets/message_bubble.dart` — Bubble padding (14h, 10v), border-radius (18px), shadow, text styles
- `features/chat/screens/chat_screen.dart` — DM header layout (120px), input area with glass ball + voice button
- `features/chat/widgets/chat_input.dart` — Input field with snap button (44px circle) and text field (24px radius)
- `core/constants/color_palette.dart` — All dark-mode colors (BaloColors.dark)
- `core/widgets/gioia_background.dart` — Background: solid #0C0415 in dark mode

## Color Mapping (Flutter dark theme -> Figma)
| Token | Hex | Figma RGB (0-1) |
|-------|-----|-----------------|
| bg (GioiaBackground) | #0C0415 | 0.047, 0.016, 0.082 |
| bubbleOutgoing | #6C2CA7 | 0.424, 0.173, 0.655 |
| bubbleIncoming | #2A1545 | 0.165, 0.082, 0.271 |
| textOutgoing | #FFFFFF | 1, 1, 1 |
| textIncoming | #F0F6FC | 0.941, 0.965, 0.988 |
| inputBackground | #251545 | 0.145, 0.082, 0.271 |
| accent | #BA82ED | 0.729, 0.510, 0.929 |
| textMuted | #9E8FB5 | 0.620, 0.561, 0.710 |
| glow | #9B6FD4 | 0.608, 0.435, 0.831 |
| success | #5A9E7A | 0.353, 0.620, 0.478 |

## What Was Built
1. **Status bar** (59px): Time "9:41", Dynamic Island (126x37 black pill), battery icon
2. **DM Header** (120px): Back chevron, call/video buttons, centered avatar with radial glow (89px) + glass ring (51px) + gradient circle (46px), name "Elena", online status
3. **9 Messages**: Alternating incoming/outgoing bubbles with exact padding, max-width 75%, timestamps at 60% opacity, read receipts (double-check marks) for outgoing
4. **Input Area** (110px): Glass ball (44px with 72px glow), "belo" hint text (Bumbbled font, 18% opacity), voice button (40px with 66px glow)

## Figma Placement
- Frame: "Exp1: HTML Pipeline"
- Position: (14600, 0)
- Size: 393 x 852

## Limitations / Notes
- No `create_ellipse` command in plugin; circles created as rectangles with radius = size/2
- No `set_opacity` or `set_effect` commands; opacity simulated via fill color alpha channel
- Individual corner radius per corner (4px on sender's side for last-in-group bubbles) not reliably supported; all bubbles use uniform 18px radius
- Icons rendered as text/emoji placeholders (no vector icon import available)
- Shadow (drop shadow) on bubbles not applied (no `set_effect` command)

## Execution
- Script ran successfully via Bun WebSocket relay
- Channel discovered automatically
- All 50+ Figma nodes created without errors
