# ExpD: HTML-Traced Chat Screen - Build Log

## Approach
Created an HTML simulation of the dev branch chat screen at exact 393x852 viewport,
extracted pixel measurements via Puppeteer, then built in Figma using those measurements.

## Placement
- Frame: "ExpD: HTML-Traced" at (18500, 0)
- Size: 393x852px

## Key Design Decisions
- Messages: PLAIN TEXT, NO colored bubble backgrounds (per dev branch _GioiaMessageBubble code)
- Text color: #F0F6FC (textPrimary) for BOTH incoming AND outgoing
- Timestamps: 11px, #9E8FB5 (textMuted)
- Read receipts: green (#5A9E7A) for read, muted (#9E8FB5) for delivered
- Header: eclipse glow avatar (54px, glass ring 51px, glow 89px), call glass orbs (34px ring)
- Input: glass ball with 3 dots (left, 41px ring), "belo" hint (20px, 18% opacity), voice orb (right, 38px ring)
- Background: radial gradient simulation with overlapping ellipses

## Extracted HTML Measurements
| Element | x | y | w | h |
|---------|---|---|---|---|
| Status bar | 0 | 0 | 393 | 59 |
| Header | 0 | 59 | 393 | 120 |
| Back btn | 8 | 71 | 48 | 48 |
| Audio call | 110 | 66 | 59 | 59 |
| Video call | 224 | 66 | 59 | 59 |
| Stack btn | 337 | 71 | 48 | 48 |
| Avatar | 195 | 77 | 46 | 54 |
| Header name | 172 | 134 | 48 | 21 |
| Messages | 0 | 179 | 393 | 580 |
| Input area | 0 | 759 | 393 | 93 |
| Glass ball | 12 | 770 | 72 | 72 |
| Text field | 94 | 778 | 211 | 56 |
| Voice btn | 315 | 773 | 66 | 66 |

## Colors (BaloColors.dark)
| Token | Hex |
|-------|-----|
| bg | #0C0415 |
| textPrimary | #F0F6FC |
| textMuted | #9E8FB5 |
| success | #5A9E7A |
| gradientCenter | #3C1749 |
| gradientMiddle | #4F2C5A |
| gradientOuter | #1A0D2E |
| glow | #9B6FD4 |
| onlineDot | #34D399 |
| avatarBg | #1A0A2E |

## Date
2026-03-24
