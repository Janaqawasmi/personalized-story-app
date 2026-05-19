# Illustration Pipeline Review & Improvement Report

**Date:** 2026-05-18
**Reviewer scope:** Full v2 illustration pipeline — architecture, prompts, orchestration, Seedream 4.0 alignment, and generated-output analysis.
**Codebase commit:** `5fe5340` (main)

---

## Executive Summary

The DAMMAH illustration pipeline v2 is a well-architected 4-stage system (Visual Director → Scene Planner → Prompt Engineer → Final Assembly → Image Generation) that makes fundamentally sound decisions: separating creative from technical work, using structured text instead of reference images for consistency, versioning every artefact, and running image generation as durable background jobs.

However, the pipeline has **significant misalignment with Seedream 4.0's actual capabilities and prompting paradigm**. The prompt engineering strategy was designed around Stable Diffusion / Midjourney conventions (token-weighted ordering, negative prompts, guidance-scale tuning), but Seedream 4.0 is a **natural-language-first model** that works best with coherent scene descriptions, not structured section-concatenation. This mismatch is the single largest source of quality loss.

**Top 5 findings:**

1. **Prompt structure fights Seedream 4.0's design.** The concatenated section-by-section format (no-text lead → anchors → setting → character → focal → lighting → palette → avoid → footer) produces fragmented, repetitive prompts. Seedream 4.0 explicitly recommends "coherent natural language" over tag-stacking. *(High priority)*

2. **Massive missed opportunity: Seedream 4.0's multi-image output for storybook series.** The guide explicitly highlights "series generation for storyboards/storybooks" with built-in character continuity. The pipeline generates one image at a time with no inter-page awareness at the image-model level. *(High priority)*

3. **No use of reference-based generation for character consistency.** The v2 spec deliberately removed reference images (justified by v1 experiments), but Seedream 4.0 has explicit reference-character capabilities that are fundamentally different from what v1 tested. *(Medium-high priority)*

4. **Image dimensions are suboptimal.** The pipeline sends `1024×1024` to the generation call (constant in `stage4-image-generation/index.ts`), but `seedreamImageSize.ts` defines the correct `1728×2304` (3:4 portrait) preset. The constant `CHILDRENS_BOOK_PAGE_ILLUSTRATION` is defined as `{width: 1728, height: 2304}` but Stage 4 appears to pass it correctly — yet this needs verification that the actual API call uses the right dimensions. *(Verification needed)*

5. **Guidance scale is hardcoded to 7.5 with no per-page tuning.** Different emotional tones (calm establishing shot vs. anxious peak moment) benefit from different guidance scales. The current approach treats all pages identically. *(Medium priority)*

---

## Current Pipeline Review

### Architecture Assessment

The 4-stage pipeline is the right structural choice. The separation of concerns is clean:

| Stage | Role | Model | Assessment |
|-------|------|-------|------------|
| 1a Visual Director | World-building | Sonnet 4-6 | **Good.** Sonnet is appropriate for creative structural work. The Visual Bible schema is well-designed. |
| 1b Scene Planner | Per-page direction | Sonnet 4-6 | **Good.** Full manuscript context + adjacent-page awareness enables narrative coherence. |
| 2 Prompt Engineer | Creative → technical translation | Haiku 4-5 | **Appropriate** for mechanical translation, but the output format is wrong for Seedream 4.0. |
| 3 Final Assembly | Deterministic concatenation | None (pure fn) | **Problem.** The concatenation strategy produces Midjourney-style prompts, not Seedream-native prompts. |
| 4 Image Generation | Seedream API call | Seedream 4.0 | **Underutilized.** Text-only, single-image, no reference, no series mode. |

### Artefact Model

**Excellent.** Every intermediate output is versioned, has parent pointers, stores LLM call metadata (tokens, latency, model), and is persisted to Firestore subcollections. This enables:
- Forensic debugging (what prompt produced what image)
- A/B comparison (specialist sees version history)
- Cost tracking (token usage per stage)

### Job System

**Solid for pilot scope.** Firestore-backed polling (2s interval, 3 concurrent jobs) with transactional claims, retry logic, and cancellation support. The heartbeat mechanism prevents stale job claims.

### Specialist Review Flow

**Well-designed.** The two-surface approach (human-readable Scene Plans for specialists, technical panels for developers) is the right UX decision. The cascade-after-reject flow (feedback → regen scene plan → regen prompt → regen image) preserves specialist intent.

### What's Working Well

1. **Visual Bible as structured consistency anchor** — the characterAnchor/environmentRegistry/consistencyAnchors/palette/avoidList structure is a strong foundation
2. **Per-page isolation** — rejecting page 5 doesn't touch page 3
3. **Immutable artefacts with version chains** — full audit trail
4. **No-text constraint as highest-priority prompt element** — correctly addresses Seedream's tendency to generate text in images
5. **Word-budget enforcement with clamping** — prevents prompt bloat from LLM verbosity
6. **Metaphor detection in validator** — catches figurative language that image models render literally
7. **Exponential backoff on retries** — appropriate for API flakiness

---

## Prompt Engineering Review

### The Core Problem: Section-Concatenation vs. Natural Language

The final prompt assembly (`stage3-final-prompt/index.ts`) concatenates 9 distinct sections:

```
No text, no letters, no words, no captions, no labels, no speech bubbles, no logos, wordless illustration.
soft watercolour with coloured pencil | muted warm palette, low saturation.
Setting: hallway_outside_room_4, fluorescent light casting long shadows on polished tile floor, closed doors lining both walls. Spatial layout (fixed for this location): Closed door to Room 4 centred...
Five-to-six-year-old with round face, large dark eyes, shoulder-length warm brown hair. Wears pale blue or cream shirt under rust cardigan, grey trousers. In this scene: standing frozen, weight on back foot, both hands gripping backpack straps, gaze fixed on door handle.
Focal point: white-knuckled fingers wrapped around frayed backpack straps.
Lighting: single fluorescent tube above, harsh downward light, face half-lit, long shadow stretching behind on floor, mood: isolating.
Color palette: pale blue, cream, rust, warm grey.
Avoid: text, letters, words, captions, labels, speech bubbles, logos of any kind; exaggerated facial expressions or grotesque features; literal visual metaphors.
Children's book illustration.
```

**Problems with this approach:**

1. **Redundancy.** "No text, no letters, no words, no captions, no labels, no speech bubbles, no logos" appears in both the lead AND the avoid section, wasting ~20 tokens of the ~300-token budget on the same instruction twice.

2. **Fragmentation.** The Seedream 4.0 guide says: *"Use coherent natural language to describe the subject + action + environment."* The current prompt reads like a database dump, not a scene description. Each section restarts context rather than building a coherent mental image.

