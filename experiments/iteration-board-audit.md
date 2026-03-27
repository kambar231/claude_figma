# Iteration Board Audit

Comparing iterations 1-12 against emulator reference crops.

---

## 1. Back Arrow (`ref-back-arrow.png`)

**Reference**: A clean, thin white chevron `<` on the dark background. No circle, no container -- just a bare stroke chevron, slightly left of center.

| Iteration | Score | Notes |
|-----------|-------|-------|
| 1-6       | 7/10  | All show a bare white `<` chevron, which matches the reference shape. Correct weight and color. Placement is top-left, correct. Slightly thicker stroke than the reference but acceptable. |
| 7-12      | 7/10  | Same bare chevron, identical to iterations 1-6. No regression. |

**Best**: All iterations are roughly equivalent. Score: **7/10**.

**Gap**: The reference chevron appears slightly thinner and has a softer anti-aliased edge. The Figma iterations look ever so slightly bolder. This is a minor issue -- likely a 1px stroke-width difference. Not a blocking problem.

**Verdict**: Acceptable. No iteration stands out as better or worse.

---

## 2. Phone Button (`ref-phone-btn.png`)

**Reference**: A dark glassy circle (roughly 40-44px) with a subtle blue/cyan outer glow halo. Inside: a white phone handset icon (classic telephone receiver, slightly rotated). The ball has a darker-than-background fill with the characteristic belo glass-ball aesthetic.

| Iteration | Score | Notes |
|-----------|-------|-------|
| 1-6       | 3/10  | The phone and video buttons are rendered as **small flat outlined icons** sitting bare on the dark header, without any glass-ball container. They look like plain line icons (phone outline, video outline) next to the "belo" text and the screen-share icon. No circular container, no glow, no glass effect at all. Completely wrong. |
| 7-12      | 3/10  | Same problem. The header shows `belo` text flanked by small flat icons (phone, video, screen-share). No glass ball containers. The phone icon shape is correct (handset), but the presentation is flat and containerless. |

**Best**: None. Score: **3/10** across the board.

**Critical gap**: The reference shows the phone icon **inside a glass ball with a blue glow halo**. Every iteration renders it as a tiny flat outline icon in the header bar. This is the single biggest mismatch in the entire board.

**Fix needed**:
- Wrap the phone icon in a ~40px dark circle
- Apply a radial gradient fill (darker center, slightly lighter edges) to simulate glass
- Add an outer glow effect (blue/cyan, ~10px spread, low opacity)
- The icon should be centered inside the ball, white, ~18px

---

## 3. Video Button (`ref-video-btn.png`)

**Reference**: Same glass-ball treatment as the phone button -- dark circle with blue glow, white video camera icon (rectangle + triangle) centered inside.

| Iteration | Score | Notes |
|-----------|-------|-------|
| 1-6       | 3/10  | Flat outlined video icon, no glass ball. Same problem as phone button. |
| 7-12      | 3/10  | Identical issue. Bare flat icon in the header. |

**Best**: None. Score: **3/10**.

**Fix needed**: Same as phone button -- wrap in a glass ball with glow.

---

## 4. Mic Ball (`ref-mic-ball.png`)

**Reference**: A dark glass ball (~48-52px) with a prominent blue/cyan outer glow. Inside: a white microphone icon (classic condenser mic shape with a stand/base). This is the RIGHT side of the input bar.

| Iteration | Score | Notes |
|-----------|-------|-------|
| 1-6       | 6/10  | There IS a circular container on the right side of the bottom bar containing a mic icon. The circle appears to be present, which is correct. However, the glow effect is very faint or missing, and the ball looks more like a flat dark circle than a glass ball. The icon shape is correct. |
| 7-12      | 7/10  | The mic ball at bottom-right is more visible in later iterations. Iteration 10-12 show a slightly more defined circular container. Still lacks the strong blue glow halo visible in the reference. The glass effect (internal gradient) is weak or absent. |

**Best**: **Iteration 10-12**. Score: **7/10**.

**Gap**: The blue outer glow in the reference is much more prominent -- it is a defining visual feature of the belo design language. The Figma iterations show a ball that is too flat and lacks the luminous halo.

**Fix needed**:
- Increase outer glow opacity and spread (currently too subtle)
- Add an inner gradient to the ball (darker center -> slightly lighter edge) for depth
- Ensure the ball size matches reference (~48-52px diameter)

