# FORM — Project Scope

## Product thesis

FORM is a personal fashion intelligence layer.

A user should be able to upload a small set of reference photos, provide basic sizing and style preferences, then ask for an outfit in natural language such as:

> Dinner in Manhattan, under $350, elevated but understated.

FORM should return complete looks composed only from real purchasable products, explain why each look fits the user's taste and context, provide exact product links, and generate a realistic visualization of the user wearing selected items.

The long-term product is not "AI image generation for clothes." It is a persistent model of how a specific person wants to look, shop, dress, and spend.

## Core product loop

1. Build user profile.
2. Parse occasion, budget, weather/context, and style intent.
3. Retrieve real products from commerce providers.
4. Filter candidates deterministically.
5. Rank and assemble outfits with GLM 5.3 Flash.
6. Visualize selected products on the user.
7. Save explicit and implicit feedback.
8. Improve future recommendations.

## MVP success criteria

The first real backend-connected MVP is successful when a user can:

- create an account;
- upload private reference photos;
- save sizing and style preferences;
- enter an occasion and budget;
- receive three outfits made exclusively from real product records;
- open exact merchant links;
- select one item or look and generate a virtual try-on;
- like, dislike, save, or skip recommendations;
- return later and retain their profile and history.

## V1 non-goals

Do not block launch on:

- physically guaranteed sizing;
- a full 3D body scan;
- automatic closet import;
- social feeds;
- creator features;
- native checkout;
- video generation;
- advanced travel packing;
- brand-sponsored placements;
- production-grade collaborative filtering;
- perfect multi-item full-look rendering.

## Product principles

### Real products only
The language model never invents SKUs, prices, retailers, images, product URLs, sizes, or stock. It may only select IDs supplied by the catalog layer.

### AI creates new information; software manipulates known information
Use generation when the visual content materially changes. Use deterministic/local tools for recoloring, cropping, compositing, caching, filtering, and repeated views.

### User trust over monetization
Recommendations should optimize for the user. Affiliate economics must not silently bias ranking.

### Persistence is the moat
The system should get better as it observes:
- likes/dislikes;
- saves;
- try-ons;
- merchant clicks;
- purchases when observable;
- returns when observable;
- style edits;
- fit feedback.

### Fashion-specific models for garment fidelity
General image/video models can polish scenes and motion. A specialized VTON model should remain responsible for preserving garment identity.

## Current repository state

- `ai-stylist-mvp/` contains the current front-end concept/demo.
- This scaffold intentionally does not modify the existing website.
- Backend, model, product-provider, and experiment layers are being defined separately before integration.
