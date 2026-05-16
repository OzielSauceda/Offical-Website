Use Auto Mode. Use maximum reasoning effort.

I am attaching:
1. Target reference image.
2. Current front/angled screenshot.
3. Current rotated/back screenshot.

The current version has two main problems:
1. There is a weird glare/hot white flare when rotating the star. I do not like it. Remove or greatly reduce this artifact.
2. The lighting still does not match the target reference. The star is bright, but the glow/facet/detail balance is wrong, and the rotated/back view is still too plain.

Preserve:
- 360-degree swipe rotation must keep working.
- Do not reintroduce rotation clamps.
- Keep the star large and centered over the platform.

Main files:
- components/star-core-hero/reference-star-shell.tsx
- components/star-core-hero/circuit-traces.tsx
- components/star-core-hero/star-core.tsx
- components/star-core-hero/scene.tsx
- components/star-core-hero/overhead-beams.tsx
- components/star-core-hero/platform-glow-ring.tsx

Task A: remove the weird glare artifact

Find the source of the moving/rotating glare. Likely causes:
- camera-facing sprite glow attached to the star
- too-strong additive center glow
- white emissive layer that blooms incorrectly
- material reflectivity/clearcoat/specular creating a harsh moving highlight
- overlapping white layers z-fighting or stacking additively

Fix requirements:
- Remove the harsh glare that appears while rotating.
- Avoid large camera-facing white sprites on the star face if they create the artifact.
- Replace any circular/flat glare with subtle shaped glow:
  - smaller
  - lower opacity
  - vertical/faceted
  - not camera-facing if that causes the problem
- Avoid z-fighting between stacked planes.
- The star can still glow, but it should not have a distracting moving white flare.

Task B: rebalance lighting to match the reference

Current lighting issues:
- Star face is too uniformly white in places.
- Center is overexposed in front view.
- Back view is too flat/plain.
- Outer cyan aura is strong but the star’s internal lighting/facets are not refined enough.
- Platform ring competes a bit with the star.

Lighting goals:
- Star should be the brightest object.
- Keep a strong white/cyan aura around the star, but make it soft and controlled.
- Add subtle white edge bloom around the silhouette.
- Keep overhead beam visible but not washing out the star face.
- Reduce any harsh specular glare.
- If needed, lower scene light intensity and rely more on controlled emissive/basic materials.

Task C: improve face and back detail after glare removal

Front:
- Restore visible broad triangular facets.
- Restore subtle embedded circuitry/grooves.
- Details must not disappear under white glow.
- Keep near-white tones, not gray.

Back:
- The rotated/back view should not be a plain flat white star.
- Add mirrored or simplified back facets.
- Add very subtle back linework or inner star/facet motif.
- Back can be less detailed than front, but it must look intentional.

Task D: side/rim polish

- Keep side/rim thin, luminous, icy cyan-white.
- No chunky gray slab.
- Side view should look like a polished glowing object.
- Rim should connect front and back cleanly.

Verification:
- Run `pnpm typecheck`.
- Run `pnpm build`.
- Use/start local dev server.
- Manually rotate the star 360 degrees.
- Specifically check for the weird glare while rotating.
- Inspect front, angled, side, and back views.
- Inspect mobile default view.
- If the glare is still visible, keep iterating before stopping.
- If back view is still a plain white icon, keep iterating before stopping.

Acceptance criteria:
- 360 rotation still works.
- Weird moving glare is gone or greatly reduced.
- Lighting is softer and more reference-like.
- Front face keeps visible facets and subtle detail.
- Back view has intentional detail.
- Star remains bright, premium, and close to the target reference.