---

## 5. Menu Ball (`ref-menu-ball.png`)

**Reference**: A dark glass ball with blue glow containing three vertical dots (kebab menu icon). This sits on the LEFT side of the input bar. The ball has the same glass aesthetic as the mic ball.

| Iteration | Score | Notes |
|-----------|-------|-------|
| 1-6       | 5/10  | There is a three-dot icon at bottom-left. In iterations 1-6, it appears as dots without a clear circular container, or with a very faint one. The dots are white and vertically stacked, which is correct. But the glass ball container is either missing or barely visible. |
| 7-12      | 6/10  | Later iterations show a slightly more defined circular container around the three dots. Still no strong blue glow. Better than 1-6 but still not matching the reference's prominent glass ball. |

**Best**: **Iteration 10-12**. Score: **6/10**.

**Gap**: Same as mic ball -- the glass ball container and blue glow are the signature elements and they are too faint. The dots themselves are correct.

**Fix needed**:
- Make the circular container more opaque/visible
- Add prominent blue outer glow matching the mic ball
- Ensure consistent sizing with mic ball

---

## 6. Input Bar (`ref-input-bar.png`)

**Reference**: A full-width bottom bar containing: LEFT = menu ball + "belo" script text + "GIF" text; RIGHT = mic ball. There is a thin horizontal separator line above the bar. Below the bar area, a white home indicator pill is visible. The "belo" text is in a script/cursive font, muted gray color.

| Iteration | Score | Notes |
|-----------|-------|-------|
| 1-6       | 6/10  | The bottom bar structure is present: three-dot icon on left, "belo" script text in center-left, "GIF" label, mic icon on right. Layout is roughly correct. The "belo" text is in cursive and muted, which matches. The separator line is faint but present in some iterations. |
| 7-12      | 7/10  | Same structure, slightly cleaner. The "belo" and "GIF" labels are more clearly positioned. The overall bar composition is closer to the reference. Iteration 11-12 have the most polished spacing. |

**Best**: **Iteration 12**. Score: **7/10**.

**Gap**: The main deficiencies are (a) the glass balls on left and right are not glowing enough (covered above), and (b) the home indicator pill at the very bottom is missing or very faint in most iterations. The separator line above the input bar should be more visible.

**Fix needed**:
- Add a white home indicator pill at the very bottom center (~134x5px, rounded)
- Make the top separator line slightly more visible (0.15 opacity white line)
- Ensure "GIF" text is positioned correctly between "belo" and the mic ball

---

## Overall Rankings

| Rank | Iteration | Avg Score | Summary |
|------|-----------|-----------|---------|
| 1    | **12**    | **5.8**   | Best overall spacing, cleanest layout, closest to reference structure |
| 2    | 11        | 5.7       | Very close to 12, slightly less polished header |
| 3    | 10        | 5.5       | Good composition, minor spacing issues |
| 4    | 9         | 5.3       | Solid but header elements slightly off |
| 5    | 7b/8      | 5.0       | Decent, introduced better header structure |
| 6    | 4-6       | 4.5       | Mid-tier, correct structure but flat |
| 7    | 1-3       | 4.3       | Early iterations, most issues |

---

## Critical Issues (Blocking -- must fix before shipping)

1. **Phone and Video buttons are NOT in glass balls** (Score: 3/10). This is the biggest miss. The reference clearly shows these as glass balls with blue glow, identical in style to the mic and menu balls. Every single iteration renders them as bare flat outline icons. This completely breaks the belo design language where all interactive icons live inside glass balls.

2. **Glass ball glow is too faint everywhere**. Even where balls exist (mic, menu), the signature blue/cyan outer glow halo is barely visible. The reference shows a prominent, luminous glow that is a core part of the visual identity.

## Non-Blocking Issues (Polish)

3. **Home indicator pill** missing at bottom of screen.
4. **Separator line** above input bar could be more visible.
5. **Back arrow stroke weight** is slightly heavier than reference (minor).

## Recommended Next Steps

1. **Priority 1**: Wrap phone and video icons in glass balls with blue glow (same component as mic/menu balls, just smaller ~36-40px)
2. **Priority 2**: Increase outer glow intensity on ALL glass balls (mic, menu, and the new phone/video ones)
3. **Priority 3**: Add home indicator pill and refine separator line
4. Re-screenshot and re-audit after these fixes
