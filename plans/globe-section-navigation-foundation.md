# Globe Section Navigation — Foundation

> Step 1 of turning the hero globe into the portfolio's section navigator. This plan covers state, gestures, and the screen title display only. Per-section *environments* (colors, palettes, audio, motion choreography) are intentionally left as empty config slots for later PRs.

## Context

The `PixelEarthStage` hero is the first thing a visitor sees. Long-term, dragging or scrolling the globe should rotate the visitor through four portfolio sections — **About**, **Projects**, **Research**, **Contact** — and each section should swap the scene's environment to match. This plan builds *only* the foundation:

- a typed section config that future PRs extend
- a section-state hook that owns the active index, transition progress, and cooldown
- a gesture layer that turns deliberate horizontal swipes / wheel scrolls into one-step section changes, coexisting cleanly with the existing drag-to-spin
- a 3D title rendered on the suspended arena screen with smooth cross-fades

Nothing else. The base scene (globe, atmosphere, ring, beams, lighthouse, screen, cables, stars, parallax, grain) stays visually identical.

## Approach

### 1. Section config — `lib/sections.ts` (new)

```ts
export type SectionEnv = {
  // intentionally minimal — future PRs fill these in
  ringColor?: string;
  beamPalette?: { warm: string; cool: string };
  ambientHue?: string;
  starsIntensity?: number;
};

export type SectionId = "about" | "projects" | "research" | "contact";

export type Section = {
  id: SectionId;
  title: string;
  env: SectionEnv;
};

export const SECTIONS: readonly Section[] = [
  { id: "about",    title: "About",    env: {} },
  { id: "projects", title: "Projects", env: {} },
  { id: "research", title: "Research", env: {} },
  { id: "contact",  title: "Contact",  env: {} },
];
```

Lives in `lib/` per CLAUDE.md §4 (leaf of the dependency graph — no imports from `app/` or `components/`).

### 2. Section navigator hook — `lib/hooks/use-section-navigator.ts` (new)

Owns all of the section navigation logic so `PixelEarthStage` stays small.

**State / refs:**
- `activeIdx: number` — React state, drives re-render of components that need to know which section is active
- `prevIdxRef: Ref<number>` — last section, used by the cross-fade
- `transitionRef: Ref<number>` — animation progress 0 → 1 (read by `<SectionTitle>` each frame; not React state to avoid 60fps re-renders)
- `cooldownUntilRef: Ref<number>` — timestamp; gesture commits are ignored while `performance.now() < cooldownUntilRef.current`
- `swipeStartRef: Ref<{ x: number; t: number } | null>` — pointerDown anchor for swipe detection
- `wheelAccumRef: Ref<{ value: number; lastT: number }>` — wheel delta accumulator with passive decay

**Exposed API:**
```ts
{
  activeIdx,
  prevIdxRef,
  transitionRef,
  onPointerSwipeStart(e),
  onPointerSwipeEnd(e),
  onWheel(e),
  onKeyDown(e),       // ArrowLeft / ArrowRight
  advance(dir: -1 | 1) // imperative, for tests / future links
}
```

**Constants** (top of the file — single source of truth):
```ts
const SWIPE_PX_THRESHOLD = 70;
const SWIPE_MS_MAX = 800;
const WHEEL_THRESHOLD = 80;
const COOLDOWN_MS = 600;
const TRANSITION_MS = 400;
```

**Gesture logic:**
- `onPointerSwipeStart(e)`: record `{ x: e.clientX, t: performance.now() }`. Does **not** touch drag-to-spin state.
- `onPointerSwipeEnd(e)`: read start; compute `dx = endX - startX`, `dt = endT - startT`. If `now > cooldown` AND `|dx| > SWIPE_PX_THRESHOLD` AND `dt < SWIPE_MS_MAX`, call `advance(dx > 0 ? -1 : +1)`.
- `onWheel(e)`: `wheelAccumRef.value += e.deltaY`. Decay value toward 0 if `now - lastT > 80ms`. When `|value| ≥ WHEEL_THRESHOLD` and not in cooldown, call `advance(sign(value))`, then reset accumulator. Call `e.preventDefault()` **only when consuming** the event (i.e., when actually firing a section change) — otherwise let the page scroll normally, so trackpad users can still scroll past the hero.
- `onKeyDown(e)`: ArrowLeft → `advance(-1)`; ArrowRight → `advance(+1)`.
- `advance(dir)`:
  1. `prevIdxRef.current = activeIdx`
  2. `setActiveIdx((idx + dir + N) % N)` — loops (Contact → About)
  3. `transitionRef.current = 0`
  4. `cooldownUntilRef.current = performance.now() + COOLDOWN_MS`

