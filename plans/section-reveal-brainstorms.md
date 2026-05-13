# Section Content Reveal — Earlier Brainstorms (Archive)

History file. These are the directions we considered for the section content reveal *before* settling on the music-format props (cassettes / CDs / vinyl / laminates). Kept here so we can pull from them later if a section ever needs a different treatment, or if the whole approach gets revisited.

Order: v1 (broad direction sweep) → v2 (wow-tier sweep) → what we actually shipped.

---

## v1 — Broad direction sweep

First pass. Four concepts trying to map the design space before narrowing.

### Concept A — Stage Screen Zoom (the screen IS the content surface)

The rotating arena screen tilts forward toward the camera and zooms to fill the viewport, becoming a full-screen "tour poster" for the section. Content renders directly on the screen surface as if projected. Environment continues to live behind it, dimmed.

- The arena cylinder mesh is animated (motion/three) — its scale, position, and rotation interpolate so its face fills the viewport.
- Content rendered via `<Html transform occlude>` parented to the screen mesh, or HTML overlay positioned to match the screen's projected screen-space rectangle.
- Stage beams dim ~40%, environment fog density raised slightly.
- Exit: back chevron at top-left or ESC reverses the zoom; carousel resumes.

**Feels like:** Donda listening party — the screen rolls forward, becomes everything.

**Trade-off:** uses an element that's already there; the existing rotating screen IS the navigation surface, so reusing it for content is conceptually tight. R3F-to-HTML alignment is fiddly; `<Html transform>` can blur small type unless `distanceFactor` is tuned. Content size constrained by screen aspect.

### Concept B — Liner Notes Drawer (bottom panel, environment stays alive)

The section title acts like a vinyl sleeve; clicking pulls out the liner-notes booklet from the bottom. A frosted-glass HTML panel slides up to ~55% of viewport height. The 3D scene stays visible in the top 45%, camera tilts up ~6°, lights dim so the environment becomes ambient backdrop.

- HTML component `<SectionContentPanel />` rendered as a sibling of the canvas.
- motion/react `<motion.div>` with `y` from `100%` to `0` on enter, spring config.
- Camera tilt: small `targetY` shift on the look-at point only when `entered` is true.
- Stage beams intensity multiplier prop.
- Per-section panel styling — cool blue for About, warm grey-orange for Projects/mountain, deep amber for Research/bridge, candlelit warm-white for Contact/house.
- Album-credit typography (Garamond/serif headlines, mono metadata). Scan-lines + grain CSS layer for album-print feel.

**Feels like:** unfolding album liner notes — the environment is the cover photo, the panel is the inside.

**Trade-off:** simplest to ship and the most flexible for actual content (long form text, project cards, contact form). Plays well with motion/react. Works on mobile. **Reads as a modal**, which is what the brief specifically tried to avoid.

### Concept C — Walk-On Content Node (in-world signage)

The pixel character walks/teleports to a specific content node that lives inside each environment, camera dollies in, and content is presented as part of the world: a stone slab inscribed with the section copy on the mountain, a glowing podium in front of the dome, an open briefcase on the research bridge, a porch sign on the house.

- One content surface per environment, sibling to the existing env files. Environments themselves stay untouched.
- New camera state: per-section target stored alongside `SECTIONS`.
- Character animation: lerps to its node position on enter, lerps back on exit.
- Content rendered via `<Html transform occlude>` on the node surface.

**Feels like:** walking onto the stage and reading the credits painted on the set piece.

**Trade-off:** most immersive; content lives in the world, never breaks the spell. Four new content-node components + four camera moves + character animation logic = biggest scope. Hardest to do well on mobile (small text on tilted surfaces). Highest chance of cutting corners.

### Concept D — Light Cue: 3D Cards Around the Stage

Click triggers a stage cue change. Stage lights snap to a new state (single tight key light on the character, side beams off), the arena screen fades through black and reappears displaying just the section title in oversized type, and a small set of 3D content cards rise from the stage floor and arrange themselves in a semicircle around the character. User can drag to rotate.

- `<SectionCardRing />` rendered in `scene.tsx`, only when `entered` is true.
- Cards are simple plane meshes with text textures (or `<Html transform>` for crisp HTML text).
- Re-uses rotation logic from `use-section-navigator.ts` for the card ring drag interaction.
- Stage beam intensity modulated via new prop. Arena screen renders a different texture while entered.

**Feels like:** the stage cueing into the next song — the same lighting language as the rest of the site, applied to content.

**Trade-off:** pure 3D, never breaks immersion. Reuses the carousel-rotation mechanic the user already understands. 3D cards have to be designed thoughtfully or they read as floating rectangles. Hard to do long-form copy this way.

### v1 verdict

Concept B got cut on the modal-feeling argument. The other three were workable but didn't *individually* feel like the wow swing the brief asked for. Moved to v2 to push harder.

---

## v2 — Wow-tier sweep

Second pass after the "make it actually impressive" feedback. Three concepts swinging bigger.

### Concept X — Concert Cue: Per-Environment Reveal *(chosen)*

