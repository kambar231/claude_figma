# Pipeline Audit: Figma vs Emulator (AUDITOR Agent)

**Date:** 2026-03-24
**Emulator screenshot:** `audit-emulator.png` (fresh capture)
**Figma output:** `pipeline-result.png`

---

## AUDIT CHECKLIST

### 1. Background Gradient -- 20%
- **Emulator:** Rich dark teal-blue gradient. The upper portion is very dark navy, transitioning to a visible teal/blue-green glow in the lower-center area. There is a distinct warm teal luminosity in the bottom half.
- **Figma:** Nearly flat black/very dark navy. Almost no gradient visible at all. The entire background reads as near-black with no teal warmth.
- **Verdict:** The teal-blue tone is almost completely absent in Figma. The gradient direction and glow are missing. This is the single biggest visual difference.

### 2. Avatar Position -- 60%
- **Emulator:** Avatar is centered horizontally at the top of the content area, below the status bar. It is a real photo of a person (bearded man with turban).
- **Figma:** A purple circle with the letter "S" is centered at roughly the correct position.
- **Verdict:** Position is approximately correct, but using a placeholder letter instead of an actual photo is a major fidelity miss.

### 3. Avatar Glow -- 15%
- **Emulator:** The avatar has a subtle dark ring/border around it. There is a very faint glow effect, more of a dark circular frame than a bright glow.
- **Figma:** The avatar has a thick dark gray ring around it, but no glow effect whatsoever. The ring is too thick and opaque.
- **Verdict:** The glow/ring treatment is wrong. Emulator has a subtle thin ring; Figma has a chunky opaque outer ring.

### 4. Phone Button -- 40%
- **Emulator:** Small circular dark glass button with a white phone icon, positioned to the left of the avatar. Has a thin subtle border.
- **Figma:** Circular dark button with what looks like a phone-ish icon, but the icon appears as a purple "T" or arrow shape rather than a clean phone icon. The button ring is too thick and prominent.
- **Verdict:** Position is close. Icon clarity and glass style are off. The border ring is too heavy.

### 5. Video Button -- 25%
- **Emulator:** Small circular dark glass button with a white video camera icon, positioned to the right of the avatar. Matches the phone button style.
- **Figma:** Small button with what appears to be "Cb" or garbled text/icon instead of a video camera icon.
- **Verdict:** Wrong icon entirely. Position is roughly correct but the icon content is wrong.

### 6. Back Arrow -- 70%
- **Emulator:** White `<` chevron on the far left of the header row.
- **Figma:** White `<` chevron in approximately the same position.
- **Verdict:** Close. The Figma version appears slightly thinner but is in the right position.

### 7. Stack Icon -- 25%
- **Emulator:** Two overlapping rectangle icon (copy/stack) on the far right of the header row, white.
- **Figma:** Three vertical dots (kebab menu icon) on the far right.
- **Verdict:** Completely wrong icon. Should be overlapping rectangles, not vertical dots.

### 8. "Saeed Sharifi" Text -- 80%
- **Emulator:** White sans-serif text, centered below the avatar. Clean and legible.
- **Figma:** White text, centered below the avatar. Appears similar in size and weight.
- **Verdict:** Good match. Font appears close. Position is correct.

### 9. Date Badge "17/3/2026" -- 50%
- **Emulator:** Pill-shaped badge with a frosted pink/mauve glass background, centered horizontally, positioned in the lower-middle area of the chat body. Text is white/light. The badge has a distinct pinkish-purple tint.
- **Figma:** Dark pill-shaped badge, centered. Much darker than the emulator version. The pink/mauve tint is barely visible or absent.
- **Verdict:** Position is correct. The frosted glass pink/mauve effect is missing -- the badge is too dark and flat.

### 10. Message "H" -- 75%
- **Emulator:** White "H" text, left-aligned, no bubble background. Positioned below the date badge.
- **Figma:** White "H" text, left-aligned, no bubble background. Similar position.
- **Verdict:** Good match. No colored bubble background (correct). Position is close.

