# Flutter → Figma Recreation Experiments

## Goal
Find the best strategy to recreate Flutter screens identically in Figma.

## Problem Statement
Current approach (manually reading Flutter code → writing Figma commands) produces inaccurate results because:
1. Estimating text widths/heights from character counts is imprecise
2. No feedback loop — can't verify element positions after placement
3. No reference image to compare against programmatically
4. Colors and gradients need exact translation, not approximation

## Experiments

### Experiment 1: HTML Rendering Pipeline
**Strategy**: Render Flutter layout as HTML/CSS → screenshot → use as reference image → trace in Figma
- Parse Flutter widget tree → generate equivalent HTML/CSS
- Render in browser at exact device dimensions (393×852)
- Screenshot the HTML rendering
- Use the screenshot as a visual reference while building in Figma

### Experiment 2: Measure-and-Verify Loop
**Strategy**: Build in Figma → export screenshot → compare to reference → auto-fix differences
- Build initial layout in Figma
- Export as PNG
- Compare element positions/sizes programmatically
- Iterate corrections until within tolerance

### Experiment 3: Component Library First
**Strategy**: Build each widget as a reusable Figma component, then assemble
- Create individual components (message bubble, avatar, input field, etc.)
- Test each component in isolation with exact measurements
- Assemble final screen from verified components

### Experiment 4: Direct Flutter Screenshot
**Strategy**: Run Flutter in headless mode → capture screenshot → use Figma image fill
- Attempt to run Flutter test/golden rendering
- Capture exact pixel output
- Import as Figma image and trace elements on top

## Tracking
Each experiment has its own .md file with:
- Approach description
- Steps taken
- Screenshots at each stage
- Final comparison
- What worked / what didn't
