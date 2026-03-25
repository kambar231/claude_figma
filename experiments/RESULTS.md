# Experiment Results: Flutter → Figma Recreation

## Final Rankings

### 1st Place: Experiment 2 — Measure-Verify Loop ⭐
**Best overall accuracy for text sizing and message alignment.**

- Creates text off-screen → measures actual width/height via `get_node_info` → sizes bubble to fit → positions correctly
- Real measurements: "Good morning Mr. Stephano" = 189px (vs 156px estimated — 21% error eliminated)
- Right-alignment of outgoing messages is pixel-accurate
- 9 messages rendered with correct conversation content

**Weakness**: Elements are siblings (not grouped in frames), harder to rearrange later.

### 2nd Place: Experiment 3 — Component Library ⭐
**Best structural approach — components are reusable frames.**

- Each widget built and tested in isolation on a component board
- Uses Figma frames as containers — children move together when repositioned
- Clean, organized Figma layer structure
- Also uses measure-then-size approach

**Weakness**: Used different message content, fewer messages.

### 3rd Place: Experiment 4 — Code-Exact Build
**Solid code analysis but no measurement verification.**

- Thorough extraction of every Flutter measurement
- Clean visual result
- No text measurement feedback — bubble sizing is approximate

**Weakness**: Without Flutter SDK, couldn't get a reference screenshot.

### 4th Place: Experiment 1 — HTML Pipeline
**Concept is excellent but execution failed.**

- Created faithful HTML/CSS simulation of the chat screen
- Conversion to Figma commands had bugs — most content didn't render
- The HTML file itself (`exp1-chat.html`) is useful as a visual reference

**Weakness**: Two-step process (HTML → Figma) introduces conversion errors.

---

## Recommended Approach: Combine Exp 2 + Exp 3

The ideal pipeline combines the best of both:

### Step 1: Measure-First Text Rendering (from Exp 2)
```
For each text element:
  1. Create text at (-9999, -9999) with exact font/size/weight
  2. Read back actual width and height from Figma
  3. Delete the off-screen text
  4. Use real dimensions to size containers
```

### Step 2: Frame-Based Components (from Exp 3)
```
For each composite widget (message bubble, header, input area):
  1. Create a Figma Frame as the container
  2. Create child elements INSIDE the frame (using parentId)
  3. Frame can be moved as a unit without breaking layout
```

### Step 3: Build Order
```
1. Create phone frame (393×852)
2. Build header component (frame)
3. For each message:
   a. Measure text width/height
   b. Create bubble frame sized to fit
   c. Create text + timestamp inside frame
   d. Position bubble frame (left for incoming, right-aligned for outgoing)
4. Build input area component (frame)
5. Export and verify screenshot
```

### Step 4: Verification Loop
```
After full build:
  1. Export screenshot
  2. Compare to reference (HTML simulation or real app screenshot)
  3. Identify misalignments
  4. Auto-correct positions
  5. Re-export and verify
```

---

## Plugin Limitations Discovered

| Feature | Status | Workaround |
|---------|--------|------------|
| Per-corner border radius | Not supported | Use uniform 18px (visual difference is minor) |
| Box shadows / drop shadows | Not supported | Use glow gradient behind element |
| Backdrop blur | Not supported | Use semi-transparent fill to simulate |
| create_ellipse | Not available | Use rectangle with radius = width/2 |
| set_opacity (node level) | Not available | Use fill alpha |
| Text auto-sizing | Works via measurement | Create → measure → resize container |

---

## Files Reference

| File | Description |
|------|-------------|
| `experiments/exp1-chat.html` | HTML simulation (open in browser to preview) |
| `experiments/exp1-convert.js` | HTML→Figma converter (needs debugging) |
| `experiments/exp2-build.js` | Measure-verify builder (RECOMMENDED) |
| `experiments/exp3-build.js` | Component library builder |
| `experiments/exp4-build-figma.mjs` | Code-exact builder |
| `experiments/exp*-result.png` | Screenshots of each result |
| `experiments/exp*-log.md` | Detailed logs |
