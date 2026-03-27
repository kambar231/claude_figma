# Experiment 4: Flutter Screenshot / Code-Exact Figma Build

## Status: COMPLETED

## Phase 1: Flutter Screenshot Attempt

### Flutter SDK Check
- `flutter` NOT in PATH
- `C:\Users\kmangibayev\flutter\bin\flutter` NOT found
- `C:\flutter\bin\flutter` NOT found
- **Result**: Flutter SDK not available on this machine

### Fallback: Deep Code Analysis
Read every relevant Flutter source file to extract exact measurements:

**Files analyzed:**
- `lib/features/chat/screens/chat_screen.dart` (6500+ lines)
- `lib/features/chat/widgets/message_bubble.dart` (414 lines)
- `lib/features/chat/widgets/chat_input.dart` (141 lines)
- `lib/core/constants/color_palette.dart` (573 lines - BaloColors theme extension)
- `lib/core/constants/app_theme.dart` (407 lines - ThemeData, fonts)
- `lib/core/widgets/gioia_background.dart` (233 lines - ChatBackground)
- `lib/core/widgets/glass_container.dart` (284 lines)
- `lib/core/widgets/avatar_bubble.dart` (251 lines - GioiaAvatar)
- `lib/models/message.dart` (406 lines)

## Phase 2: Code-Exact Figma Build

### Exact Measurements Extracted from Flutter Code

**ChatBackground (dark mode):**
- Background color: `0xFF0C0415` (solid, not gradient)

**DM Header (_buildDmHeader):**
- PreferredSize height: 120px
- SafeArea + horizontal padding: 8px
- Avatar size: 54px, glow ring: 54 * 1.65 = 89.1px
- Ring color: `0xFF9B6FD4` at ~15% opacity
- Button row Y alignment: -0.4
- Avatar Y alignment: -1 (top)
- Name overlap: 14px below avatar

**MessageBubble:**
- Padding: left 16px (incoming) / left 60px (outgoing), right 16px (outgoing) / right 60px (incoming)
- Top/bottom: 6px (first/last in group), 2px (middle)
- Container padding: horizontal 14px, vertical 10px
- Max width: 75% of screen
- Border radius: 18px all corners, 4px on tail corner (lastInGroup)
- Shadow: shadowColor (0x406C2CA7), blur 4, offset (0, 2)
- Text: fontSize 15, lineHeight 1.4, fontFamily ABCArizonaMix
- Time: fontSize 11

**Dark Theme Colors (BaloColors.dark):**
- bubbleOutgoing: `0xFF6C2CA7`
- bubbleIncoming: `0xFF2A1545`
- bubbleTextOutgoing: `0xFFFFFFFF`
- bubbleTextIncoming: `0xFFF0F6FC`
- textPrimary: `0xFFF0F6FC`
- textMuted: `0xFF9E8FB5`
- accent: `0xFFBA82ED`
- inputBackground: `0xFF251545`
- success: `0xFF5A9E7A`

**ChatInput (_buildInputArea):**
- Background: `0xFF0C0415` (same as ChatBackground)
- Top border: white 8% opacity, 0.5px
- Border radius: top 24px, bottom 28px (keyboard closed)
- Snap button: 44x44 circle, accent border 2.5px, camera icon 20px
- Text field: borderRadius 24, inputBackground color, padding h:16
- Hint text: "Type with joy...", textMuted color
- Attachment icon: right side, iconSecondary color

### Build Results
- **Frame**: "Exp4: Code-Exact Build"
- **Position**: (16100, 0)
- **Size**: 393x852 (iPhone 14 Pro)
- **Figma Node ID**: 54779:1135
- **Channel used**: rkv91cy1

### Elements Created:
1. Phone frame (393x852, dark bg)
2. Status bar with time
3. DM header with avatar (glow ring, initials), back/call/video/stack buttons, display name
4. Message list with 6 messages (3 incoming, 3 outgoing)
5. Date separator pill
6. Input area with snap button, text field, attachment icon, top border
7. Home indicator bar

## Phase 3: Side-by-side Comparison

Not applicable since Flutter screenshot was unavailable. The single code-exact build serves as the reference.

## Key Findings

1. **Flutter SDK not installed** on this machine - golden test approach not possible
2. **Deep code analysis** revealed exact measurements for every widget
3. **Dark mode** is the default theme (ThemeMode.dark)
4. **ChatBackground** overrides the gradient with a solid color (`0xFF0C0415`)
5. **Font**: ABCArizonaMix (custom), Inter (Google Fonts for system text)
6. **Input area** merges with keyboard when open (bottom radius goes to 0)
7. The app has extensive features: peek, stack view, mood-based gradients, circles, video notes, mentions
