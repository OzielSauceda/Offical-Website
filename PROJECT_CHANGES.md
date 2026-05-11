# PROJECT_CHANGES.md

**Living snapshot + change log.** Read this first in any new session — it answers "what exists, how it's wired, what changed recently" without re-reading the whole codebase. Update it as part of every change (see §6 Maintenance).

Last updated: **2026-05-10**

---

## 1. Status at a glance

- **Phase:** Bootstrapped. Home page hero is live.
- **Working?** `pnpm dev` boots on `http://localhost:3000`. Production build (`pnpm build`) passes. `pnpm typecheck` and `pnpm lint` clean.
- **Next action:** Other routes (`/about`, `/work`, `/blog`, `/contact`). Velite, shadcn, Resend wiring. Sitemap, robots, OG image. See §3 for the unbuilt list.

---

## 2. Stack — installed vs planned

When the value of `Installed` differs from `Planned`, that's a deviation — document why in §5.

| Tool | Planned | Installed | Notes |
|---|---|---|---|
| Next.js | 15 (App Router) | **16.2.6** | `create-next-app@latest` shipped Next 16; bumped accordingly |
| React | 19 | 19.2.4 | |
| TypeScript | strict | 5.9.3 | `noUncheckedIndexedAccess: true` |
| Tailwind | v4 (CSS-first) | 4.3.0 | `@theme` tokens in `app/globals.css`. No `tailwind.config.ts` |
| three | — | 0.184.0 | For PixelEarthStage hero |
| @react-three/fiber | — | 9.6.1 | |
| @react-three/drei | — | 10.7.7 | `<Stars>` used in scene |
| motion | latest | 12.38.0 | new `motion` package, not `framer-motion`. Not yet imported anywhere |
| eslint-plugin-simple-import-sort | — | 13.0.0 | Enforces CLAUDE.md §5 import order |
| shadcn/ui | latest | — | Not yet installed |
| Velite (MDX) | latest | — | Not yet installed |
| react-hook-form | latest | — | Not yet installed |
| Zod | latest | — | Not yet installed |
| Resend | latest | — | Not yet installed |
| Vitest + RTL | latest | — | Not yet installed |
| Playwright | latest | — | Not yet installed |
| pnpm | latest | 10.33.2 | |

---

## 3. Routes map

Every route on the site, what file backs it, and what it does. Update on every add/move/delete.

| URL | File | Type | Purpose | Status |
|---|---|---|---|---|
| `/` | `app/(site)/page.tsx` | RSC | Landing — `PixelEarthStage` hero is the first viewport; placeholder section below | **built (hero only)** |
| `/_not-found` | `app/not-found.tsx` | RSC | Minimal 404 | built |
| `/about` | `app/(site)/about/page.tsx` | RSC | Bio, skills, timeline | not built |
| `/work` | `app/(site)/work/page.tsx` | RSC | Project showcase index | not built |
| `/work/[slug]` | `app/(site)/work/[slug]/page.tsx` | RSC | Case study (MDX from `content/projects/`) | not built |
| `/blog` | `app/(site)/blog/page.tsx` | RSC | Post index | not built |
| `/blog/[slug]` | `app/(site)/blog/[slug]/page.tsx` | RSC | Post (MDX from `content/blog/`) | not built |
| `/contact` | `app/(site)/contact/page.tsx` | Client island | Form (RHF + Zod) | not built |
| `/api/contact` | `app/api/contact/route.ts` | Route handler | Zod-parse → rate-limit → Resend | not built |
| `/sitemap.xml` | `app/sitemap.ts` | Generated | SEO | not built |
| `/robots.txt` | `app/robots.ts` | Generated | SEO | not built |
| `/opengraph-image` | `app/opengraph-image.tsx` | Generated | Default OG image | not built |

**Rule:** routes are RSC unless the column explicitly says "Client island." A client island is a leaf component inside an otherwise-server route.

---

## 4. Integrations & external state

What's wired up to the outside world, and what's not.

| Integration | State | Where | Notes |
|---|---|---|---|
| Resend (email) | Not wired | — | Will activate on deploy. `RESEND_API_KEY` in `.env.local` |
| Rate limiter | Not wired | — | Local: in-memory bucket in `lib/ratelimit.ts`. Deploy: swap to Upstash. |
| Analytics | Not decided | — | Default to Vercel Analytics when deployed |
| Domain | Not purchased | — | Local-only for now |

**Env vars expected** (will live in `.env.example` once bootstrapped):
- `RESEND_API_KEY` — server only
- `CONTACT_TO_EMAIL` — destination address for contact form
- `NEXT_PUBLIC_SITE_URL` — used for canonical URLs, sitemap, OG

---

## 5. Architecture & data flow

How the pieces talk to each other. Update when a flow changes.

### Content (MDX)
`content/{projects,blog}/*.mdx` → Velite build step → typed objects in `.velite/` → imported by route segments. Frontmatter validated by Zod schema in `lib/mdx/schema.ts`.

### Contact form
Browser → `react-hook-form` validates against `lib/schemas/contact.ts` → POST `/api/contact` → server re-parses same schema → honeypot check → rate-limit → Resend → return generic success/error.

### Rendering boundary
RSC by default. `"use client"` only at leaves needing state/effects/events (form, motion wrapper, theme toggle). Never at layout level.

