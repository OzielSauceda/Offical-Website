# CLAUDE.md

Operating manual for Claude Code on this repo. Read it before every session. Every rule here exists because skipping it produces a worse site.

**Companion file:** `PROJECT_CHANGES.md` is the living snapshot — current routes, integrations, recent changes, decisions. Read it after this file to understand the *current state*. Update it as part of every change that touches routing, file structure, integrations, or non-obvious decisions (see `PROJECT_CHANGES.md` §8 Maintenance).

---

## 1. North Star

Three success criteria. Every decision serves them. If a change doesn't, push back.

1. **Fast.** LCP < 1.5s on simulated 4G. INP < 200ms. CLS < 0.1.
2. **Accessible.** WCAG 2.2 AA. Keyboard-only navigable. Screen-reader sane.
3. **Maintainable solo.** A future you, six months from now, can change anything in under 20 minutes without re-reading the whole codebase.

---

## 2. Stack

- **Next.js 16** (App Router, Turbopack) — RSC by default.
- **React 19** — Actions, `useOptimistic`, native `<form>` integration.
- **TypeScript** — `strict: true`, `noUncheckedIndexedAccess: true`.
- **Tailwind CSS v4** — CSS-first config in `app/globals.css` under `@theme`. **No `tailwind.config.ts` file.**
- **shadcn/ui** — generated primitives in `components/ui/`, do not hand-edit.
- **Velite** — MDX with Zod-typed frontmatter. (Not Contentlayer — unmaintained.)
- **motion/react** — animation. (Not `framer-motion` — that import path is dead.)
- **react-hook-form + Zod** — forms, same schema client + server.
- **Resend** — transactional email. No-op locally; live on deploy.
- **Vitest + React Testing Library** — units and components.
- **Playwright** — one smoke E2E.
- **pnpm** — package manager. Never `npm` or `yarn`.

---

## 3. Operating Procedure — how a senior dev works here

- **Read before writing.** Before adding a util, grep `lib/` and `components/`. If something close exists, extend it.
- **Rule of three.** Extract a helper when three sites repeat the same logic. Two is coincidence.
- **Plan before editing across >1 file.** State the plan in chat first. Don't fan out blind.
- **Server Components by default.** Add `"use client"` only when you need state, effects, browser APIs, or event handlers. Push the boundary to the leaf, not the layout.
- **Verify before claiming done.** Typecheck + lint + build pass. For UI: render at 375 / 768 / 1280px, tab through with the keyboard, toggle prefers-reduced-motion. Open the actual browser — don't trust the type checker for feature correctness.
- **Comments explain WHY, not WHAT.** Well-named code documents itself. Comment only when the reason is non-obvious (a constraint, a workaround, an invariant). No multi-paragraph docstrings.
- **No premature abstraction.** Three similar lines is fine. A bad helper is worse than duplication.
- **One thing per commit.** Small, focused, imperative subject under 72 chars. No co-author trailer unless explicitly asked.
- **Surface scope creep, don't silently do it.** If the ask grows mid-task, stop and confirm.

---

## 4. Folder structure

```
app/                routes, layouts, metadata, route handlers
  (site)/           public marketing pages — home, about, work, blog, contact
  api/              route handlers (contact, og)
components/ui/      shadcn primitives — generated, do not hand-edit
components/         composed app components (PascalCase exports)
content/projects/   MDX case studies
content/blog/       MDX posts
lib/                pure utilities, Zod schemas, clients (resend, ratelimit)
lib/mdx/            Velite config + MDX component overrides
public/             static assets — images served via next/image
```

**Invariant:** nothing in `lib/` imports from `app/` or `components/`. `lib/` is the leaf of the dependency graph.

---

## 5. Conventions

- **Filenames:** kebab-case (`project-card.tsx`, `use-reduced-motion.ts`).
- **Component exports:** PascalCase (`ProjectCard`).
- **Hooks:** file `use-foo.ts`, export `useFoo`.
- **Imports** (enforced by `eslint-plugin-simple-import-sort`):
  1. `react`
  2. `next/*`
  3. third-party
  4. `@/lib/*`
  5. `@/components/*`
  6. relative (`./`, `../`)
  7. side-effect / styles
- **Types:** prefer `type` aliases. Use `interface` only for extendable public contracts.
- **No barrel files.** `index.ts` re-exports break tree-shaking and inflate build times.
- **No default exports** from non-route files. Named exports only.

---

## 6. Required practices

### Images
- `next/image` always. Never `<img>`.
- `alt` is mandatory. Use `alt=""` *only* for purely decorative images.
- Width and height required (or `fill` + sized parent).