**Transition progress** is advanced by `<SectionTitle>`'s `useFrame` (see §4), not by the hook itself — the hook just resets it.

### 3. Drag-to-spin coexistence

The existing pointerDown / pointerMove / pointerUp handlers in `pixel-earth-stage.tsx` stay **unchanged**. The new hook's `onPointerSwipeStart` / `onPointerSwipeEnd` are called from the same handlers (added at the end of the existing callbacks), so both flows see the same pointer events.

| User input | Spin behavior | Section behavior |
|---|---|---|
| Slow drag (`dt > 800ms`) | Globe spins continuously | No change (too slow to be a "swipe") |
| Quick swipe (`|dx| > 70`, `dt < 800ms`) | Globe spins a little | One section advances on release |
| Tiny click / unintentional drag (`|dx| < 70`) | No visible spin | No change |
| Mouse wheel inside hero | No spin | Accumulator fires once per `WHEEL_THRESHOLD`, with `COOLDOWN_MS` between fires |
| ArrowLeft / ArrowRight when hero focused | No spin | Single section change |

The cooldown (`600ms`) is what stops the user from accidentally double-advancing during a single committed swipe.

### 4. Title rendering — `components/pixel-earth-stage/section-title.tsx` (new)

Uses drei's `<Text>` (already in `@react-three/drei@10.7.7` — no new deps).

**Geometry:**
- Render **N** `<Text>` instances (one per section), all at the same world position on the camera-facing inner face of the arena-screen cylinder:
  - Position: `[0, ARENA_Y, ARENA_RADIUS - 0.04]` where `ARENA_Y = 2.85`, `ARENA_RADIUS = 1.78` (from `arena-screen.tsx`). Roughly `[0, 2.85, 1.74]`.
  - Default rotation (faces +Z = camera).
- All share font size, color (`#f0f4ff`), letter spacing, anchor (`anchorX="center"`, `anchorY="middle"`).
- Per-text material opacity is driven each frame.

**Animation (single `useFrame`):**
```ts
useFrame((_, delta) => {
  // bump progress toward 1
  const dur = reducedMotion ? 0 : TRANSITION_MS / 1000;
  transitionRef.current = Math.min(1, transitionRef.current + (dur > 0 ? delta / dur : 1));
  const t = transitionRef.current;
  for (let i = 0; i < SECTIONS.length; i++) {
    const isActive = i === activeIdx;
    const isPrev = i === prevIdxRef.current && prevIdxRef.current !== activeIdx;
    const opacity = isActive ? t : isPrev ? 1 - t : 0;
    setTextOpacity(textRefs.current[i], opacity);
  }
});
```

`setTextOpacity` writes to the Text instance's material (`text.material.opacity = ...; text.material.transparent = true;`).

**Why N components instead of one swapped string:** drei's `<Text>` re-builds SDF glyph geometry whenever the `children` text changes. Swapping the string mid-frame causes a stutter. Pre-rendering all four texts and animating their opacities is butter-smooth and trivial.

**Font:** start with drei Text's default (Roboto-ish system fallback). A follow-up PR can pass the Geist Sans font URL exported by `next/font/google` — out of scope for this foundation.

**Reduced motion:** when `useReducedMotion()` returns true, set the transition duration to 0 — the title swaps instantly. No flashing.

### 5. Wiring

```
pixel-earth-stage.tsx
 └─ uses use-section-navigator()
 └─ adds onWheel + tabIndex + onKeyDown to the section element
 └─ pipes activeIdx + prevIdxRef + transitionRef into StageCanvas
       └─ stage-canvas.tsx — pass-through props
             └─ scene.tsx — renders <SectionTitle ... />
                   └─ section-title.tsx — N <Text> stack + per-frame opacity
```

**Files to create or edit:**

| File | Status | Change |
|---|---|---|
| `lib/sections.ts` | NEW | Section config + types |
| `lib/hooks/use-section-navigator.ts` | NEW | The hook described in §2 |
| `components/pixel-earth-stage/section-title.tsx` | NEW | N `<Text>` stack with per-frame opacity |
| `components/pixel-earth-stage/pixel-earth-stage.tsx` | EDIT | Call the hook; add `onWheel`, `tabIndex={0}`, `onKeyDown`; combine swipe handlers with existing spin handlers in the same callbacks; thread props down to `StageCanvas`. Update `aria-label` to include the active section title. |
| `components/pixel-earth-stage/stage-canvas.tsx` | EDIT | Thread `activeIdx`, `prevIdxRef`, `transitionRef`, `reducedMotion` (already passed) into `Scene`. |
| `components/pixel-earth-stage/scene.tsx` | EDIT | Add `<SectionTitle activeIdx prevIdxRef transitionRef reducedMotion />` inside the stage group. |
| `components/pixel-earth-stage/arena-screen.tsx` | UNTOUCHED unless title legibility suffers in dev test. If it does, add an optional `dimCenter` prop that darkens a horizontal band in the procedural texture — implement only if needed. |
| `PROJECT_CHANGES.md` | EDIT | Bump "last updated", add §3 route/structure note ("hero now hosts the section navigator"), §6 decision log entry for swipe + wheel + cooldown design, §7 change log entry. |

