# Temporary FORM fashion placeholders

These are demo assets for the native UI prototype, not production photography, actual catalog items, user photographs, or real virtual try-on results. The `products/` pack is curated free stock (see below); the remaining images are AI-created mocks. Prices, brand names, outfits, preferences, and profile content shown in the UI are fictional demo content.

## Product photography — `products/<category>/<productId>.<ext>` (DEMO STAND-INS)

`products/` holds curated free-stock photography standing in for the catalog — sourced from Pexels and Unsplash, then cropped locally to 4:5 portrait (garments) and 1:1 (shoes). These are not photographs of the actual catalog items; each photo is matched to its item's colorway, and the brands, prices, and products shown in the UI remain fictional. **Replace with the licensed production pack by overwriting the same filenames — no code changes needed** (if the extension changes, update the `require` path in `src/data/photography.ts` only).

Filename = catalog product id (`src/data/catalog.ts`); folder = garment category:

- `tops/` — `crew` `shirt` `fine-knit` `warm-knit`
- `bottoms/` — `pleat` `straight` `linen` `relaxed`
- `outerwear/` — `jacket` `overshirt`
- `shoes/` — `sneaker` `loafer` `canvas` `runner`
- `accessories/` — (empty; reserved for future catalog pieces)

Curation rules observed across the pack: one crop per source photo (no two tiles from the same shoot), no people wearing the garments, no mannequins, no readable brand text on the catalog piece, and each photo matched to its catalog colorway. Known compromises: `relaxed` is a fabric-and-drape detail (the source's hanging pairs carry readable third-party labels, cropped out), `pleat` and `fine-knit` are folded-stack still lifes, `straight` reads as a pale washed grey rather than mid-grey, and `runner` is cream rather than grey (every grey retro runner in the search space carried a competitor's mark). The `overshirt` frame's background garment carries a woven label that is sub-legible at tile size.

Per-file provenance (source photo ids, before cropping):

- `jacket` ← Pexels 8113002 · `overshirt` ← Pexels 6461394 · `crew` ← Pexels 9603630 · `shirt` ← Pexels 22441297 · `fine-knit` ← Pexels 7691347 · `warm-knit` ← Unsplash photo-1611312449297-a69dc9c3987b
- `pleat` ← Pexels 11176394 · `straight` ← Pexels 1082528 · `linen` ← Unsplash photo-1715233749622-3216fe49e682 · `relaxed` ← Pexels 20094389
- `sneaker` ← Pexels 7193626 · `loafer` ← Pexels 10259873 · `canvas` ← Pexels 8079829 (a Vans pair — the catalog names the brand) · `runner` ← Pexels 13536939

The manifest `src/data/photography.ts` maps each id to its file plus a declared aspect ratio (garments 4:5, shoes 1:1). CollageBoard sizes every tile by the image's own aspect and re-measures each loaded image, so a pack with mixed portrait, square, and landscape crops composes correctly without touching code.

Art direction: premium menswear ecommerce/editorial — natural directional light, restrained shadows, warm neutral palette (black / cream / charcoal / taupe / navy / bone), no white-background cutout feel. The tiles are deliberately drawn from different shoots with varied backdrops so boards read as a curated wardrobe rather than one catalog sweep. Demo-only until replaced.

These images feed three surfaces: the For You stage (one large garment), the Edits collage boards (assembled per look at runtime), and product galleries.

## Legacy mock photography

Generated with the built-in imagegen tool as one coherent fashion contact sheet, then split into bundled JPEG assets with System.Drawing. The original generated file remains in the user's generated_images directory. No remote image requests are needed to use the UI.

Assets: jacket-cutout.png and outfit-cutout.png are the transparent hero assets consumed by the UI. quiet-confidence.jpg, night-out.jpg, weekend-ease.jpg are the model and saved-look images; portrait.jpg is the square avatar. knit.jpg and trousers.jpg are detail crops for discovery. jacket.jpg and outfit.jpg retain the original backdrop versions as mock source material.

Prompt: Six images in a three-column, two-row contact sheet: an isolated chocolate suede jacket; a flat lay with chocolate jacket, ivory knit, charcoal trousers, ivory sneakers, sunglasses and tote; one dark-haired male model in chocolate/ivory, charcoal, and ivory outfits in a warm limestone interior; and a matching sunglasses portrait. Warm cream, bone, brown, charcoal, and ivory palette. Restrained premium editorial photography, realistic fabrics, soft directional sunlight. No UI, text, borders, logos or watermarks.

Replace these assets with licensed production photography before shipping. The reference names are illustrative and do not imply that the pictured jacket is an Our Legacy product.

Cutout prompts: Extract only the jacket / outfit from its contact-sheet panel; preserve proportions, chocolate color, texture and arrangement; remove the cream backdrop and other panels; use true transparency with faint grounding shadows and five percent breathing room. No text or UI. Both cutouts were made with the built-in imagegen tool.

Preview saves are held in a separate in-memory Zustand store and reset on a full reload. Existing persisted domain state remains intact.
