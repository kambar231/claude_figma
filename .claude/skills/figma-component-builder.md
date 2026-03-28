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

3. **Icon** — MUST use exact Material Design SVG paths via `figma.createNodeFromSvg()`
   - Color: white at 55-82% opacity depending on context
   - Size: matches Flutter icon size (15px for call buttons, 17px for mic, 20px for stack, 28px for back)
   - NEVER approximate icons with primitives (ellipses, rectangles) — use the real SVG path

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

## CRITICAL: Component-First Workflow

**NEVER recreate elements inside assembled screens.** The workflow is:

1. Build each element as a **Figma Component** on its dedicated page
2. **Iterate** the component until it matches the emulator EXACTLY
3. Use `component.createInstance()` to place instances in screens
4. When fixing issues, update the **COMPONENT** — all instances update automatically
5. The assembled screen should contain ONLY instances + layout frames

## CRITICAL: Element Verification

After building or iterating ANY element:

1. **Export zoomed-in screenshot** of the Figma element via `get_screenshot`
2. **Crop the same element** from the emulator screenshot at high resolution
3. **View BOTH side by side** and check EVERY detail:
   - Icon shape correct? (outline vs fill, stroke weight, proportions)
   - Sizing correct? (too large, too small, wrong aspect ratio)
   - Fill pattern correct? (which parts are filled vs outlined)
   - Spacing correct? (padding, gaps between sub-elements)
4. **Fix ANY difference** before moving to the next element
5. **Never skip this step** — the auditor agents miss details that zoomed comparison catches

### CRITICAL: Use Exact Material Design SVG Paths for Icons
- Look up the Flutter icon name (e.g. `Icons.phone_outlined`, `Icons.videocam_outlined`)
- Get the exact SVG path `d=""` from Material Design Icons (viewBox 0 0 24 24)
- Use `figma.createNodeFromSvg()` to create the icon with the exact path
- Scale to the correct size via the SVG width/height attributes
- This guarantees pixel-perfect match since Flutter uses the exact same paths
- NEVER approximate icons with manual primitives (ellipses, rectangles, manual vector networks)

```javascript
// Example: Create exact Material Design icon
const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="white"><path d="M6.54 5c.06.89..."/></svg>`;
const svgNode = figma.createNodeFromSvg(svgStr);
const vector = svgNode.findOne(n => n.type === 'VECTOR');
const icon = vector.clone();
icon.name = 'icon';
parent.appendChild(icon);
svgNode.remove();
```