# legacy-pixel-earth-stage

Original homepage hero: a stage-inspired R3F scene built around a circular
arena screen, a pixel Earth globe, drag-spin interaction, cassette and CD
section reveals, a pyramid stage, a research bridge, and a contact house.
Replaced by `components/star-core-hero/` on 2026-05-16.

## What's here

- `components/pixel-earth-stage/` — full scene tree (R3F, drei, custom
  shaders for beams, dome smoke, and rim glow).
- `lib/` — stage-only modules: `sections.ts`, `section-content.ts`,
  `section-palette.ts`, `section-camera-targets.ts`, plus three
  stage-only hooks (`use-entered-section`, `use-section-navigator`,
  `use-content-ring-rotation`).
- `public/textures/earth-blue-marble.jpg` — Earth texture used by the
  globe.

## Why archived, not deleted

The section navigator, J-card reader, dome rim glow vocabulary, custom
beam shaders, and cassette and CD geometry are reusable for future
work. Kept here as reference and as a drop-back if the new hero needs
to be reverted.

## Restoring

1. `git mv archive/legacy-pixel-earth-stage/components/pixel-earth-stage components/pixel-earth-stage`
2. Move the `lib/` files back to `lib/`.
3. Move the texture back to `public/textures/`.
4. Re-import `PixelEarthStage` from `app/(site)/page.tsx`.
5. Restore the old globals.css tokens (see git history).
6. Drop `archive` from `tsconfig.json` `exclude`.
