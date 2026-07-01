# Caregiver / Parent Personalization — Investigation & Development Plan

**Branch:** `feature/caregiver-personalization`
**Status:** Plan only — no code changes yet.
**Scope:** Connect the caregiver personalization flow to the published story so personalized
text + illustrations are produced from the **approved** specialist story, reusing the existing
illustration v2 pipeline wherever possible. The hard rule: **personalized illustrations must
preserve the specialist-approved scenes** — protagonist identity and art style change, the scene
does not.

### Decisions resolved (before implementation)

1. **Identity injection** — proceed with the **shared** illustration pipeline (no fork). Child photo
   as `referenceImage` **plus** a strong child-identity section in the personalized prompt. If the
   provider preserves identity poorly, document it as a **provider-quality limitation** with room for
   later tuning / provider replacement — do not redesign the pipeline around it.
2. **Publish-time text variants** — approved, implemented carefully. **Fear & Anxiety, Hebrew &
   Arabic first.** Generated masculine/feminine variants must be **reviewed/validated before public
   use**. No simple string replacement for he/ar (full gendered variants only).
3. **Art-direction data** — **snapshot into `story_templates`** (Visual Bible, scene plans, character
   anchors, prompt metadata, all fields personalization needs). Check the **Firestore 1 MiB
   document-size limit**; if the snapshot risks exceeding it, store the heavy art-direction data in a
   **subcollection / separate artifact document** under the template.
4. **Style taxonomy** — one shared source of truth. `VISUAL_STYLES`, `allowedIllustrationStyles`, and
   backend validation use the **same stable internal style IDs**; display labels translated
   separately.
5. **Existing published templates** — prepare a safe **backfill/migration plan but do not run it**
   (dry-run first; conditional, non-destructive; readiness flags). See §18.1.
6. **Two illustration modes (template vs personalized).** The specialist-approved protagonist
   appearance is used for the **template/sample** illustrations (Dashboard + public sample/preview)
   and **must remain unchanged after publishing.** In **personalized** mode the original protagonist
   appearance is **not reused** — the uploaded child photo becomes the main-character visual
   reference, the parent style is applied, the **approved scene is preserved**, and personalized
   images are stored **separately** and never overwrite the sample images. See the new **§7A**.
7. **Text-variant review owner.** The **publishing specialist reviews the gendered text variants for
   their own stories** (not a separate admin gate). Their approval flips `textPersonalizationReady`.
8. **Style-override scope (Phase 5 nuance, now decided).** In personalized mode the parent-selected
   style overrides **only the art-medium / rendering tokens** (e.g. watercolor → cartoon). It must
   **preserve** the approved scene, setting, action, emotional tone, composition, lighting *mood*,
   palette anchors *where possible*, and therapeutic meaning. The style choice must **never** make the
   model invent a new scene or change the narrative moment.

These supersede any conflicting detail below; sections are updated accordingly.

---

## 1. Current Implementation Findings

### 1.1 Personalization flow (caregiver/public)

| Step | File | Notes |
|---|---|---|
| Detail page CTA | [client/src/pages/StoryDetail/StoryDetailPage.tsx:84](client/src/pages/StoryDetail/StoryDetailPage.tsx) | `handlePersonalize` always navigates to `/stories/:id/personalize`. **No eligibility check** — only blocks `status === "coming_soon"`. |
| Wizard | [client/src/pages/PersonalizeStoryPage.tsx](client/src/pages/PersonalizeStoryPage.tsx) | 4 steps: name → gender → photo → **visual style** (watercolor / semi_realistic / flat_cartoon / paper_craft / vintage). Style + draft persisted to `localStorage`. |
| Preview API (client) | [client/src/api/caregiverApi.ts](client/src/api/caregiverApi.ts) | `generatePreview` / `createDirectPurchasePreview` send `templateId, childFirstName, childGender, childAgeGroup, photoFile`. **`visualStyle` is never sent.** |
| Preview API (server) | [server/src/routes/caregiver/previews.router.ts](server/src/routes/caregiver/previews.router.ts) | multipart upload; validates gender + age band; **no `visualStyle` param; no `personalizationEnabled` check.** |
| Preview generation | [server/src/services/preview.service.ts:371](server/src/services/preview.service.ts) | First 2 pages only (`PREVIEW_SPREAD_LIMIT = 2`). Per page: `selectTextVariant` → `personalizeText` → `buildImagePrompt` → Seedream with `referenceImage = child photo signed URL` (30 min). 1 free preview per caregiver. |
| Checkout → full story | [server/src/services/fullStoryGeneration.service.ts](server/src/services/fullStoryGeneration.service.ts) | Copies preview pages 1–2, generates remaining pages (concurrency 3, 1 retry), passes `referenceImage` (1 h signed URL), deletes child photo at the end. |
| Cleanup | [server/src/services/previewCleanup.service.ts](server/src/services/previewCleanup.service.ts) | 5 cron-style jobs: expired photos, orphan uploads, converted previews, abandoned (30 d), stuck/failed (72 h). |