**No changes** to `dome.tsx`, `atmosphere.tsx`, `glow-ring.tsx`, `stage-beams.tsx`, `pixel-character.tsx`, `shooting-stars.tsx`, `camera-rig.tsx`, `app/globals.css`, or any layout / route file outside the hero.

### 6. Future-proofing

The shape of `Section.env` is deliberately a bag of optional fields. Once this foundation ships, follow-up PRs can add fields without breaking anything:

```ts
env: {
  ringColor: "#9aa9ff",
  beamPalette: { warm: "#ff8aa0", cool: "#9aa9ff" },
  ambientHue: "#1a0f25",
  starsIntensity: 0.4,
}
```

A future `EnvironmentDriver` component inside `scene.tsx` will read `SECTIONS[activeIdx].env`, tween the live scene values toward those targets in `useFrame`, and write them into the existing materials. Stub for that lives in `scene.tsx` (a comment marker is enough — no driver code in this PR).

**Out of scope for this PR (do not implement now):**
- The environment driver itself
- Section content area below the hero
- A bottom-of-hero section indicator (4 dots, etc.)
- Per-section audio, music, or motion choreography
- URL hash sync (`#about`, `#projects`, …) — a likely follow-up
- A `SectionContext` for sharing active section with the page below the hero — only needed once the section content area exists

### 7. Critical files to read before implementing

The implementing model should open these in order:

1. `components/pixel-earth-stage/pixel-earth-stage.tsx` — existing pointer-handler structure and refs (this is where the new hook plugs in)
2. `components/pixel-earth-stage/scene.tsx` — composition; where `<SectionTitle>` is inserted
3. `components/pixel-earth-stage/arena-screen.tsx` — `Y`, `RADIUS`, `HEIGHT` constants used by `<SectionTitle>` positioning
4. `components/pixel-earth-stage/stage-canvas.tsx` — pass-through props pattern
5. `lib/hooks/use-reduced-motion.ts` — pattern to mirror for the new hook
6. `CLAUDE.md` §3 (operating procedure), §4 (folder invariants), §5 (conventions), §6 (a11y), §8 (forbidden)

## Verification

After implementation:

1. **Static checks** — `pnpm typecheck`, `pnpm lint`, `pnpm build` all pass.
2. **Runtime check** — `pnpm dev`, open `localhost:3000`:
   - Arena screen shows **About** centered on its inner face, readable, on top of the existing scrolling pooled-lights texture.
   - Slow horizontal drag (~200ms hold, moves ~30px) → globe spins, title unchanged.
   - Quick right-to-left swipe (`>70px` in `<800ms`) → title cross-fades to **Projects**. Another → **Research**. Another → **Contact**. Another → **About** (loops).
   - Quick left-to-right swipe → previous section.
   - Mouse wheel scroll inside the hero → advances after accumulator crosses threshold; page can still scroll past the hero normally on trackpad / wheel users (only consumed-event wheels call `preventDefault`).
   - Tab onto the hero, ArrowLeft / ArrowRight cycles sections.
   - Toggle OS reduced motion → title swap is instant; everything else still respects reduced motion the way it did before.
   - 375 / 768 / 1280 px widths: title is readable and centered on the screen at each.
   - Compass / ring / lighthouse / spotlights / cables / stars / fog / parallax / shooting stars / grain / nebula — visually identical to before.
3. **Manual smoke** — drag-to-spin still feels the same. Auto-rotation resumes after `RESUME_DELAY_MS`. Wheel events on the rest of the page still scroll normally. Section change has a clean ~400ms cross-fade and a ~600ms cooldown.

## Implementation handoff

This plan is intentionally complete enough that an implementing model can:
- create the two new `lib/` files,
- create the `section-title.tsx` component,
- make the three small edits in `pixel-earth-stage.tsx`, `stage-canvas.tsx`, `scene.tsx`,
- update `PROJECT_CHANGES.md`,
- and verify against §Verification

…in a single session, with no further design questions.