### Fonts
- `next/font/local` or `next/font/google`. Subset to the characters you use. `display: 'swap'`.

### Metadata & SEO
- Every route exports `metadata` or `generateMetadata`.
- `app/opengraph-image.tsx` for OG images (or a dynamic route).
- `app/sitemap.ts` and `app/robots.ts` are mandatory.
- Canonical URL on every page.

### Forms
- `react-hook-form` + `zod`. **The same Zod schema validates client and server.** Define it once in `lib/schemas/`.
- Never trust the client. Re-parse on the server.

### Contact route
- Honeypot field (`name="company"` or similar, hidden, must be empty).
- Rate-limit: in-memory token bucket while local; swap to Upstash on deploy.
- Generic error messages — no stack traces, no library-leaking details, to the client.

### Motion
- Every animated component reads `useReducedMotion()` and bails out (no transition, instant state) when true.
- No autoplay loops longer than 5 seconds. No motion just because we can.

### Accessibility
- Semantic HTML first. `<button>` for actions, `<a>` for navigation, `<nav>`/`<main>`/`<article>`/`<aside>` for landmarks.
- ARIA only when semantics genuinely fall short.
- Visible focus ring on every interactive element. Don't disable `:focus-visible`.
- Contrast ≥ 4.5:1 for text, ≥ 3:1 for UI.

### Errors & loading
- `error.tsx` and `loading.tsx` on every route segment that fetches.
- `not-found.tsx` for the app root.

### Secrets
- `.env.local` only. Never commit. `.env.example` documents the required keys with empty values.

---

## 7. Commands

```bash
pnpm dev          # localhost:3000
pnpm typecheck    # tsc --noEmit — run before every commit
pnpm lint         # eslint — run before every commit
pnpm build        # production build — run before declaring a feature done
pnpm test         # vitest
pnpm e2e          # playwright smoke
pnpm content:new  # scaffold a new MDX file with frontmatter
```

Run `pnpm typecheck && pnpm lint && pnpm build` before saying "done." Not one of the three — all three.

---

## 8. Forbidden

These produce real bugs or real regressions. Do not do them.

- **Don't edit `components/ui/*` by hand.** Re-run the shadcn generator with the new options instead.
- **No `any`.** No `@ts-ignore`. No `eslint-disable` without an inline comment explaining why.
- **No `<img>`.** No raw `<a>` to internal routes (use `next/link`). No inline `<style>`.
- **No `tailwind.config.ts`.** Tailwind v4 is CSS-first; configure in `app/globals.css` under `@theme`.
- **No `framer-motion` import.** Use `motion/react`.
- **No Contentlayer.** Use Velite.
- **No backwards-compat shims or "for later" dead code.** If it isn't used, delete it.
- **No new dependency** when an existing one or the standard library covers the case. Justify additions.
- **No scope expansion** beyond the user's ask. Surface it; don't silently do it.
- **No claiming UI work done without opening a browser.** Type checks don't catch broken layouts.
- **No AI attribution anywhere in the repo.** No `Co-Authored-By` trailers, no "Generated with Claude Code" footers, no references to Claude/Anthropic/AI/assistants/model names in any committed file, commit message, branch name, PR body, or comment. Commit author is the owner's git identity only. The codebase must read as the owner's own work.
- **No AI-flavored comment vocabulary.** Avoid "leverages", "facilitates", "robust", "comprehensive", "elegant", "seamlessly", "utilize", "ensures", "various", "additionally", "furthermore", and similar. Comments are short, plain English. Default is no comment; only write one when the *why* is non-obvious. When you do, write like a tired dev typing fast — short, fragments ok, no decorative banners or multi-paragraph docstrings.

---

## 9. Definition of done

A change is not done until **all** of these are true:

- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm build` passes.
- [ ] Renders correctly at **375px, 768px, 1280px**.
- [ ] Fully **keyboard-navigable**; focus order is sensible; focus rings visible.
- [ ] **Reduced-motion** preference is respected.
- [ ] Lighthouse on the changed route(s): **Performance ≥ 95, Accessibility = 100, SEO ≥ 95, Best Practices ≥ 95**.
- [ ] New MDX content has complete frontmatter (`title`, `date`, `summary`, `tags`, `og`).
- [ ] **`PROJECT_CHANGES.md` updated** if routes, file structure, integrations, or decisions changed. "Last updated" date bumped.
- [ ] Commit subject is imperative mood and < 72 characters.

If any line is unchecked, the work isn't done — say so plainly rather than claim otherwise.