### 1.2 Specialist illustration pipeline (v2 — shipped)

Reference: [docs/illustration/spec.md](docs/illustration/spec.md). Code under [server/src/illustration/](server/src/illustration/).

| Concern | Location | Reusable for caregiver? |
|---|---|---|
| Visual Bible (character anchor, style guide, palette, env registry, avoid list, consistency anchors) | [stage1-visual-director/](server/src/illustration/stage1-visual-director), type [types/visual-bible.ts](server/src/illustration/types/visual-bible.ts) | **Yes** — read-only input for personalized prompts |
| Scene Plan per page (prose, emotionalIntent, keyVisibleDetail, `director`, `structuredPrompt`) | [stage1-scene-planner/](server/src/illustration/stage1-scene-planner), type [types/scene-plan.ts](server/src/illustration/types/scene-plan.ts) | **Yes** — the approved scene to preserve |
| Structured prompt (5-section) | [stage2-prompt-engineer/](server/src/illustration/stage2-prompt-engineer) | **Yes** — reuse format |
| Final prompt assembly (pure fn) | [stage3-final-prompt/](server/src/illustration/stage3-final-prompt) | **Yes — with a personalized mode** (see §4) |
| Image generation (provider + storage) | [stage4-image-generation/](server/src/illustration/stage4-image-generation) | **Partly** — provider call reusable; storage path + reference-image are caregiver-specific |
| Provider abstraction | [server/src/shared/types/aiProvider.ts](server/src/shared/types/aiProvider.ts) | **Yes** — `ImageGenerationProvider` **already keeps `referenceImage?`** explicitly for the caregiver flow |
| Artefact reads | [shared/artefact-store.ts](server/src/illustration/shared/artefact-store.ts) | **Yes** — `readLatestVisualBible`, `readScenePlan`, `readLatestFinalPrompt`, `readLatestImage` |
| Background-job worker (Firestore-backed, retry, idempotency) | [worker/](server/src/illustration/worker) | **Reusable pattern** for caregiver image jobs |

Key fact: the specialist pipeline anchors consistency in **structured text only** (no reference
images). The caregiver flow is the *only* place `referenceImage` is used — and that is by design.

### 1.3 Published story / template model

[server/src/shared/types/storyTemplate.ts](server/src/shared/types/storyTemplate.ts), written by
[server/src/illustration/orchestrator/publishStory.ts](server/src/illustration/orchestrator/publishStory.ts).

**Template contains:** title, slug, shortDescription, displayTopic, `primaryTopic`/`topicKey`,
`specificSituation`, `ageGroup`, `generationConfig` (language/length/tone/emphasis), `coverImage`,
`previewSpreads[2]`, `previewSentence`, and `pages[]` where each page =
`{ pageNumber, textTemplate:{masculine,feminine}, imagePromptTemplate, emotionalTone }`.

**Template is MISSING everything personalization needs:**
- **No `personalizationEnabled` flag.** `publishStory` computes `isPersonalizable` locally ([publishStory.ts:109](server/src/illustration/orchestrator/publishStory.ts)) but **never writes it**.
- **No `visualPersonalizationEnabled`, no `allowedIllustrationStyles`, no `defaultIllustrationStyle`.**
- **`textTemplate.masculine` and `.feminine` are set to the *same plain page text*** ([publishStory.ts:125-136](server/src/illustration/orchestrator/publishStory.ts)) — no `{{CHILD_NAME}}`, no pronoun placeholders, no real gender variants.
- **`imagePromptTemplate` is the Stage-3 final prompt string** ([publishStory.ts:121](server/src/illustration/orchestrator/publishStory.ts)) — it embeds the *specialist's* `characterAnchor` verbatim and contains **no `{{CHARACTER_DESCRIPTION}}` placeholder.**
- **No Visual Bible / scene plan / character definitions / `sourceStoryId` / `specialistId`** copied. Those live only in the `stories/{storyId}/…` subcollections.

### 1.4 Firestore / Storage model

Collections: `story_templates`, `storyPreviews`, `personalizedStories`, `caregivers/{uid}` (+ cart,
favorites, purchases). Artefacts: `stories/{id}/{visualBibles,scenePlans,finalPrompts,images}`.

