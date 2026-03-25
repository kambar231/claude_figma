# Emulator Match Audit — Belo DM Chat Screen

**Date:** 2026-03-24
**Ground truth:** `emulator-dm.png` (Android emulator, "calm" mood)
**Figma build:** v1-v4 iterations

## Iteration History

| Version | Frame ID | Position | Key Changes |
|---------|----------|----------|-------------|
| v1 | 54797:354 | 28000,0 | Initial build, gradient correct, glows too dim |
| v2 | 54797:400 | 28500,0 | Better glow, stroke fix, glass ball helper |
| v3 | 54797:438 | 29000,0 | Brighter avatar glow, stack icon as two rects |
| v4 | 54797:477 | 29500,0 | All 4 menu items, polished proportions |

## Color Accuracy

| Element | Emulator | Figma | Match? |
|---------|----------|-------|--------|
| BG gradient top | ~#2B5A82 | #2B5A82 | YES |
| BG gradient mid | ~#1E3A52 | #1E3A52 | YES |
| BG gradient bottom | ~#111A22 | #111A22 | YES |
| Avatar glow | Blue #468CC8 | #468CC8 | YES |
| Glass ball base | #0C0415 @85% | #0C0415 @85% | YES |
| Date badge | #D4648A | #D4648A @80% | YES |
| Primary text | #F0F6FC | #F0F6FC | YES |
| Muted text | #9E8FB5 | #9E8FB5 | YES |

Colors were computed from `mood_colors.dart` (calm mood: primary=#468CC8, secondary=#2A6AA0) using the `chatGradient()` HSL transform for dark mode.

## Element Comparison (v4 vs Emulator)

| Element | Match | Notes |
|---------|-------|-------|
| Background gradient | 95% | Linear gradient matches; emulator has slight radial center brightness |
| Status bar | 70% | Time correct; right icons are text chars vs Android system icons |
| Back arrow | 90% | Both show left arrow; emulator uses rounded Material chevron |
| Phone/video buttons | 75% | Glass ball structure correct; emulator has proper Material icons |
| Avatar | 60% | Size/glow match; emulator has actual photo, Figma has "S" placeholder |
| Stack icon | 80% | Two overlapping rects match; emulator uses filter_none_rounded |
| Name "Saeed Sharifi" | 85% | Content/size/weight match; font differs (SF Pro vs ABC Arizona) |
| Glass ball menu | 80% | 4 items correct (X, send, smiley, hamburger); text chars vs icons |
| Date badge | 90% | Color, radius, position all match well |
| Message "H" | 90% | Content, position, timestamp match |
| Left glass ball | 80% | Glow intensity close; three-dot icon matches |
| "belo" hint | 85% | Bumbbled font correct; opacity approximation |
| Right glass ball (mic) | 75% | Structure correct; emulator has subtle dark ring border |
| Home indicator | 95% | Width, height, opacity, position all match |

## Overall Match: ~80%

## Unresolvable Differences (MCP limitations)

1. Cannot embed raster images (avatar photo) via MCP rectangle/frame tools
2. Material icons rendered as text characters, not vector paths
3. BackdropFilter (frosted glass blur) not available via MCP
4. Complex multi-layer box shadows need manual adjustment
5. Radial center brightness in background requires overlay

## Recommendations for Manual Polish

1. Replace avatar "S" with actual photo
2. Use Figma icon library for proper Material icons
3. Add blur effects for frosted glass
4. Add radial gradient overlay for background center brightness
5. Fine-tune glow intensity with additional layers

## Files

- `experiments/emulator-dm.png` — emulator screenshot (ground truth)
- `experiments/emulator-match-v1.png` — v1 Figma export
- `experiments/emulator-match-v2.png` — v2 Figma export
- `experiments/emulator-match-v3.png` — v3 Figma export
- `experiments/emulator-match-v4.png` — v4 Figma export (best)
- `experiments/emulator-match-build.js` — v1 build script
- `experiments/emulator-match-v2.js` — v2 build script
- `experiments/emulator-match-v3.js` — v3 build script
- `experiments/emulator-match-v4.js` — v4 build script