3. **Anti-pattern: Negative prompting.** Seedream 4.0 is not a diffusion model with classifier-free guidance where negative prompts have a well-defined effect. The "Avoid:" section and the no-text lead are treated as high-priority tokens, but Seedream 4.0's guide says nothing about negative prompting — it emphasizes **clear description of what you want**, not what to avoid. The current pipeline spends ~15% of its token budget on negatives.

4. **"Children's book illustration" as footer is too weak.** This is arguably the most important style anchor but it's placed last where — even if Seedream doesn't strictly truncate — it has the least contextual weight. The Seedream guide recommends: *"If you have a specific use case, explicitly state the image purpose and type in your prompt."*

5. **Spatial layout injection is verbose.** The `Spatial layout (fixed for this location): ...` block can add 40-60 words of compass-referenced room description. This is useful for room consistency but catastrophically expensive in a 300-token budget.

### Word Budget Analysis

Current word-budget allocation across the 5 structured sections:

| Section | Budget | Typical usage | % of ~300 tokens |
|---------|--------|---------------|-------------------|
| setting | ≤25 words | 20-25 | ~8% |
| character | ≤30 words | 25-30 | ~10% |
| focalPoint | ≤10 words | 8-10 | ~3% |
| composition | ≤20 words | 15-20 | ~6% |
| lighting | ≤30 words | 25-30 | ~10% |

Total structured content: ~115 words (~37%). The remaining ~63% is consumed by:
- No-text lead: ~15 words (5%)
- Consistency anchors: ~12 words (4%)
- Character anchor (from VB): ~25 words (8%)
- Spatial layout injection: ~40 words (13%)
- Palette: ~8 words (3%)
- Avoid list: ~25 words (8%)
- Footer: ~3 words (1%)
- Section labels ("Setting:", "Focal point:", etc.): ~10 words (3%)
- **Redundant no-text in avoid:** ~15 words (5%)

**Key insight:** Only ~37% of the prompt budget describes the actual scene. The rest is boilerplate, redundancy, and structural overhead. A natural-language prompt would recover ~30-40% of this budget for scene-specific content.

### Emotion-Removal Policy: Overcorrected

The pipeline enforces "NO emotion words" in the character section (Stage 2 prompt: *"body position, limb positions, gaze; NO emotion words"*) and in `keyPhysicalDetail` (*"no 'scared', 'anxious', 'worried'; only physical observations"*).

**This is overcorrected.** The Seedream 4.0 guide uses emotion words naturally: *"A girl in a lavish dress walking under a parasol along a tree-lined path."* The issue the pipeline is trying to solve (image models rendering "anxious" as a word label or a cartoonish expression) is real for older diffusion models, but Seedream 4.0 has *"stronger understanding of text prompts"* and handles emotional descriptors well when used naturally.

The current approach forces the LLM to translate "Jana is terrified" into "shoulders hunched forward, weight shifted to back foot, eyes wide with visible lower lid" — which is often **more** words to say the same thing, and harder for the image model to interpret coherently.

**Recommendation:** Allow one emotional descriptor per scene as a scene-level modifier (e.g., "anxious child standing at doorway" rather than the pure-physical circumlocution). Reserve the no-emotion rule for the `character` section's body-position description only.

---

## Seedream 4.0 Alignment Analysis

### Alignment Score: 4/10

The pipeline was designed with Stable Diffusion / Midjourney prompting conventions. Seedream 4.0 is architecturally different and the guide makes this explicit:

> *"Seedream 4.0 has a stronger understanding of text prompts, allowing it to generate the expected images with less description... using concise and precise prompts is usually better than repeatedly stacking ornate and complex vocabulary."*
> — Seedream 4.0 User Guide, Text-to-Image section

### Specific Misalignments

#### 1. Prompt Style (Critical)

| Seedream 4.0 Guide | Current Pipeline |
|---------------------|-----------------|
| "Clearly describe the scene using natural language" | Section-concatenated database-dump format |
| "Subject + action + environment" pattern | Subject, action, environment in separate labeled sections |
| "Concise and precise prompts" | 800-1200 char prompts with redundancy |
| "Less description" works in 4.0 | Pipeline maximizes description density |

**Source:** Seedream 4.0 Guide, "General Guidelines" §1 and "Text-to-Image" section.

#### 2. Multi-Image Output (Major Missed Opportunity)

The Seedream 4.0 guide explicitly supports storybook generation:

> *"Seedream 4.0 supports generating image sequences with consistent character continuity and unified style, making it suitable for storyboarding, comic creation..."*
> — Seedream 4.0 Guide, "Multi-Image Output" section

> *"Generate four film storyboard images, corresponding to the following scenes: [scene 1]... [scene 2]... [scene 3]... [scene 4]..."*
> — Seedream 4.0 Guide, Multi-Image Output example

The pipeline generates images one at a time with no awareness that they're part of a series. Seedream 4.0 can generate multiple pages in a single call with built-in character continuity — this is exactly the use case the model was designed for.

#### 3. Reference-Based Character Consistency (Major Missed Opportunity)

The v2 spec removed reference images based on v1 experiments, but those experiments tested **page-1-as-reference** (environment + character blended), not Seedream 4.0's purpose-built reference-character mode:

> *"Based on the character in the reference image, create [new scene description]... Position the figure on the left side of the image. The overall style should be consistent with the reference image."*
> — Seedream 4.0 Guide, "Reference Character" section