Storage ([server/src/shared/firestore/paths.ts](server/src/shared/firestore/paths.ts)) +
[storage.rules](storage.rules): `child-photos/**` = **deny all client access (admin only)** ✓;
`preview-illustrations/**` + `generated-illustrations/**` = owner-read; `specialist-illustrations/**`
+ `template-assets/**` = public read. Child photos use short-lived signed URLs (30 min preview /
1 h full) and are deleted after generation. **Privacy posture is already sound.**

### 1.5 Personalization service (the rendering primitives)

[server/src/services/personalization.service.ts](server/src/services/personalization.service.ts):
- `selectTextVariant(page, gender)` → picks `masculine`/`feminine`.
- `personalizeText(template, child, lang)` → replaces `{{CHILD_NAME}}`, `{{PRONOUN_SUBJECT|OBJECT|POSSESSIVE}}` (he/ar pronoun maps only).
- `buildImagePrompt(template, child)` → replaces `{{CHARACTER_DESCRIPTION}}` with "a young boy/girl named X".

These functions are correct in isolation — but the **published template gives them nothing to act
on** (no placeholders, identical variants).

---

## 2. Root Cause of Current Problems

1. **Personalization text does not change** → `publishStory` writes plain page text into *both*
   `textTemplate.masculine` and `.feminine` with **no placeholders**. `personalizeText` /
   `selectTextVariant` run but have nothing to substitute or choose between. Root cause is in
   **publishing**, not in the caregiver flow.
2. **Image personalization is weak / inconsistent** → `imagePromptTemplate` is the specialist's
   final prompt with the original character baked in and **no `{{CHARACTER_DESCRIPTION}}` slot**.
   `buildImagePrompt` is a no-op; the only thing personalizing the image is the `referenceImage`
   (child photo). The result is "original prompt + a face reference," which neither reliably
   replaces the protagonist nor guarantees scene preservation.
3. **Chosen illustration style is ignored end-to-end** → collected in the wizard, saved to
   `localStorage`, but **never sent to any API** and **never reaches the image prompt**. There is no
   `allowedIllustrationStyles` on the template and no style param on the provider call.
4. **Eligibility is not enforced** → no `personalizationEnabled` on the template; the detail page
   always shows "Personalize"; the preview API never checks. A fixed story can be "personalized."
5. **Scene preservation is accidental** → because the personalized prompt = specialist final prompt
   (which encodes the approved scene) the scene is *roughly* preserved today, but only as a
   side-effect, and the reference-image approach can pull composition off-model.

---

## 3. Reuse Opportunities (avoid duplication)

**Reuse as-is (read-only):** `artefact-store` readers (Visual Bible, scene plan, final prompt,
image), the `ImageGenerationProvider` abstraction (with its caregiver `referenceImage`), the
Firestore-backed worker pattern, the Seedream image-size constant, the existing preview/full-story
storage paths and cleanup jobs.

**Promote to shared (the key refactor):** the **Stage-3 final-prompt assembler** should grow a
**personalized mode** that takes the approved Visual Bible + scene plan + structured prompt and
swaps *only* the character anchor for a child-identity anchor and the style guide for the
parent-selected style — emitting a prompt that keeps setting/composition/lighting/scene intact.
This is the single most important reuse: **do not build a second prompt builder.**

**Do not duplicate:** scene planning, visual-bible generation, structured-prompt generation. The
caregiver flow must **consume** specialist artefacts, never regenerate scenes.

**Caregiver-only additions:** child-identity anchor text, style override, `referenceImage` plumbing,
`previewId`/`personalizedStoryId` scoping, privacy-safe photo handling.

---

## 4. Required Changes in the Specialist / Publishing Pipeline

The specialist *generation* stages (1a/1b/2) need **no change**. The changes are at **publish** and
in **final-prompt assembly**:

1. **Publishing must carry personalization metadata + three readiness flags into the template.**
   Add to `story_templates`: `personalizationEnabled` (author intent, from the already-computed
   `isPersonalizable` = `brief.storyWorld.personalization`), `textPersonalizationReady`,
   `visualPersonalizationReady`, `allowedIllustrationStyles[]`, `defaultIllustrationStyle`,
   `sourceStoryId`, `specialistId`. The two `*Ready` flags are **data-availability gates** the UI/API
   trust: `textPersonalizationReady` is true only when reviewed gendered variants with `{{CHILD_NAME}}`
   exist for every page; `visualPersonalizationReady` is true only when the per-page art-direction
   snapshot (§4.3) exists. `personalizationEnabled` is author intent; the `*Ready` flags are what
   actually unlock each capability.
2. **Publishing must emit personalizable page text** — `textTemplate.masculine` / `.feminine` must
   contain **reviewed** gender variants with `{{CHILD_NAME}}` placeholders (see §6). Today both are
   identical plain text. Until variants are generated **and reviewed**, leave
   `textPersonalizationReady = false`.
