# Design Token Extractor

## When to Use
When you need exact color, font, spacing, or gradient values from the Flutter codebase without guessing.

## Quick Extract
```bash
cd balo/frontend/messaging_app && dart run test/golden/extract_design_tokens.dart
```
Output: `experiments/design-tokens.json`

## Key Token Files in Flutter Code
| File | Contains |
|------|----------|
| `lib/core/constants/color_palette.dart` | BaloColors.dark + BaloColors.light theme extensions |
| `lib/core/constants/app_theme.dart` | Text styles, font families, ThemeData |
| `lib/core/widgets/gioia_background.dart` | Background colors (ChatBackground, GioiaBackground) |
| `lib/core/utils/mood_colors.dart` | Mood-based dynamic gradients |
| `lib/core/widgets/glass_container.dart` | Glass morphism blur + opacity values |
| `lib/core/widgets/avatar_bubble.dart` | Eclipse bubble glow/ring dimensions |

## Critical Dark Mode Values
```
Background:        #0C0415 (solid base, but mood system adds gradient)
Text Primary:      #F0F6FC
Text Secondary:    #D1C4E9
Text Muted:        #9E8FB5
Accent:            #BA82ED
Accent Secondary:  #E879A8
Glow Color:        #9B6FD4
Card Background:   #1E1030
Input Background:  #251545
Bubble Outgoing:   #6C2CA7 (NOT used in dev branch _GioiaMessageBubble)
Bubble Incoming:   #2A1545 (NOT used in dev branch _GioiaMessageBubble)
Success:           #5A9E7A
Online:            #34D399
```

## Sender Colors (Group Chat)
```
Teal:   #5EC4B6
Coral:  #E87D7D
Purple: #B39DDB
Green:  #81C784
Amber:  #FFB74D
Blue:   #4FC3F7
```

## Reading Dev Branch Code
The app uses the `origin/dev` branch. To read files without checking out:
```bash
cd balo && git show origin/dev:frontend/messaging_app/lib/<path>
```

## Important: Code vs Reality
The Flutter code defines many features behind conditionals. Do NOT assume code = visual output.
- `MessageBubble` (with colored backgrounds) exists but is NOT used on dev branch
- `_GioiaMessageBubble` (plain text, no backgrounds) IS used on dev branch
- Background is NOT just `#0C0415` — the mood system adds a teal-blue gradient at runtime
- Always verify against emulator screenshot, not just code reading
