# Design Token Extractor

## When to Use
When you need exact color, font, spacing, or gradient values from the Flutter codebase.

## Quick Extract
```bash
cd balo/frontend/messaging_app && dart run test/golden/extract_design_tokens.dart
```
Output: `experiments/design-tokens.json`

## Key Token Sources in Flutter Code
| File | Contains |
|------|----------|
| `lib/core/constants/color_palette.dart` | BaloColors.dark + BaloColors.light (21 semantic tokens each) |
| `lib/core/constants/app_theme.dart` | Text styles, font families, ThemeData |
| `lib/core/utils/mood_colors.dart` | 6 mood states with primary + secondary colors |
| `lib/core/widgets/gioia_background.dart` | Background rendering (solid vs gradient based on mood) |
| `lib/core/widgets/glass_container.dart` | Glass morphism blur + opacity values |

## Mood Colors (Critical)
The app's glow colors change based on conversation mood:
| Mood | Primary | Secondary | When |
|------|---------|-----------|------|
| Dormant | `#4A3D6A` | `#4A3D6A` | No AI data / inactive |
| **Calm** | `#468CC8` | `#2A6AA0` | **Default visible state** (arousal < 0.25) |
| Balanced | `#4A3D6A` | `#4A3D6A` | Everyday conversation |
| Passionate | `#DC5078` | `#B83060` | Intense emotions |
| Excited | `#D2AA3C` | `#AA8820` | Celebratory |
| Intense | `#C85A46` | `#9A3828` | Very intense |

**Important:** The emulator typically shows CALM mood (#468CC8 teal-blue), NOT dormant (#9B6FD4 purple). Always verify against emulator.

## Figma Variable Architecture
Tokens should be created as Figma Variables using `use_figma`:
- **Primitives** collection: raw values, scopes = [] (hidden)
- **Color** collection: semantic tokens with Light/Dark modes, aliased to primitives
- **Spacing** collection: FLOAT values with GAP scope
- **Radius** collection: FLOAT values with CORNER_RADIUS scope

## Important: Code vs Reality
- `MessageBubble` (colored backgrounds) exists but is NOT used on dev branch
- `_GioiaMessageBubble` (plain text, no backgrounds) IS the active message widget
- Background is mood-dependent at runtime — don't assume solid #0C0415
- Always verify against emulator screenshot, not just code reading