3. **Publishing must snapshot the per-page art-direction into the template** (decision #3): the
   approved Visual Bible (character anchor/sheet, style guide, palette, avoid list, consistency
   anchors), per-page scene plan (emotional intent, key visible detail) and **structured prompt** —
   everything needed to re-prompt **without re-running the LLM and without reading the source story**.
   This keeps the public flow stable even if the specialist story is later edited or archived.
   **Document-size guard:** Firestore caps a document at **1 MiB**. If the snapshot (esp. structured
   prompts + Visual Bible across many pages) risks approaching that, store it in a **subcollection**
   (`story_templates/{id}/personalizationArtefacts/{pageNumber}`) or a single separate artifact doc,
   and keep only light pointers + the readiness flags on the main template. Set
   `visualPersonalizationReady = false` if the snapshot is incomplete.
4. **Final-prompt assembler gains two modes** ([stage3-final-prompt](server/src/illustration/stage3-final-prompt)) —
   full design in **§7A**:
   - *template mode* (today): specialist `characterAnchor` + specialist style. Used for the
     Dashboard and the public sample images.
   - *personalized mode* (new): re-assemble from structured parts, **exclude**
     `protagonistSlot.sampleCharacterDescription` (the appearance leak at
     [index.ts:98](server/src/illustration/stage3-final-prompt/index.ts)), inject the child-identity
     anchor + parent style + child photo reference; everything else (setting, focal point,
     composition, lighting, palette, avoid list) identical to the approved page. **Never** built from
     the stored `imagePromptTemplate`.
5. **Provider reference-image support stays** (`referenceImage?` already in the contract). No change
   required, but the personalized prompt should be authored to *describe* the child (age/gender/name
   slot) so identity survives even if the reference image is unavailable.
6. **Publish persists the two-mode data** (decision #6): set `protagonistSlot` +
   `personalizedCharacterPolicy`; carry the specialist `characterAnchor`/`characterSheet` into the
   slot's `sampleCharacterDescription`/`sampleCharacterSheet` (template mode uses them, personalized
   mode excludes them); and write **`sampleImageUrl`** per page so the public full-sample reader can
   render the approved images. Sample images stay in `specialist-illustrations/…` and are **immutable**
   after publish.

---

## 5. Proposed New Architecture

**Text personalization** (§6): template-based, language-aware. English uses pronoun placeholders;
Hebrew/Arabic use **masculine/feminine page variants** authored at publish time. Rendering reuses
`selectTextVariant` + `personalizeText`.

**Image personalization** (§7, §9): derive each personalized page prompt from the **approved scene
plan + Visual Bible + parent style + child identity**, via the shared assembler's *personalized
mode*, optionally feeding the child photo as `referenceImage`. Scene is preserved by construction —
only the character anchor and style guide change.

**Preview vs full** (§11): preview = first 2 pages, generated before purchase; full = remaining
pages after successful payment, in the background with retry. Matches today's split.

**Privacy & cleanup** (§12): unchanged posture (admin-only photo storage, short signed URLs,
delete-after-generation, cleanup jobs). Add style + status fields; do not extend photo retention.

---

## 6. Text Personalization Architecture

Story text is stored as `pages[].textTemplate.{masculine,feminine}` (plain strings today). The
clean direction:

- **English:** single template per page with placeholders `{{childName}}`, `{{subjectPronoun}}`,
  `{{objectPronoun}}`, `{{possessivePronoun}}`. Resolve at render.
- **Hebrew & Arabic:** verbs/adjectives/pronouns inflect by gender, so placeholder substitution is
  insufficient. **Author two full page variants (masculine, feminine) with `{{CHILD_NAME}}`** — this
  is what `textTemplate.{masculine,feminine}` was designed for. `selectTextVariant` then picks by
  gender and `personalizeText` injects the name.
- **Where the variants come from:** the specialist manuscript is single-gender prose. Add a
  **publish-time text-personalization step** that, when `personalizationEnabled`, produces the two
  gendered variants + name placeholder per page (LLM-assisted rewrite controlled by explicit rules:
  replace protagonist references with `{{CHILD_NAME}}`, inflect to each gender, change nothing else).
  This is the **hybrid approach** and the only one that guarantees correct grammar in he/ar male &
  female. **Pilot scope (decision #2): Fear & Anxiety, Hebrew + Arabic first.** Simple string
  replacement is explicitly **not** acceptable for he/ar.
- **Review gate (decisions #2 + #7):** generated variants are **not public until reviewed.** The
  publish step writes the variants but holds `textPersonalizationReady = false` until **the publishing
  specialist reviews their own story's variants** and approves. Only then does text personalization
  unlock for that story. (Self-review by the author, not a separate admin gate.)
- **Guarantee:** correctness is enforced by (a) variants authored at publish + **human review**, not
  at request time, (b) a publish validation that both variants contain `{{CHILD_NAME}}` and differ for
  he/ar, and (c) the `textPersonalizationReady` gate the API/UI trust.

---

## 7. Personalized Illustration Architecture

Each personalized page prompt is **derived, not invented**:

```
personalizedPagePrompt =
    approved structuredPrompt (setting, focalPoint, composition, lighting)   ← unchanged
  + Visual Bible (palette, avoidList, consistency anchors)                   ← unchanged
  − specialist characterAnchor                                              ← removed
  + child-identity anchor (age/gender + {{CHILD_NAME}})                      ← added
  − specialist styleGuide  + parent-selected illustration style              ← swapped
  (+ child photo as referenceImage, when available)
```

Invariants: same scene, same moment, same composition intent, same therapeutic context, same page
order; only protagonist identity + art style adapt. The child-identity section is **strong and
explicit** (age band, gender, `{{CHILD_NAME}}`, "this child is the protagonist in every frame") so
identity survives even when the reference image is weak. If the provider still preserves identity
poorly, that is logged as a **provider-quality limitation** (decision #1), not a pipeline change.

Style options come from **one shared source of truth** (decision #4): stable internal style IDs used
identically by the wizard's `VISUAL_STYLES`, the template's `allowedIllustrationStyles`, backend
validation, and the style-instruction map that injects the chosen style into the prompt. Display
labels are translated separately; **saved values are always the internal IDs.**

## 7A. Two Illustration Modes (decision #6)

### 7A.1 The leak point (why we can't reuse `imagePromptTemplate`)

`assembleFinalPrompt` ([stage3-final-prompt/index.ts:98](server/src/illustration/stage3-final-prompt/index.ts))
builds the character segment as:

```
`${visualBible.characterAnchor} In this scene: ${sp.character}.`
```

`characterAnchor` is the specialist protagonist's **physical appearance** (hair, clothing, build…),
embedded **verbatim in every page's final prompt**. `publishStory` then stores that whole string as
`pages[].imagePromptTemplate`. **Therefore the original protagonist appearance is baked into the
published image prompt.** Personalized mode must **never** reuse that string — it must re-assemble
from the **structured parts** and drop the protagonist appearance.

Note: only `characterAnchor` and (to a lesser degree) the structured `sp.character` carry appearance
into the *image*. The scene plan `prose`/`title`/name are **not** used by the assembler, so they pose
no image-leak risk. `sp.character` is pose/contact/gaze (e.g. "two steps back from the door, both
arms holding the bag"), which is **scene action to preserve**, not identity.

### 7A.2 The two modes

| | **Template / sample mode** (specialist + public sample) | **Personalized mode** (after parent Personalize) |
|---|---|---|
| Character | specialist `characterAnchor` / `characterSheet` (sample appearance) | **child-identity anchor** + uploaded photo as `referenceImage`; sample appearance **excluded** |
| Style | specialist style guide / consistency anchors | **parent-selected style** (overrides art-medium tokens) |
| Scene (setting, `sp.character` pose, focal point, composition, lighting), palette, avoid-list, no-text | unchanged | **unchanged** (preserved) |
| Prompt source | current assembler (`mode: "template"`) | same assembler (`mode: "personalized"`), re-assembled from structured parts — **never** the stored `imagePromptTemplate` |
| Output images | `specialist-illustrations/{storyId}/…` → published as sample; **immutable** | `preview-illustrations/…` + `generated-illustrations/…` (owner-scoped); **separate; never overwrite sample** |

### 7A.3 The replaceable-protagonist concept

The system must explicitly know which character is replaceable. For the pilot (single child
protagonist; multi-character is deferred per the spec), add an explicit marker rather than inferring:

- **`protagonistSlot`** on the template snapshot (and optionally the Visual Bible):
  `{ role: "main_child_character", replaceable: true, sampleCharacterDescription: <characterAnchor>,
  sampleCharacterSheet: <characterSheet> }`. The `sampleCharacterDescription` is what template mode
  uses and personalized mode **excludes**.
- **`personalizedCharacterPolicy`** on the template: `"replace_with_child_photo"` (pilot default when
  `personalizationEnabled`) vs `"keep_sample"`. Controls whether personalization swaps the protagonist
  at all.
- A full multi-character `replaceableCharacterId` registry is **deferred** until a multi-character
  story enters scope (matches illustration spec open-Q #4). Modeling the single slot now keeps the
  change small and future-proof.

**Where it's set:** at **publish/snapshot time**, not in the specialist generation stages (decision #1
keeps Stages 1a/1b/2 untouched). Since pilot personalization is always the single child protagonist,
publish sets `protagonistSlot.role = "main_child_character"` whenever `personalizationEnabled`.

### 7A.4 Personalized assembler (`mode: "personalized"`)

Re-assemble from the structured snapshot, **swapping only identity + style**:

```
KEEP   no-text lead · setting + spatialLayout · sp.character (pose) · focalPoint · lighting · palette · avoid · footer
DROP   protagonistSlot.sampleCharacterDescription (the appearance leak) + specialist art-medium tokens
ADD    child-identity anchor: age band + gender + {{CHILD_NAME}},
       "the uploaded child is the main character in every frame; use the reference photo for facial
        identity; ignore any other character appearance description"
ADD    parent style instruction (from the shared style map, by internal ID)
PASS   child photo as referenceImage (short-lived signed URL) when available
```

Leak prevention is enforced by construction (re-assembly excludes `sampleCharacterDescription`) **and**
by a test asserting the personalized prompt string does **not** contain the sample
`characterAnchor` text (see §16-D).

**Style-override scope (decision #8).** The parent style overrides **only the art-medium / rendering
tokens** (watercolor → cartoon, etc.). It **preserves** the approved scene, setting, action, emotional
tone, composition, lighting *mood*, palette anchors *where possible*, and therapeutic meaning, and must
**never** invent a new scene or change the narrative moment. Concretely: keep `setting` + spatial
layout, `sp.character` pose, `focalPoint`, `composition`, `lighting` mood, palette, avoid-list; the
style instruction replaces only the specialist art-medium/style-guide tokens. Test D (§16) guards that
switching style changes style tokens but not the scene fields.

### 7A.5 Public site sample display

All public sample imagery comes from the **specialist-approved** pipeline, never regenerated for the
public:

- **Cover** — `coverImage` (page-1 sample image). ✓ exists.
- **Story-details preview** — `previewSpreads[2]` (sample image + text). ✓ exists.
- **Sample reader pages (full sample story)** — **currently missing**: template `pages[]` has no
  per-page image URL. Add **`sampleImageUrl`** per template page so the public reader can show the
  full approved sample when available.
- **Personalized reader** — uses the owner-scoped preview / personalized-story page images, **never**
  the sample URLs for personalized pages. The reader switches image source by mode; personalized
  images never overwrite sample images.

---

## 8. Reuse vs Duplication (decision)

Reuse the assembler, provider, artefact readers, worker pattern, storage conventions, retry, and
concurrency. Add a **personalized assembler mode** + a **child-identity anchor builder** + a
**style-instruction map**. **No second scene/visual-bible/prompt pipeline.** If, post-pilot, the
provider proves too weak at identity injection from text+reference, that is a provider-extension
question, not a reason to fork the pipeline.

---

## 9. Prompt Strategy (personalized)

Inputs: `publishedStoryId`, `pageNumber`, approved structured prompt + emotional intent, Visual
Bible snapshot, `childName`, `childGender`, `childPhoto` signed URL (optional),
`selectedIllustrationStyle`, `language`, safety constraints.

Requirements: preserve scene/tone/purpose; replace protagonist with the child; apply style; never
change setting/action/meaning; never add characters; keep child-safe, warm storybook visuals; keep
the no-text avoid-list item. If `referenceImage` is supported (it is) pass the short-lived signed
URL; if absent, fall back to the textual child-identity anchor (description-only).

**Built by re-assembly, not reuse (see §7A).** The personalized prompt is assembled from the
**structured snapshot** (structured prompt + Visual Bible environment/palette/avoid/consistency),
**excluding** `protagonistSlot.sampleCharacterDescription`. It must **never** be derived from the
stored `imagePromptTemplate` / `finalPromptString`, which has the sample protagonist appearance baked
in. Leak prevention is enforced by construction + a test (§16-D).

---

## 10. Firestore & Storage Model (proposal)

Extend existing collections — do **not** invent parallel ones (preview/personalized stories already
exist):

- `story_templates/{id}` **+** `personalizationEnabled` (author intent), `textPersonalizationReady`,
  `visualPersonalizationReady`, `allowedIllustrationStyles[]` (internal IDs), `defaultIllustrationStyle`,
  `sourceStoryId`, `specialistId`, **`personalizedCharacterPolicy`** ("replace_with_child_photo" |
  "keep_sample"), and **`protagonistSlot`** `{ role: "main_child_character", replaceable: true,
  sampleCharacterDescription, sampleCharacterSheet }` (§7A.3). Gender text variants live in the
  existing `textTemplate`.
- **Per template page** **+** **`sampleImageUrl`** (the specialist-approved sample image public URL,
  for the full public sample reader — currently missing; §7A.5). The existing `imagePromptTemplate`
  stays as the **template-mode** prompt and is **not** used for personalized images.
- **Art-direction snapshot (decision #3):** Visual Bible (environment registry, palette, avoid list,
  consistency anchors) + per-page **structured prompt** + emotional intent, **plus** the
  `protagonistSlot` (so personalized mode can exclude `sampleCharacterDescription`). Inline on the
  template **if** it stays well under the **1 MiB** doc limit; otherwise move to
  `story_templates/{id}/personalizationArtefacts/{pageNumber}` (subcollection) with only flags + a
  pointer on the main doc. Validate size at publish; set `visualPersonalizationReady` accordingly.
- `storyPreviews/{previewId}` **+** `selectedIllustrationStyle` (internal ID; currently absent).
- `personalizedStories/{id}` **+** `selectedIllustrationStyle`.

**Image storage (separate, never overwrite):**
- **Sample/template images** → `specialist-illustrations/{storyId}/…` (existing; public read,
  immutable after publish). URLs surface in `coverImage`, `previewSpreads`, and the new per-page
  `sampleImageUrl`.
- **Personalized images** → `preview-illustrations/{caregiverUid}/{previewId}/…` (preview) and
  `generated-illustrations/{caregiverUid}/{storyId}/…` (full), both owner-scoped. These are already
  distinct paths, so personalized output **cannot** overwrite sample output. Storage rules reused
  unchanged.

---

## 11. Preview vs Full Generation

Keep the existing split (it is correct): **before purchase** generate only the 2 preview pages;
**after successful payment** generate the rest in the background with retry + progress. This caps
image-gen cost and respects the 1-free-preview quota. Add `selectedIllustrationStyle` to the
preview/full inputs so style flows through both.

---

## 12. Privacy & Child Photo Security

Already strong (admin-only storage, deny-all client rules, short signed URLs, delete-after-gen,
cleanup jobs). Plan changes: (a) ensure **specialist pipeline never receives child photos** (it
doesn't — referenceImage is caregiver-only); (b) keep retention windows as-is; (c) on account
deletion, add a cleanup path for any lingering previews/personalized stories + photos; (d) ensure
style/preview metadata never leaks the photo URL beyond the short signed window.

---

## 13. Backend / API Changes

Today personalization is **Express routes + async in-process generation** (no Firebase Functions for
this path). Keep that. Changes:
- `previews/generate` + `previews/direct-purchase` + checkout: **accept `selectedIllustrationStyle`**,
  validate against the template's `allowedIllustrationStyles`.
- **New eligibility endpoint** (or fields on the template fetch the client already does) exposing
  `personalizationEnabled`, `textPersonalizationReady`, `visualPersonalizationReady`,
  `allowedIllustrationStyles`, `defaultIllustrationStyle`.
- **Server-side guard:** reject preview/personalization when the template is unpublished/inactive or
  `personalizationEnabled !== true`; gate **text** personalization on `textPersonalizationReady` and
  **visual** personalization on `visualPersonalizationReady`. A story may be text-ready but not
  visual-ready (or vice versa) — degrade gracefully rather than blocking the whole flow. Fail with a
  clear error when a requested capability isn't ready.
- Preview/full generation: switch the image prompt source from the specialist final prompt to the
  **personalized assembler** (§7).

---

## 14. UI Changes

- **Detail page:** if `personalizationEnabled` is false (or both `*Ready` flags false), hide the
  Personalize CTA and show a "fixed story" message; otherwise show the CTA. Capability messaging
  follows the `*Ready` flags (e.g. text-only personalization when `visualPersonalizationReady` is
  false).
- **Wizard:** drive the style list from `allowedIllustrationStyles` (+ `defaultIllustrationStyle`),
  using internal IDs with translated labels; require the photo step only when
  `visualPersonalizationReady`; **send `selectedIllustrationStyle`** (internal ID) to the API; show
  generating progress, clear errors, and the preview result.

## 15. Validation & Safety

Cannot personalize: unpublished / inactive / `personalizationEnabled=false` stories. Text
personalization requires `textPersonalizationReady`; visual personalization requires
`visualPersonalizationReady`. Require name + gender; require photo only when visual personalization is
ready. Style must be one of `allowedIllustrationStyles` (internal ID). Block image generation if the
art-direction snapshot (structured prompts / Visual Bible) is missing. All enforced **server-side**;
client mirrors for UX.

## 16. Testing Plan (summary)

A. **Disabled:** non-personalizable story hides the form; API rejects personalization; fixed-story
purchase still works. B. **Enabled:** preview shows child name; he/ar gender grammar correct; style
saved + reflected in prompt; preview images generated; **prompt scene == approved scene plan**.
C. **Style (decision #8):** switching style changes **only** the art-medium/rendering tokens; the
scene fields (setting, pose, focal point, composition, lighting mood, palette anchors) and narrative
moment stay intact — no invented scene. D. **Scene preservation & no-leak:** diff approved structured prompt vs personalized prompt — only character + style differ;
assert the personalized prompt string does **not** contain `protagonistSlot.sampleCharacterDescription`
(the sample `characterAnchor`) and is **not** equal to the stored `imagePromptTemplate`; confirm
sample images in `specialist-illustrations/…` are untouched after a personalization run. E.
**Multilingual:** en/he/ar × male/female. F. **Privacy:** cannot read another user's photo or
preview; raw photo not public; cleanup deletes. G. **Purchase/full:** full generation starts post-pay,
lands in the library, reader shows personalized text + images.

## 17. Implementation Phases

- **Phase 1 — Data model & publish:** add template personalization fields + the three flags
  (`personalizationEnabled`, `textPersonalizationReady`, `visualPersonalizationReady`); snapshot the
  art-direction (inline or subcollection per the 1 MiB check); persist `protagonistSlot` +
  `personalizedCharacterPolicy` + per-page `sampleImageUrl` (§7A); write `personalizationEnabled` from
  the brief. Unify the style taxonomy (shared internal IDs) in this phase so later phases build on it.
- **Phase 2 — Eligibility:** server guard + client gating off the readiness flags (detail CTA, wizard
  requirements, capability messaging).
- **Phase 3 — Text personalization:** publish-time variant generation (F&A, he/ar first) + a
  **specialist self-review gate** (the publishing specialist reviews their own variants; decision #7)
  flipping `textPersonalizationReady`; verified he/ar grammar. Needs a small review UI/endpoint in the
  Dashboard for the author to approve per story.
- **Phase 4 — Photo & privacy:** confirm/extend secure upload + `selectedIllustrationStyle` capture +
  cleanup-on-account-deletion.
- **Phase 5 — Preview image personalization:** shared assembler *personalized mode* (§7A.4) —
  exclude `sampleCharacterDescription`, inject style + strong child-identity anchor + reference image,
  re-assemble from structured parts (never the stored `imagePromptTemplate`); preview 2 pages; add the
  no-leak test (§16-D).
- **Phase 6 — Full story after purchase:** same assembler for remaining pages; retry + progress.
- **Phase 7 — Tests, cleanup jobs & migration prep:** the §16 matrix + account-deletion cleanup +
  the **dry-run** backfill report (§18.1) — report only, no mutation.

## 18. Resolved Decisions & Backfill Plan

All five open questions are resolved (see "Decisions resolved" at the top). Residual risks to track
during implementation:

- **Identity injection** — accepted as a possible **provider-quality limitation**; mitigated by a
  strong child-identity prompt section + reference image; revisit via tuning/provider swap, not a
  pipeline fork.
- **Publish-time text variants** — adds an LLM step + a **human review gate**; pilot F&A he/ar only;
  correctness gated by `textPersonalizationReady`.
- **Snapshot size** — guard against the **1 MiB** Firestore doc limit; subcollection fallback ready.
- **Style taxonomy** — single set of internal IDs across client/template/backend; labels translated
  separately.

### 18.1 Backfill / migration plan for already-published templates (PREPARE, DO NOT RUN)

Non-destructive, flag-driven, dry-run first.

1. **Dry-run report (run first, mutates nothing):** list every published template and, per template,
   whether `sourceStoryId` exists and whether the source story has a reliable Visual Bible, scene
   plans, character definitions, prompt metadata, and gendered text variants. Output: what *would*
   change.
2. **If `sourceStoryId` + reliable art-direction exist:** snapshot Visual Bible / scene plans /
   character anchors / prompt metadata into the template (inline or subcollection per 1 MiB check) and
   set `visualPersonalizationReady = true`.
3. **If required art-direction is missing:** keep the story **visible in the catalog** but set
   `visualPersonalizationReady = false` (visual personalization disabled for that story).
4. **If gendered text variants / placeholders are missing:** set `textPersonalizationReady = false`
   (text personalization disabled) until variants are generated **and reviewed**.
5. **Never delete existing story content. Never overwrite approved public text or images without
   review.**
6. **Always write the flags** (`personalizationEnabled`, `textPersonalizationReady`,
   `visualPersonalizationReady`) so UI + API decide safely per capability.
7. Migration runs only after the dry-run report is reviewed and approved.