### 11. Timestamp "15:17" -- 70%
- **Emulator:** Small gray text below the "H" message.
- **Figma:** Small gray text below the "H" message.
- **Verdict:** Close match. May be slightly different gray shade.

### 12. Input Area -- 30%
- **Emulator:** Bottom input bar with: (a) three small purple vertical dots on the far left, (b) "belo" in a cursive/script font in purple/mauve, centered-left, (c) a dark circular microphone button with a white mic icon on the far right, with a dark ring around it.
- **Figma:** Bottom input bar with: (a) a single colon-like symbol on the left (not 3 dots), (b) "belo" text -- appears to be in a regular font, not obviously cursive/script, (c) a circular button on the right with what appears to be a stick-figure or "person" icon, surrounded by a prominent purple ring -- NOT a microphone icon.
- **Verdict:** Multiple issues: wrong left indicator (should be 3 dots), "belo" may not be in the correct cursive font, and the right button has the wrong icon (should be microphone, not person). The purple ring on the mic button is too prominent.

### 13. Home Indicator -- 50%
- **Emulator:** Standard Android navigation -- no explicit home indicator bar visible.
- **Figma:** No home indicator visible.
- **Verdict:** N/A for Android, but acceptable.

### 14. Overall Color Temperature -- 15%
- **Emulator:** Distinctly teal-blue. The entire screen has a dark ocean/teal feel with warm blue-green undertones.
- **Figma:** Very dark purple-black. The color reads as dark purple/navy-black, NOT teal-blue. This is the wrong color temperature.
- **Verdict:** CRITICAL MISS. The Figma output is purple-black when it should be teal-blue. This is the most visually impactful error.

### 15. Overall Proportions -- 65%
- **Emulator:** Header (avatar + buttons) takes about 15% of screen. Large empty chat body. Date badge and message in the lower third. Input bar at bottom.
- **Figma:** Similar proportions. Header area is roughly correct. Chat body has correct empty space. Input bar at bottom.
- **Verdict:** Layout structure is reasonable. Ratios are approximately correct.

---

## CRITICAL CHECKS

| Check | Result |
|-------|--------|
| Is it teal-blue (correct) or purple (wrong)? | **PURPLE/BLACK -- WRONG.** Should be teal-blue. |
| Are there colored bubble backgrounds? | **No** -- correct, no bubble backgrounds. |
| Does the avatar have glow effects? | **No** -- the glow is missing. Has a chunky ring instead. |
| Is the "belo" text in cursive/Bumbbled font? | **Unclear/likely no** -- appears to be regular font, not obviously cursive. |

---

## OVERALL ACCURACY: 38/100

The Figma reproduction captures the basic layout (element positions, spacing ratios) but fails significantly on:
- Color temperature (purple-black instead of teal-blue)
- Visual effects (glass, glow, gradient all missing)
- Icon accuracy (wrong icons for video, stack/copy, and microphone)
- Avatar (placeholder letter instead of photo)

---

## TOP 5 FIXES NEEDED (Priority Order)

1. **Background gradient must be teal-blue, not purple-black.** Use a radial gradient centered at bottom-center with dark navy base (`#0A1A2E`) transitioning to visible teal glow (`#0F3040` to `#1A4A55`). This is the single most impactful fix.

2. **Avatar must use an actual image, not a letter placeholder.** Use `set_image_fill` to load the real avatar photo. Add a subtle glow ring (thin, not chunky) around it.

3. **Fix all wrong icons:** Video button needs a video camera icon (not "Cb"). Stack icon needs overlapping rectangles (not vertical dots). Microphone button needs a mic icon (not a person icon).

4. **Date badge needs frosted pink/mauve glass effect.** Current badge is too dark. Should have `rgba(150, 80, 120, 0.35)` background with blur for the frosted glass look.

5. **Input area details:** Left side needs 3 small vertical dots (not a single symbol). "belo" text should be in cursive/Bumbbled script font. Mic button ring should be subtle, not prominent purple.
