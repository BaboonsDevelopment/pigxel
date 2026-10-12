# Pigxel landing artwork

All images were generated with the built-in image-generation tool. The landing labels them as AI art studies, not community submissions. The mascot follows the user's supplied pink pixel-pig references. Assets are stored in the project under `apps/web/public/art/`.

## Pigxel mascot

Asset: `apps/web/public/art/pigxel-mascot.png`.

Prompt: Use case: stylized-concept. Asset type: Pigxel website mascot cutout. The two attached images are character identity references. Create one awake standing pink pixel pig matching the SECOND reference: chunky cubic head, big black eyes with tiny white square highlights, rectangular pink snout with two dark nostrils, floppy block ears, stocky rectangular body, four short legs with dark chocolate hooves, tiny curly tail. Three-quarter view facing right. Keep the coral pink pixel shading and stepped pixel silhouette of the references, cute but beautifully crafted, no smooth 3D rendering. Full body, centered, generous clear margin. Isolated on genuinely transparent background with real alpha. No floor or shadow, no text, no Z letters, no toolbar, no screenshot UI. Only one pig.

Final edit prompt: Replace the entire gray checkerboard background with perfectly flat solid pure white #FFFFFF. Preserve the pig exactly, including every pixel shape, pose, face and color. The spaces between the legs and inside the curly tail must also be pure white. No checkerboard anywhere. No shadow, no floor, no text, only the identical pink pig on flat white. Keep full-body framing.

The first generation did not provide an alpha channel; the final asset intentionally has a white background to match the landing.

## Sunlit coast

Asset: `apps/web/public/art/sunlit-coast.png`.

Prompt: Use case: stylized-concept. Asset: landscape pixel-art gallery artwork for Pigxel. Create an extraordinary intricate genuine pixel art scene, 3:2 landscape. A tiny cream-colored seaside house with terracotta roof on a sun-drenched Mediterranean island, turquoise sea, peach clouds, pine trees, bright flowers and a winding stone stair down to a small boat. Beautiful carefully clustered pixels, limited sophisticated warm coral / teal / golden cream palette, clearly visible consistently sized square pixels, hard edges, subtle pixel dithering, layered depth like premium indie game environment art. Inviting expansive composition with sea and sky, detailed focal house. No text, no frames, no UI, no smooth painted gradients or 3D render.

## Secret shrine

Asset: `apps/web/public/art/secret-shrine.png`.

Prompt: Use case: stylized-concept. Asset: landscape pixel-art gallery artwork for Pigxel. Create an extraordinary intricate genuine pixel art scene, 3:2 landscape. A secret forest shrine with a little wooden gate, lanterns, stone steps, giant ancient tree roots, a luminous jade stream and tiny orange koi, soft sunlight through dense emerald canopy and little pale wildflowers. Sophisticated sage/jade/pine greens, warm amber lights, blue shadows. Beautiful carefully clustered pixels, clearly visible consistently sized square pixels and hard edges, subtle pixel dithering, layered atmospheric depth like premium indie game environment art. Wide contemplative composition, immersive magical woodland. No text, frames, UI, no smooth painted gradients or 3D render.

## After Hours

Asset: `apps/web/public/art/after-hours.png`.

Retained from the earlier landing as the night scene in the carousel. The pig-face brand icon, interface, carousel transitions, typography, and decorative animation are implemented in code.

## Generation prompt

Use case: stylized-concept. Asset type: hero artwork for Pigxel, a web studio aimed at highly skilled pixel artists. Generate a masterful, atmospheric, strictly pixel-art scene, landscape aspect 3:2. An intimate overgrown rooftop artist's studio above a dense futuristic Japanese-inspired city at blue hour. Central tiny illuminated workshop with giant warm amber windows, hanging plants, a workbench and monitor visible inside, rooftop water tanks, antennas, cables, a little lone silhouette looking out at the distant city. Layered towering buildings fading into deep indigo twilight, turquoise window clusters, magenta small illuminated signs with abstract glyphs, warm peach light reflected on wet rooftop tiles, a narrow elevated railway in mid-distance, dramatic painterly composition achieved ONLY with square pixel clusters. Sophisticated restrained palette: midnight navy, petrol blue, desaturated plum, coral amber, mint highlights. Exceptional intentional pixel clusters, sharp 1-pixel highlights, selective outlines, clean readable architecture, nuanced dithering in shadow edges. Looks like a lovingly crafted 480x320 indie-game background enlarged with nearest-neighbor scaling. A complete immersive environment edge to edge, no borders, no UI, no titles, no readable text, no watermark. Avoid smooth gradients, blur, anti-aliased shapes, generic AI pseudo-pixel texture, 3D rendering or photorealism. The artwork should reward close inspection and appeal to expert pixel artists.

## Art wall additions (October 2026)

Assets: `apps/web/public/art/wall/*.png`. Generated with Gemini (`gemini-3.1-flash-image`). Scenes are 3:2 and resized to 960px wide; sprites were drawn on flat magenta, keyed to transparency and trimmed, and sit on a pastel `tint` card on the wall.

Every prompt ended with the shared style: “Genuine high-quality pixel art, like a lovingly crafted premium indie game. Clearly visible, consistently sized square pixels, hard edges, carefully clustered pixels, limited harmonious palette, subtle dithering. No text, no UI, no frame, no border, no watermark, no smooth gradients, no 3D render, no blur.” Sprites added: “One single cute character or object, full body, centered with generous empty margin, chunky readable silhouette with a dark 1-pixel outline, soft pastel shading. Background: perfectly flat solid pure magenta #FF00FF.”

Scenes: snowy mountain village at dusk; sunny coral reef with a turtle and treasure chest; cozy morning bakery with a sleeping cat; space station room with a ringed planet and floating cat; autumn forest path with a fox; desert oasis at sunset with a camel caravan; rainy neon street with a ramen stand; floating sky islands with waterfalls and a hot air balloon; spring Japanese garden with a koi pond; pirate ship sailing to a tropical island. Sprites: baby dragon, frog wizard, treasure chest, cat astronaut, three potions, slime knight.

Second batch, so every card on the wall is a different picture: scenes of a stormy lighthouse, a magic library tower, a sunrise farm, a Halloween pumpkin village, a volcano island with dinosaurs and an ice cave with a penguin explorer; sprites of a fox adventurer, an octopus chef, a mushroom house, a sleepy owl, a tiny castle and a coffee mug with a cookie.

Third batch, for the wall's eighth column: scenes of a treehouse village at dusk and a steam train on a mountain viaduct; sprites of a snail carrying a cottage, a sleepy panda and a little rocket.

## Painting pig animation

Assets: `apps/web/public/art/animate/paint-1.png` … `paint-4.png`, used by the Animate and Export demos. Generated with Gemini (`gemini-3.1-flash-image`) as one 2×2 sheet on flat magenta, with `pigxel-mascot-sitting.png` attached as the character reference: the same pig sitting at a small easel, brush raised, a green stroke, a yellow dot, then the finished flower with a happy closed-eye smile. The cells were cut apart, aligned on the parts that don't move (the tail and the feet and easel legs), and keyed to transparency.
