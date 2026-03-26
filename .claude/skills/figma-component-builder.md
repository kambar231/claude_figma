# Figma Component Builder

## When to Use
When building individual UI components for the Belo app in Figma using the proper Plugin API.

## The Right Way: `use_figma` with Plugin API
All components MUST be built using `use_figma` (official Figma MCP), NOT the WebSocket commands. This gives access to:
- `figma.createComponent()` — proper reusable components
- `figma.combineAsVariants()` — variant systems
- `node.effects` — real drop shadows, inner shadows, backdrop blur
- `node.setBoundVariable()` — bind fills/strokes to design tokens
- Auto-layout with proper sizing modes

## Component: GlassBall
The frosted glass orb used throughout the app (menu, mic, phone, video buttons).

**Flutter source:** `_buildGlassBall()` in `chat_screen.dart`

**Structure (3 layers):**
1. **Glow blob** — `figma.createEllipse()`, 72.6px (44 × 1.65)
   - Fill: GRADIENT_RADIAL, mood glow color at [60%, 28%, 0%] opacity
   - Calm mood glow: `#468CC8` (teal-blue)
   - Dormant glow: `#9B6FD4` (purple)

2. **Frosted ring** — `figma.createEllipse()`, 41.36px (44 × 0.94)
   - Fill: `#0C0415` at 85% opacity
   - Effects: DROP_SHADOW (blur 20, spread 2, glow@40%) + DROP_SHADOW (blur 14, spread -8, glow@55%) + BACKGROUND_BLUR (radius 10)
   - Inner shimmer: GRADIENT_RADIAL, white@10% from top-center

3. **Icon** — dots (3 ellipses) or mic (ellipse + rectangles) or vector path
   - Color: white at 55% opacity
   - Size: 16px

**Variants:** Icon=Dots, Icon=Mic, Icon=Phone, Icon=Video

## Component: EclipseAvatar
Avatar with glow ring effect used on home screen and chat headers.

**Flutter source:** `_buildEclipseBubble()` in `home_screen.dart`

**Structure:** Same 3-layer pattern as GlassBall but with:
- Larger sizes (54px avatar, 89px glow)
- Avatar image or initials inside the ring
- Optional online indicator dot (green, bottom-right)
- Optional unread badge (top-right)

## Component: DateBadge
Pink/mauve pill with date text.

**Structure:** Auto-layout frame with horizontal padding, rounded corners, pink fill at 80% opacity.

## Component: InputBar
Bottom input area composition.

**Structure:** Frame with GlassBall instances + "belo" hint text + voice/send button.

## Build Process (for each component)
1. Switch to the component's page: `await figma.setCurrentPageAsync(page)`
2. Create component: `figma.createComponent()`
3. Add child layers with proper fills, effects, strokes
4. Create variants if needed
5. `figma.combineAsVariants([...], page)` to make a component set
6. Layout variants in a grid
7. Validate: `get_screenshot` to verify visually
8. Return all created node IDs

## Common Patterns
```javascript
// Load font before text
await figma.loadFontAsync({ family: "Inter", style: "Regular" });

// Create component
const comp = figma.createComponent();
comp.name = "MyComponent";
comp.resize(width, height);
comp.fills = [];
comp.clipsContent = false;

// Radial gradient fill
node.fills = [{
  type: "GRADIENT_RADIAL",
  gradientTransform: [[1,0,0],[0,1,0]], // centered
  gradientStops: [
    { position: 0, color: {r,g,b,a: 0.6} },
    { position: 1, color: {r,g,b,a: 0.0} },
  ]
}];

// Glass effect
node.effects = [
  { type: "DROP_SHADOW", color: {r,g,b,a:0.4}, offset:{x:0,y:0}, radius:20, spread:2, visible:true, blendMode:"NORMAL" },
  { type: "BACKGROUND_BLUR", radius:10, visible:true },
];

// Combine variants
const set = figma.combineAsVariants([variant1, variant2], page);
set.name = "ComponentName";
```