ENTER triggers a stage cue. All beams snap to a single tight key light on the character. The arena screen freezes, flickers, and displays the section title in oversized brutalist type. Then the environment itself **transforms** to reveal its content. Each section gets its own reveal animation, tied to its stage's identity.

- **About / Globe:** the globe slowly lifts a few units, rotating to face the character. From the platform beneath, three monolithic stone slabs rise like a Stonehenge arrangement around the character. Each slab is inscribed with one section of "about" copy. Slabs glow at their edges with the cool-blue spotlight palette.
- **Projects / Mountain:** the camera dollies a little closer. From the carved facets of the mountain, project tablets push outward like cards being dealt — each one a project tile (image + title + role + year). They float in a fan arrangement at chest height around the character, gently parallaxing with the mouse.
- **Research / Bridge:** the bridge's glass side panels detach and lift, floating around the character at staggered heights. Each panel becomes a research item (paper, talk, repo) with a glowing rim. Faint connecting "data lines" trace between related items.
- **Contact / House:** the house's roof slowly opens like a music box, candlelit warm light spills upward, and three tablets rise from inside carrying contact methods (email, links, in-world message form). The cross on the roof rotates to face camera.

**Camera:** smooth dolly in (~0.6u), tilt down ~4°. On exit, smooth return.

**Drag mechanic:** the same drag-to-rotate gesture from the carousel now rotates the ring of slabs/tablets around the character. Same vocabulary, different objects.

**Why this wows:** every section has its own moment. No portfolio I'm aware of has four distinct in-world content reveals that mirror the stage's character. The site stops feeling like a portfolio and starts feeling like a venue with four rooms.

**Trade-off:** scope. Four new content-cluster components, four small environment-tied animation hooks, one shared camera move, one shared beam-cue, ENTER chip + state plumbing. Roughly 2–3 sessions if per-env reveals stay at ~3 floating elements each. Scope is controlled by prototyping one section first.

### Concept Y — Screen Becomes the World

The rotating arena screen above the stage swells massively, descends past the camera, and the camera pushes *through* it. On the other side, a black void with the character lit by a single key light. Around the character, a tight ring of content cards floats at chest height. The original environment still exists in the periphery — reduced to glowing silhouettes / audio-react bars / wireframes so you remember which stage you came from.

**Why this wows:** the transition through the screen surface is dramatic and unfamiliar. The user feels like they passed through a portal. The single mechanic works for every section, so it's much less code than X.

**Trade-off vs. X:** every section feels the same once you're in. The wow factor is in the transition, not the destination. X distributes wow across every section; Y front-loads it into the transition.

**Scope:** much smaller than X. One screen-swell animation. One shared content-ring component (4 instances with different content). One camera push.

### Concept Z — Performer Hydraulic Lift

Stage beams dim. The character is lifted on a glowing hidden stage elevator (~1.5u up). The environment falls away below. Around the character at the new height, a circular platform forms and content cards rise on pillars in a semicircle. Camera tilts up to track. Feels like a Kanye performance moment — the artist being raised into the spotlight to deliver the next song.

**Why this wows:** direct quote from concert staging. Same mechanic for every section, but the elevator move is dramatic and the height shift makes content feel like it's being delivered from on high.

**Trade-off:** the lift abandons the carefully built environment below. After the lift, you're essentially in a small void above the stage with content. Less interaction between content and environment than X.

**Scope:** small-medium. Single shared lift animation. Per-section content cluster. Camera follow.

### v2 verdict

Picked X. The argument was: the four distinct environments are the site's biggest visual asset, and a reveal that uses them (X) is more beautiful than one that hides them (Y, Z). Y and Z were tabled — both still on the table as alternatives if X ever got tired.

---

## What we actually shipped

The plan was Concept X with stone monolith slabs as the props. After the slabs landed and read as "warehouse stage props" rather than Kanye-coded, the prop component got swapped twice more:

1. Stone monoliths → "listening-set cards" with track numbers and dividers → felt like a generic concert setlist
2. → album-cover treatments (cream/black/red palette, three different cover styles per slab) → closer but still abstract
3. → **physical music-format props** (cassettes for About, CDs in cases for Projects, vinyl LPs planned for Research, backstage laminates planned for Contact)

The architecture from the original Concept X plan stayed unchanged through all of this — the prop is a leaf component, so only its geometry + face texture got swapped. Camera, beams, screen flash, dome lift, state plumbing, ENTER chip, drag-rotated content ring all stayed identical to the original plan.

---

## Hybrid we never tried

The single move that would be *more* impressive than either the brainstorms or what's shipped: take **Y's entry transition** and bolt the **music-format props** onto its destination.

- ENTER triggers Y's screen-swell + camera-punch-through-the-surface.
- On the other side: the music-format props (cassettes / CDs / vinyl / laminates) instead of generic content cards.
- Original environment reduced to glowing silhouettes in the periphery so you remember the room you came from.
- Exit reverses the punch.

Wow-factor from Y plus ownable destination from the shipped version. If we ever want to push the reveal harder, this is the move.
