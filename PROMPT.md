Please use the frontend design skill for this task.

Make this change directly in Default mode. Inspect the current Three.js scene and interaction code first, then implement this carefully without redesigning the scene.

Important clarification:
I do NOT want the circular screen title to simply fade/swap while the screen stays still.

I want the circular screen to behave more like the globe: the user should be able to swipe/drag the circular screen horizontally and rotate it around its vertical axis. The section titles should be physically positioned around the circular screen at fixed angles, so as the screen rotates, different titles come into the front-facing view.

Think of the circular screen like a rotating 360-degree display/carousel.

Section titles:
- About
- Projects
- Research
- Contact

Desired behavior:
- Place each section title at a fixed angular position around the circular screen.
- Example: About at 0 degrees, Projects at 90 degrees, Research at 180 degrees, Contact at 270 degrees.
- When the user drags/swipes the circular screen, the screen/title group should rotate smoothly.
- The active section is whichever title is facing the camera/front.
- When the user releases, the screen should smoothly snap to the nearest section angle.
- The title should feel attached to the screen surface, not like flat UI text floating independently.
- The movement should feel smooth and physical, similar to the globe drag/swipe feeling.

Very important:
- Do not implement this as a simple text state change in the center.
- Do not just crossfade one title into another.
- The titles should move because the circular screen is rotating.
- The title positions should be hard-positioned around the screen at different degrees.
- The circular screen should visually react to the swipe, not just the text.

Interaction separation:
- Dragging/swiping the globe should only rotate the globe.
- Dragging/swiping the circular screen should only rotate the circular screen and change the active section.
- Globe interaction should not change the section.
- Screen interaction should not rotate the globe.

Visual constraints:
- Keep the current scene composition, globe, spotlight, screen size/position, hanging wires, base ring, lighthouse, stars, compass, colors, and camera framing intact.
- Keep the section title style polished and centered when it reaches the front.
- Use a refined modern display font treatment that fits the cinematic circular screen.
- Keep the text readable and visually integrated with the curved screen.

Implementation guidance:
- Ideally create a screen/title group that rotates around the Y axis.
- Attach title meshes/sprites/canvas textures to positions around the circular screen circumference.
- Use smooth drag tracking while the pointer is down.
- Use easing/inertia/snap animation on release.
- Keep section data in a clean config array with title and angle.
- Avoid adding dependencies unless truly necessary.

After editing, run the app locally and verify:
- dragging the circular screen rotates the screen/title carousel smoothly,
- titles are positioned around the screen at fixed angles,
- releasing the drag snaps to About, Projects, Research, or Contact,
- the front-facing title is centered on the circular screen,
- dragging the globe still only rotates the globe,
- dragging the globe does not change the circular screen section,
- mobile touch and desktop mouse interactions both work,
- no unrelated visual changes were introduced.

Please summarize exactly which files changed, what changed in each file, and how you verified it.
