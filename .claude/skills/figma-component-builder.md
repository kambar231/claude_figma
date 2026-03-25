# Figma Component Builder

## When to Use
When building individual UI components for the Belo app in Figma. Always build components in isolation first, verify they look correct, then use them in full screen assemblies.

## Component: Glass Ball Button
Used for: phone, video, menu (dots), mic buttons

```
Layers (bottom to top):
1. Glow circle: create_ellipse, size = buttonSize * 1.65
   - fill: GRADIENT_RADIAL, glowColor@30% → glowColor@0%
2. Button body: create_ellipse, size = buttonSize
   - fill: dark bg color at 85-90% opacity
   - stroke: accent at 20% opacity, 1px
   - effect: DROP_SHADOW, accent@25%, blur 8, offset (0,2)
3. Icon: create_vector with SVG path from scripts/icon-paths.json
   - fill: white or accent color
   - scale to ~14px within the button
```

Typical sizes: 32-44px button, 53-73px glow

## Component: Eclipse Avatar Bubble
Used for: profile avatars, chat avatars, center belo ball

```
Layers (bottom to top):
1. Glow blob: create_ellipse, size = avatarSize * 1.65
   - fill: GRADIENT_RADIAL, glowColor@60% → @28% → @0%
2. Frosted ring: create_ellipse, size = avatarSize * 0.94
   - fill: bg color at 85% opacity
   - effect: [DROP_SHADOW glow@40% blur 20 spread 2, DROP_SHADOW glow@55% blur 14 spread -8]
3. Inner highlight: create_ellipse, same size as ring
   - fill: GRADIENT_LINEAR, white@10% top → white@0% bottom
4. Avatar: create_ellipse, size = avatarSize
   - fill: gradient or set_image_fill with photo
5. Online dot (optional): create_ellipse, size = avatarSize * 0.22
   - fill: green #34D399, positioned bottom-right
   - stroke: bg color, 2px (border around dot)
```

## Component: Message Text (No Bubbles)
Used for: DM and group chat messages on dev branch

```
- create_text at left margin (incoming: x=16, outgoing: x=60)
  - fontSize: 15, fontFamily: "ABC Arizona Mix Unlicensed Trial"
  - color: textPrimary #F0F6FC
  - MEASURE-VERIFY: create off-screen, read width, reposition
- Timestamp below: fontSize 11, textMuted #9E8FB5
- Spacing: 8px between different senders, 3px same sender
- For group chats: colored sender name above message (coral, teal, purple per user)
- NO colored background rectangles
```

## Component: Rotary Nav Bar
Used for: FLOW / HOME / POPS navigation at bottom

```
- Arc radius: 96px, spread: 60° (π/3)
- 3 items positioned along arc from center-bottom
- Active item: accent-colored dot (6px) + bold label (10.5px) + accent color
- Inactive: white dot (4px) at 45% opacity + regular label (9.5px) at 65% opacity
- Letter spacing: 1.5px on all labels
- Font: "ABC Arizona Mix Unlicensed Trial"
```

## Component: Date Badge
```
- Rounded pill: width auto, height 26px, border-radius 13px
- Fill: pink/mauve (#D4648A) at 80% opacity
- Text: white, 12px, centered
- Effect: optional BACKGROUND_BLUR radius 8
```

## Component: Input Area
```
- Left glass ball: 44-50px, three vertical dots icon (more_vert path)
- Center: "belo" text in Bumbbled font, textMuted color
- Right side: "GIF" text label (optional)
- Right glass ball: 40-50px, mic icon (mic path)
- Both glass balls have glow rings
```

## Measure-Verify Pattern
For ANY text element:
1. Create at (-9999, -9999) with correct font/size
2. Call get_node_info → read actual {width, height}
3. Delete the off-screen text
4. Create at correct position using real measurements
5. For right-alignment: x = screenWidth - rightMargin - measuredWidth
6. For centering: x = centerX - measuredWidth/2
