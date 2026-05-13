# About — Tape-Deck Console

## Context

The About section currently opens a clicked cassette into a 3-panel paper J-card insert that sprawls horizontally in front of the cassette. It reads, but it isn't very "music" — it's mostly paper liner-notes. We want to replace it with a vintage hi-fi tape-deck console that rises into frame when a cassette is clicked, with **two visibly spinning reels, a scrolling amber LCD readout of the section copy, and animated VU meters**. The clicked cassette **physically flies from its position in the ring into the deck's cassette slot**, and the deck retreats when closed. This is the centerpiece interaction of the About section — it should feel theatrical and unmistakably musical.

## Approach

Build a new self-contained tape-deck component that lives next to the cassette ring inside the About reveal. It owns its own 3D mesh tree (chassis, cassette window, LCD display, VU meter strip, control buttons) and its own animation state (rise/retract, reel spin, LCD scroll, VU bounce). The cassette ring keeps its rise / drop / click behavior; clicking a cassette now drives the deck open AND animates that cassette flying into the deck's slot.

**Style direction**: 1980s brushed-aluminum hi-fi (Sony/Pioneer vibe). Dark brushed-metal chassis, chrome trim, warm amber LCD on black, segmented VU bars (green → amber → red).

**Cassette-to-deck handoff**: when a cassette is selected, the ring rotates the selected cassette to front (existing behavior, ring rotation freezes during selection). The cassette's **local position lerps from its ring-rest position to a target position that, in world space, lands inside the deck's cassette window**. Math: with the ring rotated by β=−a (where `a` is the cassette's angle), a target world position (0, dy, dz) maps to cassette-local `(sin(a)·dz, dy, cos(a)·dz)`. The cassette's rotation Y stays at `a` — combined with the ring's −a rotation, the cassette face remains squarely camera-facing throughout the fly-in. The two non-selected cassettes fade + scale down so they don't compete for attention.

Once the cassette lands in the slot, the deck's reels (which are part of the deck, not the cassette) become visible "behind" the cassette face, and the cassette's own painted reel graphics line up with them. A small light reveal: the deck's reel cylinders spin behind a thin transparent layer baked into the cassette window so the user sees motion through the cassette window cutouts.

## Files to create

- **`components/pixel-earth-stage/section-reveals/about-tape-deck.tsx`** — the new component. Renders chassis + cassette window + reels + LCD + VU + buttons. Props: `slab` (currently selected slab data or `null`), `reducedMotion`. Owns rise/retract + reel spin + LCD scroll + VU animation.

## Files to modify

- **`components/pixel-earth-stage/section-reveals/about-globe-reveal.tsx`**
  - Remove the J-card panel meshes from `AboutCassette` and the panel-related animation block in its `useFrame` (`openRef`-driven panel scale/position/opacity, panel mesh+material refs, J-card texture imports/memos/dispose).
  - Replace the cassette's "tilt forward + push back" open behavior with a **fly-to-deck-slot** local-position lerp:
    - Initial local position: existing `(xz[0], yFromRise, xz[1])`.
    - Target local position when open: `(sin(angle)·DECK_WINDOW_Z, DECK_WINDOW_Y, cos(angle)·DECK_WINDOW_Z)`.
    - Lerp via `openRef` for the **selected** cassette only. Non-selected stay at ring position and fade/scale down (existing `hideRef`).
  - Keep ring rotation freeze when `selectedIndex !== null` (existing behavior).
  - In `AboutCassetteRing`, render `<AboutTapeDeck slab={selectedIndex !== null ? slabs[selectedIndex] : null} reducedMotion={...} />` as a sibling of the cassette meshes inside the rotating ring group. Because the deck sits at world origin in front of the camera and the ring rotation is frozen while open, the deck sits in a consistent spot relative to the camera regardless of which cassette is selected.

- **`components/pixel-earth-stage/textures.ts`**
  - **Add** `createTapeDeckLcdTexture(trackNumber, title, body)` — long horizontal canvas (~4096 × 256) painted with warm amber `#ffae3c` dot-matrix-style text on near-black. Static prefix block (`TRACK 02 · 3:12 · INTRODUCTION`) followed by scrolling body copy. Used with `texture.offset.x` animation to scroll horizontally. Wrap repeating.
  - **Add** `createTapeDeckChassisTexture()` — brushed-aluminum noise pattern with faint horizontal grain. Used on the chassis box; subtle so the chrome trim + LCD pop.
  - **Leave** `createJCardLeftPanelTexture`/`Center`/`Right` in place (dormant) — harmless and may be reused later.

## Tape-deck geometry

```
group (root — y eases from DECK_HIDDEN_Y to DECK_SHOWN_Y on open)
├── chassis (box 2.8 × 1.1 × 0.7, dark brushed metal, slight chrome rim)
├── front face plate (slightly proud)
│   ├── cassette window cavity (~1.5 × 0.55, set into chassis with a thin recessed lip)
│   │   ├── reel pair behind the window — two cylinder meshes spinning on Z (radius 0.20, slightly larger than the cassette's painted reels so they peek through the window cutouts)
│   │   └── tape ribbon plane between reels (thin dark strip)
│   ├── LCD strip (plane below window, ~1.8 × 0.22, scrolling amber texture)
│   ├── VU meter row (2 horizontal strips of 12 small emissive box segments each, below LCD)
│   └── control buttons (5 small extruded boxes: REW · PLAY · FF · STOP · EJECT, in a row under the VUs)
│       └── PLAY button: green emissive cap when playRef > 0
└── chrome rim (thin emissive trim around the chassis, additive blending)
```

## Animation refs / behavior

All in `about-tape-deck.tsx` `useFrame`:

- `openRef` (0 → 1) — drives deck rise from `DECK_HIDDEN_Y` to `DECK_SHOWN_Y` and a global scale-in. Lerp rate ~4/s.
- `playRef` (0 → 1) — ramps up once `openRef > 0.85` so the "playing" effects only kick in after the deck is fully present. Drives reel spin rate, LCD scroll, VU activity, PLAY button emissive.
- Reel spin: `reelLeftRef.rotation.z += delta * 6 * playRef`; `reelRightRef.rotation.z -= delta * 6 * playRef` (opposite directions so they read as transport reels).
- LCD scroll: `lcdTexture.offset.x += delta * 0.04 * playRef` per frame, modulo 1.
- VU bars: 24 segment opacities driven by `Math.max(0, sin(t · f_i + phase_i) · playRef − threshold_i)` smoothed via per-segment refs (fast attack, slow decay). Generates a "music playing" feel without real audio.
- PLAY emissive: `playRef · 0.85`.
- Reduced motion: snap to fully-shown state, no reel spin, no LCD scroll, no VU motion, no rise animation.

In `about-globe-reveal.tsx` `useFrame` (selected cassette only):
- Position lerps from ring-rest to deck-slot via `openRef` (cubic-out easing). The cassette is "captured" by the deck.

## State flow

- `AboutCassetteRing.selectedIndex` is the source of truth. `null` = closed.
- `<AboutTapeDeck slab={...} reducedMotion={...} />` mounts inside the ring group. When `slab === null`, deck holds at hidden Y. When `slab` becomes non-null, deck rises and "loads" the new slab.
- Closing (`selectedIndex` → `null`): the selected cassette flies back to ring position; non-selected cassettes return to full scale/opacity; deck retreats.
- ESC handler in `AboutCassetteRing` closes the deck without exiting the section (existing behavior, keep).

## Constants

- `DECK_HIDDEN_Y = -1.6`, `DECK_SHOWN_Y = 1.05`, `DECK_Z = 2.4`
- `DECK_WINDOW_Y = 1.45`, `DECK_WINDOW_Z = 2.4` (target world position for the flying cassette — sits inside the deck's window cavity)
- Reel spin rate: ~6 rad/s at full play
- LCD scroll: 0.04 of texture width / sec
- LCD amber `#ffae3c` on `#0e0805`
- VU palette: 8 green segments → 3 amber → 1 red, per channel

## Camera

Keep the existing About entered camera (`SECTION_CAMERA_TARGETS.about`, pos `[0, 1.95, 3.95]`, lookAt `[0, 1.78, 0]`) for v1. Deck centered at y≈1.05 + cassette flying into y≈1.45 puts the action in the lower-center of frame with the ring just above. If framing feels tight after build, add a secondary entered-deck-open camera target later (additive change, no CameraRig API changes needed now).

## Verification

1. `pnpm typecheck && pnpm lint` — clean.
2. `pnpm dev`, open `http://localhost:3000`.
3. Enter About — 3 cassettes appear as before.
4. **Click each cassette**:
   - Selected cassette flies smoothly from ring position to the deck's cassette window.
   - Non-selected cassettes fade + scale down.
   - Deck rises from below into frame.
   - After rise completes, reels start spinning behind the cassette window, LCD scrolls the section body in warm amber, VU bars bounce, PLAY button glows green.
5. **Close** (click cassette in deck or press ESC):
   - Reels decelerate, LCD freezes, VU calms.
   - Cassette flies back to its ring slot.
   - Non-selected cassettes return to full scale/opacity.
   - Deck retreats below.
6. **Cassette ring rotation**: drag top zone — ring snaps cleanly to each of 3 cassettes (already fixed in prior commit).
7. **Reduced motion**: deck appears statically — no rise / reel spin / LCD scroll / VU motion. Cassette teleports to deck slot instead of flying.
8. **Viewports**: 1280, 768, 375 — verify deck stays in frame and readable.
9. **Section exit**: ESC with deck open → closes deck only. ESC with deck closed → exits section.
