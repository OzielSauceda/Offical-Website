Please inspect the existing homepage globe implementation first, then make a focused visual/layout adjustment without redesigning the component.

Current issue:
The pixel earth stage already looks good stylistically, but it feels too small and too high on the page. It also has an awkward hard cutoff/border at the very bottom of the globe/stage area that makes the globe feel like it is trapped inside a rectangular box. I want the globe to feel like it naturally emerges from the page/stage, not clipped by a visible container edge.

Goals:
1. Make the globe/stage centerpiece noticeably larger.
2. Shift the globe lower, closer to the visual center of the first viewport.
3. Remove or hide the hard bottom cutoff/border/box edge around the globe.
4. Preserve the current pixel-art look, lighting, ring, stars, and dancing character.
5. Keep the drag-to-spin interaction working.

Please look for:
- The homepage hero component.
- The globe/stage component.
- Any CSS or canvas wrapper that may be constraining/clipping the globe.
- Any `overflow: hidden`, fixed height, mask, border, outline, canvas crop, camera position, object scale, or container transform causing the bottom edge to appear boxed.

Implementation guidance:
- Do not rebuild the globe from scratch.
- Prefer changing layout/camera/scale/container styles.
- Increase the globe scale or camera framing so it becomes the dominant center object.
- Move the object downward with a scene/group position, camera target, CSS transform, or hero layout adjustment, whichever fits the existing implementation.
- If the bottom cutoff is caused by clipping, remove the clipping or increase the render/container bounds.
- If the cutoff is intentional geometry, soften it with a glow, fog, shadow, or stage ring so it no longer reads as a rectangular border.
- The final result should look like a floating/staged pixel earth dome in an open dark space, not like a globe inside a cropped box.

Acceptance criteria:
- On desktop, the globe is larger and sits closer to the center of the viewport instead of near the top.
- The bottom of the globe/stage does not show a hard rectangular cutoff or visible container edge.
- The scene still feels atmospheric and pixelated.
- The dancing pixel character remains visible on top.
- Drag-to-spin still works.
- Mobile remains responsive and does not crop the globe awkwardly.

After changes:
- Run the project’s lint/build command if available.
- Start the dev server if appropriate.
- Tell me which files changed and summarize the exact layout/framing adjustments.
