We are continuing the eye refinement, but this pass must focus on only ONE thing:

Make the eyes match the reference's overall presence:
- slightly larger
- slightly farther apart
- less muddy/brown around the outer lens
- still the same current eye design

Do not redesign the eyes.
Do not change the star, platform, camera, background, lighting, or interaction.
Do not change inner ring/dot/highlight/accent geometry.
Do not change addEyeJewelPath() in this pass.

Only edit:
components/star-core-hero/reference-star-shell.tsx

Only change:
1. drawEyesIntoStar() constants
2. the opacity/color strength of the outer halo and full lens fill in drawEye()

Current problem:
The current eyes are close, but compared to ReferenceImage.png they still look like small muddy brown ovals. In the reference, the eyes have a clearer glowing amber rim and a darker center, but the brown outer lens is not as opaque/heavy. The eyes also need slightly more visual presence.

In drawEyesIntoStar(), replace the current constants with these:

const EYE_Y = 0.07;
const EYE_X = 0.345;
const EYE_RX = 0.205;
const EYE_RY = 0.318;

Keep tilt exactly:
left: 0.2
right: -0.2

Keep innerOffset exactly:
[0.0, -0.1]

Do not change accent offsets or accent colors in this pass.

In drawEye(), only adjust layer 1 and layer 2.

Layer 1: outer peach halo
Keep the same shape and scale, but make it brighter at the edge and less muddy in the fill.

Change:
ctx.shadowBlur = 38;
ctx.shadowColor = "rgba(255,184,92,0.82)";
const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, rxPx * 1.9);

Use these color stops:
0.00 "rgba(255,232,180,0.18)"
0.34 "rgba(255,178,95,0.16)"
0.62 "rgba(255,128,110,0.07)"
1.00 "rgba(255,170,100,0)"

Keep:
addEyeJewelPath(ctx, rxPx, ryPx, 1.32, outerSign);

Layer 2: outer lens fill
This is currently too brown and opaque. Make the full lens more transparent and more golden near the rim.

Use these stops:
0.00 "rgba(255,242,200,0.28)"
0.30 "rgba(235,176,110,0.24)"
0.62 "rgba(92,68,72,0.22)"
1.00 "rgba(34,30,44,0.20)"

Do not change layer 3 dark interior.
Do not change rim lineWidth.
Do not change inner ring.
Do not change dots.
Do not change catchlight.
Do not change final veil.

Expected screenshot result:
- eyes become about 10% larger
- eyes sit slightly farther apart
- the outer brown oval becomes less muddy
- the dark center and ring stay the same
- the eye should feel closer to the reference before we tune colors further

After this pass, stop and show the screenshot.
Run:
pnpm typecheck
pnpm lint
pnpm build