### Home page hero (`PixelEarthStage`)
Lives in `components/pixel-earth-stage/`. Wired into `app/(site)/page.tsx`.
- `pixel-earth-stage.tsx` — client wrapper. Owns drag state (refs) and pointer-event listeners on the outer `<section>`. Loads the heavy R3F canvas via `next/dynamic({ ssr: false })`.
- `stage-canvas.tsx` — the R3F `<Canvas>` host.
- `scene.tsx` — composes the scene: lights, fog, floor, dome, ring, beams, character, star field.
- `dome.tsx` — the rotating earth sphere. Reads target rotation ref each frame, eases toward it. Auto-rotates after `RESUME_DELAY_MS` of no interaction.
- `pixel-character.tsx` — billboarded `<Sprite>` at the north pole. 4-frame spritesheet, swaps frame every `FRAME_MS`. Bobs vertically when motion isn't reduced.
- `glow-ring.tsx`, `stage-beams.tsx` — additive-blended geometry for the bright base ring and the diagonal stage lights.
- `textures.ts` — procedural earth (128×64) and character (128×32) textures, both with `NearestFilter` for the pixel look.
- `lib/hooks/use-reduced-motion.ts` — `useSyncExternalStore` over `matchMedia('(prefers-reduced-motion: reduce)')`. Every animated piece reads it and bails when reduced.

---

## 6. Decision log

Non-obvious choices and the reason. New decisions go at the top.

- **2026-05-10 — Next 16 instead of Next 15.** `create-next-app@latest` shipped Next 16.2.6; sticking with the latest. Updated stack table and CLAUDE.md mentions of "Next 15" to "Next 16."
- **2026-05-10 — Three.js + React Three Fiber for the home hero.** Procedural 128×64 pixel earth texture with `NearestFilter`, sphere geometry at 48×24 segments, billboard character on the north pole. Reason: pure canvas/CSS can't fake the dome depth and lighting of the reference. Heavy bundle is mitigated by `next/dynamic({ ssr: false })`.
- **2026-05-10 — `useSyncExternalStore` for `useReducedMotion`.** React 19's stricter lint rules forbid `setState` inside `useEffect` for media-query subscriptions. `useSyncExternalStore` is the React-19-idiomatic replacement.
- **2026-05-10 — Disabled `react-hooks/immutability` for `pixel-character.tsx` only.** Three.js textures are designed to be mutated each frame to advance a spritesheet; React's immutability rule doesn't apply to external graphics objects. Scoped, file-local disable with a comment.
- **2026-05-10 — No AI attribution in repo.** No `Co-Authored-By` trailers, no "Generated with Claude Code" footers, no AI/Claude/Anthropic references in any committed file, commit message, branch name, or comment. Commit author is the owner's identity only. Reason: owner wants the codebase to read as their own work.
- **2026-05-10 — Plain comments only.** No AI-flavored vocabulary in code comments. Short, plain English. Default is no comment; only write one when the *why* is non-obvious. Reason: AI-flavored phrasing is a tell.
- **2026-05-10 — Velite over Contentlayer.** Contentlayer unmaintained, breaks on Next 15. Velite is active, Zod-typed, smaller config.
- **2026-05-10 — `motion/react` over `framer-motion`.** Package renamed in 2024; `framer-motion` import path is deprecated.
- **2026-05-10 — Tailwind v4 CSS-first config.** No `tailwind.config.ts` — `@theme` in `app/globals.css`. Avoids the agent reflex to create the old config file.
- **2026-05-10 — Single-file `CLAUDE.md`, not a `docs/` tree.** Solo project; friction of jumping between files outweighs organization benefits at this scale.

---

## 7. Change log

Reverse-chronological. Each entry: date, one-line summary, scope (files/routes touched), why. Squash trivial edits — log the meaningful ones.

### 2026-05-10
- **Bootstrapped Next.js 16 + R3F hero.** Scaffolded with `create-next-app@latest` (Next 16.2.6, React 19.2.4, Tailwind v4). Added `three`, `@react-three/fiber`, `@react-three/drei`, `motion`, `eslint-plugin-simple-import-sort`. Built `PixelEarthStage` — pixel-art half-globe with procedural texture, drag-to-spin, auto-rotation, glow ring, additive-blend stage beams, dancing pixel character sprite. Wired into `app/(site)/page.tsx`. Why: site needed a hero that immediately reads as "this is mine" — a dome-stage concert vibe that's interactive and unique.
- **Initial scaffolding plan written.** Added `CLAUDE.md` (operating rules) and `PROJECT_CHANGES.md` (this file). Why: lock conventions before writing the first line of TypeScript so the site doesn't drift into AI-mush.

---

## 8. Maintenance rules

This file decays if it isn't maintained. To keep it useful:

1. **Update on every change that affects routing, file structure, integrations, or a documented decision.** Trivial copy edits don't count.
2. **Bump "Last updated"** at the top whenever you touch §1–§5.
3. **Add a Change log entry** in §7 for anything that changes the surface area (new route, removed dep, swapped library, schema change).
4. **Add a Decision log entry** in §6 when you make a non-obvious choice — especially one that contradicts the obvious default. A future you will thank you.
5. **Tables stay accurate.** If a row is wrong, fix it the same commit that made it wrong.
6. **Don't write essays.** Each entry is one to three lines. If you need more, link to the commit or PR.
7. **No diary entries.** "Worked on the navbar today" is noise. "Added `/work/[slug]` route backed by Velite — case study layout" is signal.