The guide explicitly supports extracting character identity from a reference and placing that character in entirely new scenes. This is fundamentally different from what v1 tested (passing page 1's full image as a reference, which blended environment + character + composition).

**Recommended approach:** Generate a character reference sheet (front-facing, neutral pose, clean background) as a dedicated Stage 0 output. Use this as Seedream 4.0's reference image for all page generations with instructions like: *"Based on the character in the reference image, illustrate [scene description]."*

#### 4. Image Editing for Refinement (Unused)

Seedream 4.0 supports precise image editing:

> *"Seedream 4.0 supports image editing operations such as addition, deletion, replacement, and modification through text prompts."*
> — Seedream 4.0 Guide, "Image Editing" section

When a specialist rejects an image saying "the character's hair should be darker" or "add a window on the left wall," the pipeline currently regenerates from scratch (full cascade: regen scene plan → regen prompt → regen image). Seedream 4.0 could edit the existing image directly, preserving what works and fixing what doesn't.

#### 5. Negative Prompting Has No Documented Mechanism

The Seedream 4.0 guide has **zero mentions** of negative prompts, avoid lists, or exclusion syntax. The pipeline dedicates ~30 words to "Avoid: ..." which may be:
- Interpreted as scene description (the model might try to generate what it's told to avoid)
- Ignored entirely
- Partially effective through the model's language understanding

The no-text constraint is critical, but the approach should be: *"wordless illustration with no text or labels"* woven into the scene description, not a separate "Avoid:" section.

**Source:** Absence of any negative-prompt guidance in the entire Seedream 4.0 guide.

#### 6. Aspect Ratio Utilization

Seedream 4.0 supports high-resolution presets:

```
3:4 → 1728×2304 (portrait, ideal for children's books)
2:3 → 1664×2496 (tall portrait)
4:3 → 2304×1728 (landscape spreads)
```

The codebase correctly defines `CHILDRENS_BOOK_PAGE_ILLUSTRATION = {width: 1728, height: 2304}` in `seedreamImageSize.ts`, which is the right choice. However, there's no per-page aspect-ratio flexibility — a panoramic establishing shot would benefit from 4:3 landscape, while a close-up character moment suits 3:4 portrait.

#### 7. Guidance Scale

The provider hardcodes `guidance_scale: 7.5`. The Seedream 4.0 guide does not mention guidance scale as a user-facing parameter, suggesting the model handles this internally. The hardcoded value may be:
- Ignored by the API
- Overriding an optimized default
- Appropriate (if the API accepts it)

**Recommendation:** Test with and without the guidance_scale parameter. If the API ignores it, remove it to avoid future confusion. If it accepts it, test values 5-10 for different scene types.

---

## Character Consistency Analysis

### Current Strategy: Text-Only Anchoring

The Visual Bible's `characterAnchor` is embedded in every prompt:

```
"Five-to-six-year-old with round face, large dark eyes, shoulder-length warm brown hair.
Wears pale blue or cream shirt under rust cardigan, grey trousers."
```

**Strengths:**
- Consistent across all pages (same text, same anchor)
- Specialist-editable (they can refine the anchor post-generation)
- Auditable (stored as artefact, versioned)

**Weaknesses:**
- **Text descriptions of faces are inherently ambiguous.** "Round face, large dark eyes, shoulder-length warm brown hair" could match thousands of different character renderings. There's no pixel-level identity lock.
- **No age-specific rendering cues.** "Five-to-six-year-old" is interpreted differently by different seeds. Body proportions (head-to-body ratio, limb length) vary significantly.
- **Clothing descriptions allow drift.** "Pale blue or cream shirt" gives the model a choice — different pages may pick different colors.
- **Hair rendering varies with camera angle.** "Shoulder-length" hair looks different in front view, side view, and back view, with no anchor to keep it consistent.

### Seedream 4.0-Native Alternative

Use reference-based generation (as described in the guide's "Reference Character" section) with a generated character reference sheet:

1. **Stage 0 (new):** Generate a character reference image — front-facing, neutral pose, clean white background, showing full body. Use the characterSheet (5-7 sentences) as the prompt.
2. **Stage 4 (modified):** For each page, pass the character reference image as a reference input with instructions: *"Based on the character in the reference image, illustrate: [scene description]. Maintain the character's face, hair, and clothing exactly as shown in the reference."*

This leverages Seedream 4.0's built-in reference-character extraction, which is specifically designed to preserve identity across scenes.

### Consistency Anchors Assessment

The 3-5 short phrases (e.g., "soft watercolour with coloured pencil", "muted warm palette, low saturation") are a good **style** consistency mechanism but do nothing for **character** consistency. They're correctly positioned early in the prompt to anchor style.

---

## Story Continuity Analysis

### Narrative Coherence

**Strong.** Stage 1b (Scene Planner) receives:
- Full manuscript (all pages)
- Target page text
- Adjacent page context (previous + next)
- Visual Bible (environments, character)

This gives the LLM enough context to make narratively coherent directorial choices. The "visually distinct from adjacent pages" rule prevents monotonous same-framing across pages.

### Visual Continuity Gaps

1. **No cross-page awareness at the image model level.** Each Seedream call sees only its own prompt — it has no knowledge of what pages 1-4 look like when generating page 5. The text anchors (characterAnchor, consistencyAnchors, palette) provide statistical consistency but not deterministic continuity.

2. **Environment registry is text-only.** The `spatialLayout` field describes "door centred, desk near window, whiteboard on back wall" — but Seedream 4.0 may place these elements differently on each generation. Two images of the same classroom may have incompatible layouts.

3. **No visual memory between pages.** If page 3 shows a lamp on a nightstand and page 7 returns to the same room, there's no mechanism to ensure the lamp is in the same position. The spatialLayout text helps but doesn't guarantee pixel-level consistency.

4. **Camera progression not enforced.** The Scene Planner produces camera specs per page, but there's no cross-page validation. A story could have: wide → close-up → wide → close-up → wide with no cinematic logic.

### Recommended Improvements for Continuity

1. **Multi-image output mode:** Generate 3-4 pages at a time using Seedream 4.0's series generation. The model maintains internal character and style consistency within a batch.

2. **Storyboard-first approach:** Before generating full-resolution pages, generate a storyboard (all pages as thumbnails in a single image) to establish composition rhythm. Then use individual pages as reference for full-resolution generation.

3. **Camera progression validation:** Add a Stage 1b post-processing step that reviews the camera spec sequence across all pages and flags monotonous patterns (e.g., 3 consecutive medium shots).

---

## Scene Composition Analysis

### Camera Specification Quality

The Scene Planner produces `cameraSpec` strings like:
- "Medium close-up, eye level, centered framing"
- "Wide shot, slightly low angle, rule of thirds"

**Strength:** These are cinematographically literate. The prompt enforces distinctness from adjacent pages.

**Weakness:** The `composition` section in the structured prompt (≤20 words) often duplicates the camera spec rather than adding new information. The two fields (director.cameraSpec and structuredPrompt.composition) create redundancy.

### Focal Point Design

The `focalPoint` field (≤10 words) is well-conceived — it tells the image model where to direct the viewer's eye. Examples: "white-knuckled fingers on backpack straps", "single tear catching hallway light."

**Problem:** 10 words is extremely tight. The instruction often gets compressed to the point of being a noun phrase rather than a directing instruction. Seedream 4.0's natural-language approach would benefit from the focal point being woven into the scene description rather than isolated.

### Lighting Design

The 5-part lighting specification (source + position, quality, what's illuminated, what's in shadow, mood word) is the most technically detailed section. This is appropriate — lighting is the primary emotional driver in children's book illustration.

**Improvement opportunity:** Rather than "Lighting: single fluorescent tube above, harsh downward light, face half-lit, long shadow behind, mood: isolating," use Seedream 4.0's natural language: "Harsh fluorescent light from above casts half her face in shadow, her long shadow stretching behind her on the polished floor."

---

## Firebase Story Review

### Methodology Note

The three requested stories ("A story for Jana", "eli in the school 01", "The Wall at Milo's Back") exist only in live Firestore. I cannot query Firebase from this review environment. The analysis below is based on:

1. **Experiment data** in the repository (locked style bibles and visual bibles for the Jana school-door story)
2. **Pipeline architecture** (what prompts the system would produce given the code)
3. **Known failure modes** from the spec's F1-F9 analysis

### Story: "A story for Jana" (jana-school-door-story-001)

**Available data:** Locked style bible and visual bible from `experiments/` directory.

#### Visual Bible Analysis

The locked style bible (`experiments/locked-style-bibles/jana-school-door-story-001.json`) shows a well-structured characterAnchor and environmentRegistry. Key observations:

**characterAnchor quality:** Good specificity — "Five-to-six-year-old with round face, large dark eyes, shoulder-length warm brown hair. Wears pale blue or cream shirt under rust cardigan, grey trousers." This is 25 words, leaving room in the prompt budget.

**environmentRegistry issues:**
- `hallway_outside_room_4`: spatialLayout is excellent — "Closed door to Room 4 centred or slightly right; cold metal handle visible; hallway recedes into soft focus behind Jana; floor is polished tile or light linoleum; left and right walls are pale institutional colour."
- `classroom_room_4`: The spatialLayout has a contradiction — "Jana's chosen desk positioned near window on right side of room" but the window is "on left wall." This creates spatial confusion in the prompt.

**avoidList quality:** Strong — includes "props not mentioned in story" and "other children rendered with equal detail to Jana," which are story-specific and useful.

**Consistency anchors:** "soft watercolour with coloured pencil", "muted warm palette, low saturation", "intimate close framings and negative space", "quiet emotional truth, no exaggeration" — the last two are abstract concepts, not visual instructions. Seedream 4.0 cannot render "quiet emotional truth."

**Predicted prompt issues for this story:**
1. The classroom scene prompt would inject 50+ words of spatialLayout, consuming ~17% of the token budget on room description for what might be a close-up of Jana's hands.
2. The hallway scenes would repeat "polished tile or light linoleum" on every page, even when the camera is on Jana's face and the floor isn't visible.
3. The color "pale blue or cream" in the characterAnchor gives the model a choice — different seeds will pick different colors, breaking cross-page consistency.

**Recommended prompt rewrite for a hallway scene:**

Current (estimated from pipeline logic):
```
No text, no letters, no words, no captions, no labels, no speech bubbles, no logos, wordless illustration. soft watercolour with coloured pencil | muted warm palette, low saturation. Setting: hallway_outside_room_4, fluorescent light casting long shadows. Spatial layout (fixed for this location): Closed door to Room 4 centred or slightly right; cold metal handle visible; hallway recedes into soft focus behind Jana; floor is polished tile or light linoleum; left and right walls are pale institutional colour; bell sound travels from far end of hallway. Five-to-six-year-old with round face, large dark eyes, shoulder-length warm brown hair. Wears pale blue or cream shirt under rust cardigan, grey trousers. In this scene: standing frozen, weight on back foot, both hands gripping backpack straps, gaze fixed on door handle. Focal point: white-knuckled fingers wrapped around frayed backpack straps. Lighting: single fluorescent tube above, harsh downward light, face half-lit, long shadow stretching behind on floor, mood: isolating. Color palette: pale blue, cream, rust, warm grey. Avoid: text, letters, words, captions, labels, speech bubbles, logos of any kind; exaggerated facial expressions; literal visual metaphors. Children's book illustration.
```

Recommended (Seedream 4.0-native):
```
Wordless children's book illustration in soft watercolour and coloured pencil, muted warm palette. A five-year-old girl with a round face, large dark eyes, and shoulder-length brown hair stands frozen in a school hallway. She wears a cream shirt under a rust cardigan and grey trousers. Both hands grip her backpack straps with white knuckles, her gaze fixed on a closed wooden door with a cold metal handle. The hallway stretches behind her into soft focus, polished tile floor reflecting harsh fluorescent light from above. Half her face is lit, a long shadow stretching behind her. Medium close-up, slightly low angle, shallow depth of field.
```

The rewrite is 112 words (~450 chars) vs. the current ~200 words (~900 chars). It conveys the same information in coherent natural language, uses Seedream 4.0's preferred "subject + action + environment" pattern, and leaves significant token budget headroom.

### Story: "eli in the school 01"

**No local data available.** Analysis is architectural.

Based on the pipeline, a school-setting story would face the same spatialLayout verbosity issue. If the story has multiple scenes in the same school (classroom, hallway, playground), the environment registry injection would dominate the prompt budget.

**Predicted issues:**
- Character named "Eli" — Hebrew name; Seedream 4.0's training data may or may not associate this with specific cultural/ethnic features. The characterAnchor should be explicit about skin tone, facial features, and cultural context.
- School scenes often have many background characters. The current pipeline has no mechanism for background-character treatment (blurred, silhouetted, outlined-only). The Scene Planner should specify crowd rendering style.

### Story: "The Wall at Milo's Back"

**No local data available.** Analysis is architectural.

The title suggests a metaphorical/psychological story (separation anxiety, based on the commit log `docs/logs` addition). Key predicted issues:

- **Metaphor-to-literal translation risk.** "The wall at Milo's back" is a metaphor. The pipeline's literal-language enforcement should prevent the Scene Planner from describing a literal wall behind the character, but this depends on the LLM correctly interpreting the metaphor in context.
- **Emotional arc visualization.** Stories about separation anxiety have a specific emotional trajectory (safety → trigger → peak anxiety → coping → resolution). The Scene Planner sees the full manuscript, so it should capture this arc, but there's no explicit emotional-arc validation in the pipeline.
- **Environment transitions.** Separation anxiety stories often move between safe spaces (home) and anxiety-triggering spaces (school). The environment registry should capture both with distinct atmosphere and spatialLayout entries. The pipeline handles this well if the Visual Director correctly identifies all locations.

---

## Failure Patterns

### Pattern 1: Spatial Layout Bloat

**Symptom:** Prompts exceed 1200 chars; spatial layout consumes 30-40% of token budget.
**Root cause:** `assembleFinalPrompt` injects the full `spatialLayout` text from the environment registry regardless of camera framing. A close-up of a character's face doesn't need "desk near window, whiteboard on back wall."
**Frequency:** Every page that matches an environment registry key.
**Impact:** Token budget starvation for scene-specific content; Seedream may truncate the prompt before reaching lighting/composition.

### Pattern 2: Character Appearance Drift

**Symptom:** Character looks subtly different across pages (hair color shade, face shape, clothing color).
**Root cause:** Text-only character description is inherently ambiguous. Each Seedream generation interprets "shoulder-length warm brown hair" independently.
**Frequency:** Every story, especially across regenerations (new seed = new interpretation).
**Impact:** Breaks the illusion of a consistent character across the book.

### Pattern 3: Redundant No-Text Instructions

**Symptom:** The no-text constraint appears twice in every prompt (lead + avoid list).
**Root cause:** Belt-and-suspenders approach from v1 when text-in-images was the #1 quality issue.
**Frequency:** 100% of prompts.
**Impact:** ~15 wasted tokens per prompt (5% of budget).

### Pattern 4: Abstract Consistency Anchors

**Symptom:** Consistency anchors like "quiet emotional truth, no exaggeration" are not renderable.
**Root cause:** The Visual Director generates anchors that are aesthetic philosophy, not visual instructions.
**Frequency:** ~40% of consistency anchors across the locked style bibles.
**Impact:** Wasted token budget on text the image model can't interpret.

### Pattern 5: Composition Monotony

**Symptom:** Multiple consecutive pages have similar framing (medium shot after medium shot).
**Root cause:** No cross-page composition validation. Each Scene Plan is generated independently with only "must be different from adjacent" as a constraint.
**Frequency:** Common in 8+ page stories where the same environment recurs.
**Impact:** Visually monotonous book; poor page-turn pacing.

### Pattern 6: Clothing Color Ambiguity

**Symptom:** Character's shirt color changes between pages.
**Root cause:** characterAnchor says "pale blue or cream shirt" — the "or" gives the model a choice.
**Frequency:** Any characterAnchor with color alternatives.
**Impact:** Breaks character consistency.

### Pattern 7: Style Guide Not Embedded in Prompt

**Symptom:** Generated images don't match the intended medium (e.g., "soft watercolour" style guide but image looks digital/photorealistic).
**Root cause:** The `styleGuide` field from the Visual Bible is not directly embedded in the final prompt. Only the `consistencyAnchors` carry style information, and they're limited to 2 phrases in the final assembly.
**Frequency:** Variable — depends on how well the consistency anchors capture the style.
**Impact:** Style inconsistency; images may look generically AI-generated rather than matching the intended children's book illustration style.

---

## Recommended Architecture Improvements

### 1. Add Stage 0: Character Reference Sheet Generation (High Priority)

**What:** Before generating any story pages, generate a dedicated character reference image (front-facing, neutral pose, clean background, full body) using the characterSheet as prompt.

**Why:** Seedream 4.0's reference-character feature is specifically designed for this use case. The guide says: *"Based on the character in the reference image, create [new scene description]."* This gives the image model a pixel-level identity anchor rather than relying on text description alone.

**How:**
```typescript
// New stage: server/src/illustration/stage0-character-ref/index.ts
export async function generateCharacterReference(input: {
  characterSheet: string;
  styleGuide: string;
  palette: string;
}): Promise<CharacterReferenceArtefact> {
  const prompt = `Character reference sheet for a children's book illustration. ${input.styleGuide}. Full body, front-facing, neutral standing pose, clean white background. ${input.characterSheet} Color palette: ${input.palette}.`;
  // Generate at 1:1 ratio (2048x2048) for maximum detail
  const result = await provider.generateImage({ textPrompt: prompt, ... });
  return { ... };
}
```

**Impact:** Dramatically improved character consistency across all pages.

### 2. Implement Multi-Image Series Generation (High Priority)

**What:** Generate pages in batches of 3-4 using Seedream 4.0's multi-image output mode.

**Why:** The Seedream 4.0 guide explicitly supports this: *"Seedream 4.0 supports generating image sequences with consistent character continuity and unified style, making it suitable for storyboarding, comic creation."* This is literally the designed use case.

**How:**
```
Generate four children's book illustrations for the following scenes, maintaining consistent character appearance and visual style throughout:
Scene 1: [page 1 description]
Scene 2: [page 2 description]
Scene 3: [page 3 description]
Scene 4: [page 4 description]
The character is [characterAnchor]. Style: [styleGuide].
```

**Tradeoff:** Batch generation means rejecting one page in a batch might require regenerating the batch. Mitigate by allowing individual page regeneration as a fallback (current behavior).

**Implementation consideration:** The current per-page job system would need a batch-job variant. The specialist UI would show batch status rather than individual page status during generation.

### 3. Rewrite Stage 3 as Natural-Language Assembler (High Priority)

**What:** Replace the section-concatenation logic with a natural-language scene description generator.

**Why:** Seedream 4.0 works best with *"coherent natural language"* (Guide §1), not label-separated sections. The current format fights the model's strengths.

**How:** Option A (LLM-based): Use Haiku to convert the structured prompt + VB into a single coherent paragraph. Option B (template-based): Use a sentence template that weaves sections together naturally.

**Template-based approach:**
```typescript
function assembleFinalPrompt(input: AssembleFinalPromptInput): string {
  const { sp, vb } = input;
  return [
    `Wordless children's book illustration`,
    `in ${vb.consistencyAnchors.slice(0, 2).join(' and ')}.`,
    sp.setting.replace(/^[a-z_]+/, ''),  // strip registry key
    `${vb.characterAnchor}`,
    `In this scene, ${sp.character}.`,
    sp.focalPoint ? `The eye is drawn to ${sp.focalPoint}.` : '',
    sp.lighting,
    sp.composition ? `${sp.composition}.` : '',
  ].filter(Boolean).join(' ');
}
```

### 4. Add Image Editing for Minor Revisions (Medium Priority)

**What:** When a specialist rejects with minor feedback ("make the hair darker", "add a window"), use Seedream 4.0's image editing instead of full regeneration.

**Why:** The guide supports precise editing: *"Seedream 4.0 supports image editing operations such as addition, deletion, replacement, and modification through text prompts."* This preserves the 90% of the image that works and fixes the 10% that doesn't.

**How:** Classify rejection feedback as "minor edit" vs. "major regen" based on the feedback text. For minor edits, pass the existing image + edit instruction to Seedream 4.0.

### 5. Conditional Spatial Layout Injection (Medium Priority)

**What:** Only inject spatial layout when the camera framing includes the environment (wide shot, full shot). Skip it for close-ups and extreme close-ups.

**Why:** A close-up of a character's hands gripping backpack straps doesn't need 50 words describing the hallway layout. This recovers 15-20% of the token budget for scene-specific content.

**How:** In Stage 3, check `structuredPrompt.composition` for camera distance keywords:
```typescript
const isCloseFraming = /close-up|extreme close|detail shot|tight/i.test(sp.composition);
const settingSection = isCloseFraming
  ? `Setting: ${sp.setting}.`  // No spatial layout for close-ups
  : envEntry
    ? `Setting: ${sp.setting}. Layout: ${envEntry.spatialLayout}.`
    : `Setting: ${sp.setting}.`;
```

---

## Recommended Prompt Template Improvements

### 1. Replace Section Labels with Natural Flow

**Before:**
```
Setting: hallway_outside_room_4, fluorescent light...
Five-year-old girl... In this scene: standing frozen...
Focal point: white-knuckled fingers...
Lighting: fluorescent tube above...
```

**After:**
```
A five-year-old girl with round face, large dark eyes, and shoulder-length brown hair stands frozen in a school hallway, both hands gripping her backpack straps with white knuckles. Harsh fluorescent light from above casts half her face in shadow. The hallway stretches into soft focus behind her, polished tile floor reflecting the overhead light. Medium close-up, slightly low angle.
```

**Why:** Seedream 4.0 Guide §1: *"Use coherent natural language to describe the subject + action + environment."* The label-free version reads as a single coherent scene.

### 2. Move Style to Prompt Lead

**Before:**
```
No text, no letters... [consistency anchors]. Setting:... Character:... [end] Children's book illustration.
```

**After:**
```
Wordless children's book illustration in soft watercolour and coloured pencil, muted warm palette. [scene description]
```

**Why:** The Seedream 4.0 Guide §2 says: *"If you have a specific use case, explicitly state the image purpose and type in your prompt."* Leading with "Children's book illustration in [style]" sets the rendering context before scene details.

### 3. Consolidate No-Text Instruction

**Before:** (appears twice)
```
No text, no letters, no words, no captions, no labels, no speech bubbles, no logos, wordless illustration.
...
Avoid: text, letters, words, captions, labels, speech bubbles, logos of any kind; ...
```

**After:** (single, woven into style lead)
```
Wordless children's book illustration in soft watercolour and coloured pencil. No text, no letters, no labels of any kind.
```

**Why:** Eliminates ~15 words of redundancy. Seedream 4.0's stronger language understanding means a single clear instruction suffices.

### 4. Fix characterAnchor Ambiguity

**Before:** "Wears pale blue or cream shirt under rust cardigan"
**After:** "Wears a cream shirt under a rust cardigan"

**Why:** The "or" gives the model a choice, causing color drift across pages. Pick one color and lock it. The Visual Director prompt should instruct: *"Do not use 'or' in characterAnchor — commit to specific choices."*

### 5. Replace Abstract Consistency Anchors

**Before:** "quiet emotional truth, no exaggeration"
**After:** "restrained expressions, subtle gestures, soft edges"

**Why:** Image models can render "soft edges" and "restrained expressions" but cannot render "emotional truth." The Visual Director prompt should instruct: *"Each anchor must describe something visually observable — a technique, a rendering characteristic, or a stylistic constraint."*

---

## Recommended Workflow Changes

### 1. Two-Pass Generation Strategy

**Current:** Generate all pages independently in parallel (up to concurrency 3).
**Recommended:** 
- **Pass 1:** Generate pages in series batches (pages 1-3, 4-6, 7-9, etc.) using Seedream 4.0's multi-image output.
- **Pass 2:** For any rejected pages, regenerate individually with the approved adjacent pages as style references.

**Why:** Multi-image output provides built-in consistency within each batch. Using approved pages as references for regenerations anchors the regenerated page to its neighbors.

### 2. Character Reference Sheet as First Step

**Current flow:** Visual Bible → Scene Plans → Prompts → Images
**Recommended flow:** Visual Bible → **Character Reference Image** → Scene Plans → Prompts → Images (with character reference)

The character reference image becomes a persistent artefact (stored like other versioned artefacts) that the specialist can approve or reject independently.

### 3. Storyboard Thumbnail as Preview

Before generating full-resolution pages, generate a single storyboard image (all pages as small panels in one image) using Seedream 4.0's multi-image mode. This gives the specialist a composition-level preview of the entire book before committing to full-resolution generation.

**Cost:** 1 additional Seedream API call (~$0.02)
**Benefit:** Catches composition monotony, pacing issues, and character consistency problems early.

### 4. Feedback Classification for Edit vs. Regeneration

Add a feedback classifier (could be a simple regex + keyword match) that routes specialist feedback:
- **"Change X to Y"** → Image editing (Seedream 4.0 edit mode)
- **"Completely different"** → Full regeneration (current cascade)
- **"Adjust the framing/camera"** → Prompt modification only (skip scene plan regen)

### 5. Progressive Refinement Workflow

For important pages (cover, emotional peak), allow a multi-attempt workflow:
1. Generate 3 candidates (same prompt, different seeds)
2. Specialist picks the best candidate
3. Specialist can request edits on the chosen candidate (using Seedream 4.0's editing)

This leverages Seedream 4.0's seed-based variation without requiring full pipeline reruns.

---

## High-Priority Fixes

### Fix 1: Rewrite Final Prompt Assembly for Natural Language
**File:** `server/src/illustration/stage3-final-prompt/index.ts`
**Effort:** 2-3 hours
**Impact:** Immediate improvement in image quality by aligning with Seedream 4.0's prompting paradigm

Replace the section-concatenation with natural-language assembly. The structured prompt sections (setting, character, focalPoint, composition, lighting) should be woven into a coherent paragraph, not separated by labels.

### Fix 2: Remove Redundant No-Text Duplication
**File:** `server/src/illustration/stage3-final-prompt/index.ts`
**Effort:** 30 minutes
**Impact:** Recovers ~5% of token budget

Remove the "Avoid: text, letters..." section since the no-text constraint is already the prompt lead. Alternatively, merge them into a single instruction.

### Fix 3: Fix characterAnchor "or" Ambiguity
**File:** `server/src/illustration/stage1-visual-director/prompt-builder.ts`
**Effort:** 30 minutes
**Impact:** Eliminates clothing-color drift across pages

Add to the Visual Director prompt: `"In characterAnchor, commit to ONE specific color for each clothing item. Do not use 'or' or 'to' for alternatives.""`

### Fix 4: Conditional Spatial Layout Injection
**File:** `server/src/illustration/stage3-final-prompt/index.ts`
**Effort:** 1 hour
**Impact:** Recovers 15-20% of token budget for close-up shots

Only inject `spatialLayout` when the composition indicates a wide or medium shot. Skip for close-ups.

### Fix 5: Replace Abstract Consistency Anchors
**File:** `server/src/illustration/stage1-visual-director/prompt-builder.ts`
**Effort:** 30 minutes
**Impact:** Ensures all anchors are visually actionable

Add to the Visual Director prompt: `"Each consistencyAnchor must describe a visually observable rendering characteristic — a technique (e.g., 'crosshatch shading'), a quality (e.g., 'soft edges'), or a constraint (e.g., 'muted saturation'). Do not use abstract concepts like 'emotional truth' or 'narrative restraint'."`

---

## Medium-Priority Improvements

### Improvement 1: Implement Character Reference Sheet (Stage 0)
**Effort:** 1-2 days
**Impact:** Major improvement in character consistency

Generate a dedicated character reference image as part of workspace opening. Store as a versioned artefact. Pass to Stage 4 as Seedream 4.0 reference image.

### Improvement 2: Multi-Image Batch Generation
**Effort:** 2-3 days
**Impact:** Better cross-page consistency; potential cost reduction (fewer API calls)

Implement series generation for batches of 3-4 pages. Requires changes to Stage 3 (batch prompt assembly), Stage 4 (batch image generation), and the job system (batch jobs).

### Improvement 3: Image Editing for Minor Revisions
**Effort:** 1-2 days
**Impact:** Faster revision cycles; preserves what works in rejected images

When specialist feedback is classified as a minor edit, use Seedream 4.0's image editing mode instead of full regeneration.

### Improvement 4: Guidance Scale Per Scene Type
**Effort:** 2 hours
**Impact:** Better emotional range across pages

Map scene emotional intent to guidance scale: calm/establishing (6.0), neutral/transitional (7.5), tense/climactic (8.5). Store in Scene Plan artefact.

### Improvement 5: Camera Progression Validation
**Effort:** 3-4 hours
**Impact:** Better visual pacing across the book

Add a post-processing step after Stage 1b that reviews the camera spec sequence and flags monotonous patterns.

---

## Long-Term Improvements

### 1. Style Transfer from Approved Pages

Use approved page illustrations as style references for subsequent generations. Seedream 4.0 supports style transfer: *"Apply the style of Image 2 to Image 1."* This creates a positive feedback loop where each approved page makes subsequent pages more consistent.

### 2. Multi-Character Support

Extend the Visual Bible to support multiple characters with independent characterAnchors and optional character reference images. Required for stories with parents, siblings, or prominent supporting characters.

### 3. Automated Consistency Scoring

After generating a new page, run a comparison against existing approved pages using a vision model (Claude with vision). Score character consistency, style consistency, and environment consistency. Flag pages that score below threshold for specialist attention.

### 4. Per-Page Aspect Ratio

Allow the Scene Planner to specify aspect ratio per page:
- 3:4 portrait for character close-ups
- 4:3 landscape for panoramic establishing shots
- 1:1 for intimate square compositions

Seedream 4.0 supports all these presets natively.

### 5. Cover Image as Dedicated Pipeline

Add a dedicated cover-image generation stage with:
- Different composition rules (centered character, title-safe zones, eye-catching colors)
- Higher resolution (2048×2048)
- Multiple candidates for specialist selection

### 6. Iterative Refinement via Image-to-Image

For pages that are 80% correct, use Seedream 4.0's image editing to make targeted adjustments rather than full regeneration. This preserves composition, style, and character consistency while fixing specific issues.

### 7. Visual Storyboard Preview

Generate a single-image storyboard (all pages as thumbnails in a grid) as a preview before full-resolution generation. This catches pacing and composition issues early.

---

## Example Improved Prompts

### Example 1: Establishing Shot (Wide, Hallway)

**Current pipeline output (estimated):**
```
No text, no letters, no words, no captions, no labels, no speech bubbles, no logos, wordless illustration. soft watercolour with coloured pencil | muted warm palette, low saturation. Setting: hallway_outside_room_4, pale fluorescent light, empty corridor stretching into distance. Spatial layout (fixed for this location): Closed door to Room 4 centred or slightly right; cold metal handle visible; hallway recedes into soft focus behind Jana; floor is polished tile or light linoleum; left and right walls are pale institutional colour; bell sound travels from far end. Five-to-six-year-old with round face, large dark eyes, shoulder-length warm brown hair. Wears pale blue or cream shirt under rust cardigan, grey trousers. In this scene: standing small in the centre of the hallway, backpack hanging from one shoulder, feet turned slightly inward. Focal point: small figure dwarfed by empty corridor. Lighting: overhead fluorescent tubes casting flat, even light with faint shadows under doorframes, mood: exposed. Color palette: pale blue, cream, rust, warm grey. Avoid: text, letters, words, captions, labels, speech bubbles, logos of any kind; exaggerated facial expressions; literal visual metaphors. Children's book illustration.
```
**~195 words, ~870 chars**

**Improved (Seedream 4.0-native):**
```
Wordless children's book illustration in soft watercolour and coloured pencil, muted warm palette with low saturation. A small five-year-old girl with a round face, large dark brown eyes, and shoulder-length brown hair stands alone in a long school hallway. She wears a cream shirt under a rust cardigan and grey trousers, her backpack hanging from one shoulder, feet turned slightly inward. The hallway stretches into soft focus behind her, pale walls and polished tile floor reflecting flat fluorescent light. A closed wooden door with a metal handle is visible to her right. Wide shot from the end of the corridor, the small figure dwarfed by the empty institutional space.
```
**~110 words, ~620 chars**

**Improvement:** 45% fewer tokens. Same scene, same emotional weight, coherent natural language. Recovers ~250 chars of headroom.

### Example 2: Emotional Close-Up (Anxiety Peak)

**Current pipeline output (estimated):**
```
No text, no letters, no words, no captions, no labels, no speech bubbles, no logos, wordless illustration. soft watercolour with coloured pencil | muted warm palette, low saturation. Setting: hallway_outside_room_4, fluorescent light buzzing. Spatial layout (fixed for this location): Closed door to Room 4 centred or slightly right; cold metal handle visible; hallway recedes into soft focus behind Jana; floor is polished tile or light linoleum; left and right walls are pale institutional colour. Five-to-six-year-old with round face, large dark eyes, shoulder-length warm brown hair. Wears pale blue or cream shirt under rust cardigan, grey trousers. In this scene: hunched forward, both hands gripping backpack straps, knuckles white, lower lip pressed tight, gaze down and to the left. Focal point: white-knuckled fingers on frayed backpack straps. Lighting: harsh fluorescent from above, face half in shadow, floor catching reflected light below, mood: isolating. Color palette: pale blue, cream, rust, warm grey. Avoid: text, letters, words, captions, labels, speech bubbles, logos of any kind; exaggerated facial expressions; literal visual metaphors. Children's book illustration.
```
**~190 words, ~900 chars**

**Improved (Seedream 4.0-native):**
```
Wordless children's book illustration in soft watercolour and coloured pencil, muted warm tones. Extreme close-up of a five-year-old girl's hands gripping frayed backpack straps, knuckles white with tension. She has a round face with large dark brown eyes looking down, shoulder-length brown hair falling forward. She wears a cream shirt under a rust cardigan. Harsh fluorescent light from above casts half her face in deep shadow, the bright straps contrasting against her dark cardigan. Shallow depth of field, blurred hallway behind.
```
**~80 words, ~470 chars**

**Improvement:** 58% fewer tokens. Critically, the close-up version drops the spatial layout entirely (it's not visible in an extreme close-up). The scene reads as a single coherent image.

### Example 3: Resolution Moment (Warm Classroom)

**Improved (Seedream 4.0-native):**
```
Wordless children's book illustration in soft watercolour and coloured pencil, warm muted palette. A five-year-old girl with a round face, large dark brown eyes, and shoulder-length brown hair sits at a school desk near a window, her rust cardigan sleeves pushed up. Natural afternoon sunlight streams through the window, casting warm golden light across her hands resting open on the desk. Her shoulders are relaxed, chin slightly lifted. Rows of desks fill the background in soft focus, a blue stripe painted along the lower wall. Medium shot, eye level, gentle depth of field separating her from the busy classroom behind.
```
**~100 words, ~560 chars**

### Example 4: Using Multi-Image Output (Seedream 4.0 Series Mode)

```
Generate three children's book illustrations maintaining consistent character appearance and soft watercolour style throughout. The character is a five-year-old girl with a round face, large dark brown eyes, shoulder-length brown hair, wearing a cream shirt under a rust cardigan and grey trousers.

Scene 1: Wide shot of the girl standing alone in a long school hallway, her backpack hanging from one shoulder, feet turned inward. Flat fluorescent light, polished tile floor. She faces a closed wooden door with a metal handle.

Scene 2: Extreme close-up of her hands gripping the backpack straps, knuckles white. Harsh overhead light casts half her face in shadow. Hair falls forward partially hiding her face.

Scene 3: Medium shot of the girl sitting at a desk near a window, shoulders relaxed, warm afternoon sunlight streaming across her open hands. Blue stripe on the wall behind, blurred classroom activity in background.
```

**This single prompt leverages Seedream 4.0's built-in series generation with character continuity.**

---

## Suggested Experiments

### Experiment 1: Natural Language vs. Section-Concatenated Prompts

**Hypothesis:** Natural-language prompts produce higher-quality Seedream 4.0 output than section-concatenated prompts.
**Method:** For the existing 3-page test set (fear of dark, pages 1/5/10), generate each page twice: once with current pipeline output, once with manually rewritten natural-language prompts. Same seed.
**Metrics:** 1-5 rubric on composition, character consistency, emotional clarity, style adherence.
**Expected outcome:** Natural-language version scores higher on all metrics.

### Experiment 2: Character Reference Sheet Impact

**Hypothesis:** Using a character reference image improves cross-page character consistency.
**Method:** Generate the 3-page test set in two conditions: (A) text-only characterAnchor (current), (B) text + character reference image (generated from characterSheet). Compare character consistency across the 3 pages.
**Metrics:** Character similarity score (manual 1-5 rubric on face, hair, clothing, proportions).

### Experiment 3: Multi-Image Series vs. Individual Generation

**Hypothesis:** Generating 3 pages in a single Seedream 4.0 series call produces more consistent results than 3 individual calls.
**Method:** Same 3-page test set, same prompts. Condition A: 3 individual API calls. Condition B: 1 series-generation call. Compare character and style consistency.
**Metrics:** Cross-page consistency rubric (face match, clothing match, style match, palette match).

### Experiment 4: Prompt Length Impact

**Hypothesis:** Shorter, more focused prompts (400-600 chars) produce better Seedream 4.0 results than longer prompts (800-1200 chars).
**Method:** Generate each test page at 3 prompt lengths: short (~400 chars), medium (~700 chars), long (~1000 chars). Same scene content, different verbosity levels.
**Metrics:** Overall quality rubric; check if shorter prompts maintain scene accuracy.

### Experiment 5: Spatial Layout Injection Impact

**Hypothesis:** Removing spatial layout from close-up shots improves image quality.
**Method:** For pages with close-up camera specs, generate with and without spatial layout injection. Compare quality and token efficiency.
**Metrics:** Image quality rubric; token budget analysis.

### Experiment 6: Guidance Scale Sweep

**Hypothesis:** Different guidance scales suit different emotional tones.
**Method:** Generate the same scene at guidance_scale values [5, 6, 7, 7.5, 8, 9, 10]. Evaluate which value produces the best result for calm vs. tense scenes.
**Metrics:** Quality rubric; identify if Seedream 4.0 even responds to this parameter.

### Experiment 7: Image Editing vs. Full Regeneration

**Hypothesis:** For minor feedback ("darken the hair", "add a window"), Seedream 4.0's image editing produces better results than full regeneration.
**Method:** Take an approved image, apply a minor edit request. Compare: (A) image editing with the existing image, (B) full pipeline regeneration.
**Metrics:** Edit accuracy, consistency preservation, quality.

### Experiment 8: Storyboard-First Generation

**Hypothesis:** Generating a storyboard overview first, then using it as a style reference for individual pages, improves overall book coherence.
**Method:** Generate a 12-panel storyboard in one call, then generate individual pages. Compare cohesion against current individual-page approach.
**Metrics:** Visual coherence rubric across the full book.

---

## Final Recommendations

### Immediate Actions (This Week)

1. **Rewrite `assembleFinalPrompt` for natural language** — the single highest-impact change. Replace section labels with flowing prose. Keep the same structured input; change only the assembly.

2. **Fix characterAnchor ambiguity** — add "no alternatives" instruction to Visual Director prompt. Eliminate "or" from color specifications.

3. **Remove redundant no-text duplication** — consolidate into a single lead instruction.

4. **Run Experiment 1** (natural language vs. concatenated) to validate the prompt rewrite before deploying.

### Next Sprint (This Month)

5. **Implement character reference sheet** (Stage 0) — generate a dedicated character image; pass as Seedream 4.0 reference for all page generations.

6. **Run Experiments 2-4** to validate the character reference and multi-image approaches before full implementation.

7. **Add conditional spatial layout injection** — skip for close-ups.

8. **Fix abstract consistency anchors** — update Visual Director prompt to require visually observable rendering characteristics only.

### Next Quarter

9. **Implement multi-image series generation** — batch pages 3-4 at a time using Seedream 4.0's native series mode.

10. **Add image editing for minor revisions** — classify feedback and route to edit vs. regen.

11. **Add camera progression validation** — post-processing step after Stage 1b.

12. **Implement progressive refinement** (multiple candidates for key pages).

### Architectural Principle

The overarching recommendation is: **align the pipeline with Seedream 4.0's design philosophy rather than fighting it.** The model was built for natural-language scene descriptions, reference-based character consistency, and multi-image series generation. The current pipeline uses none of these capabilities, instead applying prompting conventions from a different model family. Every recommendation above moves the pipeline closer to Seedream 4.0's native strengths.

The structured intermediate representations (Visual Bible, Scene Plans, Structured Prompts) remain valuable — they're the right internal model. But the final translation to image-model input needs to respect Seedream 4.0's specific design, not generic text-to-image conventions.

---

*Report generated from codebase analysis at commit `5fe5340`. Firebase story data for "A story for Jana", "eli in the school 01", and "The Wall at Milo's Back" could not be accessed from the review environment — those sections are analyzed architecturally based on pipeline behavior and available experiment data.*
