# CLAUDE.md — DAMMAH Platform

This file is the orientation document for anyone (human or AI) working in this repository. It explains what DAMMAH is, how the system is laid out, and how the therapeutic-story pipeline flows from a clinical brief to a published, optionally personalized book.

Canonical sources of truth referenced throughout:
- Story Brief spec: [docs/dammah-story-brief-spec-v1.3.md](docs/dammah-story-brief-spec-v1.3.md)
- Agent 1 docs index: [docs/agent1/README.md](docs/agent1/README.md) and [server/src/agent1/docs/01-architecture.md](server/src/agent1/docs/01-architecture.md)
- Specialist Dashboard docs: [client/src/specialist/docs](client/src/specialist/docs)
- API surface: [server/src/specialist/docs/05-api-surface.md](server/src/specialist/docs/05-api-surface.md)

If a deep spec disagrees with this file, the deep spec wins.

---

## 1. What DAMMAH is

DAMMAH is a platform for **therapeutic AI-generated children's stories designed by licensed child psychologists**. The product has two faces:

1. A **Specialist Dashboard** where a licensed psychologist creates, refines, and publishes therapeutic stories.
2. A **public site** where caregivers browse the published library, optionally personalize a story for a specific child, and purchase it.

The clinical content is authored — not consumed — by AI. Every published story has gone through a structured clinical brief, a multi-step AI generation pipeline, a specialist review, and an approval gate. The AI is the drafting tool; the psychologist is the author of record.

The platform is bilingual at launch (Hebrew default, Arabic; English used for some internal/UI strings). Right-to-left layout is the default.

---

## 2. Repository layout

This is a TypeScript monorepo.

```
/
├── client/                          React 19 + MUI 7 SPA (Create React App)
├── server/                          Express 5 + Firebase Admin API (Node 20)
├── packages/
│   └── story-brief-complexity/      Shared pure-function engine for the
│                                    Section-16 complexity budget (consumed by
│                                    both client and server)
├── docs/                            Product + agent + dashboard specifications
├── scripts/                         Top-level npm helpers (role admin)
├── firebase.json                    Firestore, Storage, Functions, Hosting cfg
├── firestore.rules                  Role-based Firestore security rules
├── firestore.indexes.json
├── storage.rules
└── render.yaml                      Render Blueprint for the Express API
```

Hosting model:
- **Client** → Firebase Hosting (built CRA bundle).
- **Firebase Functions** are configured but currently host one trigger: `autoFillPreviewSentence` on `story_templates` writes ([server/src/functions/onStoryTemplateWrite.ts](server/src/functions/onStoryTemplateWrite.ts)).

---

## 3. Roles and auth

Authentication is Firebase Auth. Roles live in **custom claims** on the user token and are read by both the Express auth middleware and Firestore rules.

| Role         | Where it appears                                      | What it can do                                       |
|--------------|-------------------------------------------------------|------------------------------------------------------|
| `specialist` | Specialist Dashboard, `/api/specialist/*`             | Create / generate / edit / approve stories           |
| `admin`      | Admin pages under `/admin/*`, all specialist routes   | Everything `specialist` can do, plus admin views     |
| `caregiver`  | Public site, `/api/caregiver/*`                       | Cart, previews, checkout, owned personalized stories |
| `viewer`     | Fallback when no role claim is present                | Read public templates                                 |

The Express auth surface is in [server/src/middleware/auth.middleware.ts](server/src/middleware/auth.middleware.ts) (`requireAuth`, `requireRole`) and the caregiver-specific gate is [server/src/middleware/caregiverAuth.middleware.ts](server/src/middleware/caregiverAuth.middleware.ts).

Role administration scripts: `npm run set-user-role` and `npm run get-user-role` (see [package.json](package.json) and [server/scripts/setUserRole.ts](server/scripts/setUserRole.ts)).

---

## 4. End-to-end workflow

A story moves through this pipeline:

```
draft_brief → generating → awaiting_review → in_review ⇄ needs_revision
                                                  ↓
                                              approved → published
                                                  ↓
                                              archived
```

The state machine is defined in [server/src/models/story.model.ts](server/src/models/story.model.ts) (`ALLOWED_TRANSITIONS`, `isTransitionAllowed`) and mirrored client-side in [client/src/types/story.ts](client/src/types/story.ts). **Transitions are server-enforced.** The client requests a transition via `POST /api/specialist/stories/:storyId/transitions`; the server validates against the state machine before persisting.

### 4.1 Story creation — the Story Brief

The specialist starts a Story (no brief exists yet — the **Story is the unit, the brief is a sub-document**, see decision D1 in [client/src/specialist/docs/00-overview.md](client/src/specialist/docs/00-overview.md)). [client/src/specialist/pages/NewStoryRedirect.tsx](client/src/specialist/pages/NewStoryRedirect.tsx) creates the empty Story and redirects to its workspace.

The brief is a structured 5-section form. Section components live in [client/src/components/brief/](client/src/components/brief):
- `Section1AgeAndScope` — age range, peak intensity, story length
- `Section2ClinicalFoundation` — population, trigger, therapeutic intention, creative vision
- `Section3TherapeuticArchitecture` — primary/supporting approach, shame dimension, type-specific field (somatic expression for fear/anxiety), coping tool, must-never list
- `Section4StoryWorld` — protagonist, caregiver presence, supporting characters
- `Section5PersonalizationConfig` — whether the story supports child-name personalization

While editing, a [ComplexityMeter](client/src/components/brief/ComplexityMeter.tsx) shows the weighted page-cost against the available pages, powered by the shared engine in [packages/story-brief-complexity/](packages/story-brief-complexity). When the cost goes red, the brief cannot be submitted until obligations are trimmed or peak intensity / length is bumped.

The brief's TypeScript shape — including value-type unions and the field registry — is in [server/src/models/storyBrief.model.ts](server/src/models/storyBrief.model.ts). This is the **canonical source for token values**; never duplicate constants from it.

Submission moves the Story to `generating`.

### 4.2 AI Story Draft — Agent 1

Agent 1 is the LLM pipeline that produces the first draft. It lives entirely under [server/src/agent1/](server/src/agent1) and is invoked from the specialist router at [server/src/routes/specialist/stories.router.ts](server/src/routes/specialist/stories.router.ts) (`POST /:storyId/generate`).

The public API is two functions in [server/src/agent1/index.ts](server/src/agent1/index.ts):

```ts
generateStoryDraft(briefId, options?)            // reads brief from Firestore
generateStoryDraftFromBrief(brief, options?)     // takes brief inline (pilot path)
```

The pipeline ([server/src/agent1/pipeline.ts](server/src/agent1/pipeline.ts)) runs four stages:

1. **Pre-check** ([server/src/agent1/pre-check/](server/src/agent1/pre-check)) — rule-based, no LLM. Produces warnings (`quality-gate`, `vague-intention`, `complexity-budget`). Warnings never block; they flow to the UI.
2. **Step 1 — Story Architect** ([server/src/agent1/step1-architect/](server/src/agent1/step1-architect)) — Claude Opus call. Produces an emotional truth paragraph, a 6-point blueprint, a coping-tool placement, and an approach instruction. Built from a prompt assembled from sections A–F.
3. **Step 2 — Author** ([server/src/agent1/step2-author/](server/src/agent1/step2-author)) — Claude Opus call. Takes the Step 1 output and writes the actual title and story prose. Prompt sections A–J.
4. **Step 3 — Post-Validation** ([server/src/agent1/step3-post-validation/](server/src/agent1/step3-post-validation)) — Claude Sonnet call. Produces an alignment note and any `PostValidationFlag`s for the specialist (must-never, shame-handling, coping-tool, age-appropriateness). Never blocks.

The result is an `Agent1Result` (typed in [server/src/agent1/types/index.ts](server/src/agent1/types/index.ts)) containing every intermediate output plus telemetry (`llmCalls`, `totalLatencyMs`, `exampleBankStatus`). It is stored in the Story document under `agent1Result` and appended to `agent1Versions[]`.

**Pilot scope guard.** The pipeline currently asserts `storyType === "fear_anxiety"` and `typeSpecificField.fieldType === "somatic_expression"`. Other story types throw `UnsupportedStoryTypeError` / `TypeMismatchError`. This is intentional — Agent 1 v1.0 ships Fear & Anxiety only across all four age ranges (3-5, 5-7, 7-9, 9-12).

Few-shot examples for Step 1 (blueprint) and Step 2 (story) are loaded from `server/src/agent1/examples/` keyed by age range. Ages 9–12 use cold-start / cross-bucket retrieval by design.

Only [server/src/agent1/shared/llm-client.ts](server/src/agent1/shared/llm-client.ts) imports the Anthropic SDK — wrap, don't sprinkle.

### 4.3 Review and iteration — the Specialist Workspace

The specialist's home is [client/src/specialist/pages/StoryWorkspacePage.tsx](client/src/specialist/pages/StoryWorkspacePage.tsx) at `/:lang/specialist/stories/:storyId/:tab`. It has three tabs:

- **Brief tab** ([client/src/specialist/components/BriefTab.tsx](client/src/specialist/components/BriefTab.tsx)) — editable while `briefStatus === "draft"`; read-only after submission. A submitted brief is immutable; "Open new revision" creates a new Story with `parentStoryId` pointing back.
- **Draft tab** ([client/src/specialist/components/draftB/DraftTabB.tsx](client/src/specialist/components/draftB/DraftTabB.tsx)) — this is where the specialist actually works once Agent 1 has produced output. It is the "Direction B" editorial-manuscript layout:
  - `ManuscriptEditor` for the prose (plain `<textarea>` with auto-save into `currentDraft`)
  - `EvidenceRail` exposing Agent 1's reasoning: emotional truth, blueprint, coping-tool placement, approach instruction, compression metadata
  - `SafetyPanel` listing `postValidationFlags` (with dismiss-per-flag UX)
  - `ReasoningPanel` and `ToolsPanel`
  - `VersionTimeline` for switching between Agent 1 versions (up to 3: original + 2 reruns, matching the Agent 1 spec cap)
  - `ApproveBar` — request regeneration with feedback, or approve
- **History tab** ([client/src/specialist/components/HistoryTab.tsx](client/src/specialist/components/HistoryTab.tsx)) — chronological event log driven by `Story.editHistory[]` (`EditHistoryEvent` discriminated union).

Regeneration is not a separate code path. It calls Agent 1 again with a `feedback` option (`rerunOf`, `approvedParts`, `feedbackText`, `previousOutput`). Max 2 reruns per story; after that the UI nudges the specialist back to the brief.

The specialist's draft store is **hybrid** ([client/src/specialist/storage/HybridDraftStore.ts](client/src/specialist/storage/HybridDraftStore.ts)):
- `draft_brief` stories live in `localStorage` (key `dammah_stories_v1`).
- Post-submission stories are persisted via the specialist REST endpoints.
- The selector is [client/src/specialist/storage/index.ts](client/src/specialist/storage/index.ts) — **never call `localStorage` from a component**, the test in [client/src/specialist/__tests__/no-direct-localStorage.test.ts](client/src/specialist/__tests__/no-direct-localStorage.test.ts) enforces this.

Specialist REST routes ([server/src/routes/specialist/stories.router.ts](server/src/routes/specialist/stories.router.ts)):

```
GET    /api/specialist/stories
GET    /api/specialist/stories/:storyId
PATCH  /api/specialist/stories/:storyId
PUT    /api/specialist/stories/:storyId/brief
POST   /api/specialist/stories/:storyId/transitions
POST   /api/specialist/stories/:storyId/generate
```

All are gated by `requireAuth` + `requireRole("specialist", "admin")`.

### 4.4 Specialist-side illustration (v2 — shipped)

After manuscript approval, the story moves into the **illustration v2** workspace (`illustration_workspace` → `illustration_ready` → `published`). The pipeline generates a **Visual Bible**, per-page **scene plans**, **final image prompts**, and page illustrations with review/approval. Implementation follows [docs/illustration/spec.md](docs/illustration/spec.md) (orchestrators under [server/src/illustration/](server/src/illustration/), specialist **Illustrations** tab, in-process worker). Caregiver preview/checkout still use the existing `ImageGenerationProvider` paths in [server/src/services/preview.service.ts](server/src/services/preview.service.ts) and [server/src/services/fullStoryGeneration.service.ts](server/src/services/fullStoryGeneration.service.ts).

### 4.5 Publish bridge

When every page illustration is approved and the story is `illustration_ready`, a specialist can **publish** via `POST /api/specialist/stories/:storyId/publish`. The server writes a `story_templates` document (cover, preview spreads, pages, metadata) and sets the story to `published` with `publishedTemplateId`. The public catalog picks it up from Firestore as before.

### 4.6 Publishing (catalog)

Publishing produces a `story_templates` document the public site reads: `slug`, `coverImage`, `previewSpreads`, optional `previewSentence` (auto-filled by [server/src/functions/onStoryTemplateWrite.ts](server/src/functions/onStoryTemplateWrite.ts)), `pages[]`, etc. Type: [server/src/shared/types/storyTemplate.ts](server/src/shared/types/storyTemplate.ts).

---

## 5. Public site (caregivers)

The public site is everything mounted under `/:lang/*` outside `/specialist` and `/admin`. Entry point: [client/src/App.tsx](client/src/App.tsx).

Key pages:
- [HomePage](client/src/pages/HomePage.tsx) — hero, category strip, how-it-works, featured stories, testimonials, final CTA.
- Discovery — `AllBooksPage`, `AgeResultsPage`, `CategoryResultsPage`, `TopicResultsPage`, `SearchPage`. MegaMenu navigation in [client/src/components/MegaMenu/](client/src/components/MegaMenu).
- [StoryDetailPage](client/src/pages/StoryDetail/StoryDetailPage.tsx) — full story detail with preview spreads, pricing, related stories, FAQ.
- [PersonalizeStoryPage](client/src/pages/PersonalizeStoryPage.tsx) — the personalization wizard (child name + gender + photo + visual style).
- [BookReaderPage](client/src/pages/BookReaderPage.tsx) — full-screen book reader (uses `BookCover`, `BookPreface`, `BookSpread` from [client/src/components/book/](client/src/components/book)).
- `FavoritesPage`, `MyStoriesPage`, `LoginPage`, [SuggestStoryPage](client/src/pages/suggest/SuggestStoryPage.tsx).
- Cart is a placeholder route at the moment; the cart **API** is live (see below).

### 5.1 Cart, preview, checkout (caregiver flows)

Caregiver-facing API routes ([server/src/routes/caregiver/](server/src/routes/caregiver)):

```
POST   /api/auth/register-caregiver
GET    /api/caregiver/stories             ← purchased / accessible stories
GET/POST/DELETE /api/caregiver/cart       ← cart items
POST   /api/caregiver/previews/generate   ← multipart upload (child photo)
POST   /api/caregiver/checkout            ← creates a Purchase and triggers full-story generation
GET    /api/caregiver/account
```

All caregiver routes are gated by `requireCaregiverAuth` (custom-claim `role === "caregiver"`).

The personalization-to-purchase flow:
1. Caregiver opens a story's `PersonalizeStoryPage`, picks name + gender + age band + visual style + photo.
2. Client calls `/api/caregiver/previews/generate` (multer-handled multipart). Server runs [generatePreview](server/src/services/preview.service.ts) — produces the first two pages via the registered `ImageGenerationProvider`, stores illustrations + the personalized text.
3. Free-preview quota: **1 free preview per caregiver** (`MAX_PREVIEWS_PER_USER = 1`, enforced in Firestore rules and in [server/src/services/preview.service.ts](server/src/services/preview.service.ts)). Subsequent previews go through the "direct purchase" path.
4. Caregiver adds to cart and checks out. Checkout creates a `Purchase` and calls [generateFullStory](server/src/services/fullStoryGeneration.service.ts), which reuses the preview's first two pages and generates the remaining pages with concurrency limit 3, retrying failed pages once.
5. The child photo is deleted from Storage 24h after generation.

### 5.2 Personalization

Personalization is per-story configurable via the brief's Section 5. When enabled, the published template carries pronoun-aware text variants (masculine/feminine) and `{{CHILD_NAME}}` placeholders. Server-side resolution lives in [server/src/services/personalization.service.ts](server/src/services/personalization.service.ts) — pronoun maps for Hebrew + Arabic, character description for image prompts, placeholder substitution.

---

## 6. Data model (Firestore)

Collections referenced in [firestore.rules](firestore.rules), [server/src/shared/firestore/paths.ts](server/src/shared/firestore/paths.ts), and across the codebase:

| Collection                                 | Purpose                                                |
|--------------------------------------------|--------------------------------------------------------|
| `stories`                                  | Canonical Story documents (specialist workspace)       |
| `dammaStoryBriefs`                         | **Deprecated** — kept for historical data, do not write|
| `story_templates`                          | Published, public-facing story library                 |
| `caregivers/{uid}`                         | Caregiver profile + free-preview quota fields          |
| `caregivers/{uid}/favorites/{storyId}`     | Favorites                                              |
| `caregivers/{uid}/cart/{cartItemId}`       | Cart items                                             |
| `caregivers/{uid}/purchases/{purchaseId}`  | Purchases (Admin-SDK write only)                       |
| `storyPreviews`                            | Per-caregiver preview documents                        |
| `personalizedStories`                      | Generated personalized stories after purchase          |
| `auditTrail`                               | Append-only audit events                               |

Storage paths follow [server/src/shared/firestore/paths.ts](server/src/shared/firestore/paths.ts):
- `child-photos/{caregiverUid}/{previewId}/{filename}`
- `preview-illustrations/{caregiverUid}/{previewId}/page-{n}.{ext}`
- `generated-illustrations/{caregiverUid}/{storyId}/page-{n}.{ext}`
- `template-assets/{templateId}/{filename}`

Story timestamps are stored as **ms-since-epoch numbers**, not Firestore `Timestamp` objects. This keeps the type uniform across `localStorage` and Firestore (see the note at the top of [server/src/models/story.model.ts](server/src/models/story.model.ts)).

---

## 7. Tech stack and conventions

**Client** ([client/](client))
- React 19, MUI 7, Emotion, framer-motion, lucide-react
- react-router-dom 6 with language-prefixed routes (`/he`, `/ar`, `/en`)
- i18n via [client/src/i18n/useTranslation.ts](client/src/i18n/useTranslation.ts) with JSON dictionaries; Hebrew is the fallback for missing Arabic keys
- Firebase JS SDK (`firebase` 12) for client-side reads + Auth
- CRA dev server on `:3000` proxied to the API at `:5001`

**Server** ([server/](server))
- Express 5 on Node 20, mounted at `/api/*`
- `firebase-admin` 13 for Firestore + Storage + Auth verification
- `@anthropic-ai/sdk` for Agent 1 (Opus for Steps 1–2, Sonnet for Step 3)
- `openai` available but Agent 1 currently runs on Claude
- `multer` for child-photo upload (10 MB cap)
- Jest + ts-jest for tests (heavy coverage under `server/src/agent1/__tests__/`)

**Shared** ([packages/story-brief-complexity/](packages/story-brief-complexity))
- Pure-function complexity engine consumed by both client (for the live meter) and server (for the pre-check). Path-aliased as `@dammah/story-brief-complexity`.

**Conventions worth knowing:**
- TypeScript everywhere. Strict mode on.
- Brief tokens come from [server/src/models/storyBrief.model.ts](server/src/models/storyBrief.model.ts); never duplicate them, never branch on display strings.
- Story status transitions are server-enforced; the client suggests, the server decides.
- "Delete" is always soft — sets `status: archived`. UI never hard-deletes.
- A submitted brief is immutable; revisions create a new Story with `parentStoryId`.
- All storage access from the specialist dashboard goes through `DraftStore`; direct `localStorage` calls in components are blocked by a test grep.
- Agent 1 modules never import each other directly — only through [pipeline.ts](server/src/agent1/pipeline.ts).
- Only [server/src/agent1/shared/llm-client.ts](server/src/agent1/shared/llm-client.ts) imports the Anthropic SDK.

---

## 8. Local development

Prereqs:
- Node 20
- A Firebase project + service account JSON at `server/config/serviceAccountKey.json` (or `FIREBASE_SERVICE_ACCOUNT_JSON` env var)
- `server/.env` with `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, and the image provider key (e.g. `ARK_API_KEY` for Seedream) when working on illustration
- Client env (`client/.env.local`) with the `REACT_APP_FIREBASE_*` Web SDK config

Run:

```bash
# API (port 5001)
cd server
npm install
npm run dev

# Client (port 3000, proxies to :5001)
cd client
npm install
npm start
```

Useful server scripts:

```bash
npm run build                  # tsc → dist/
npm run test                   # full Jest suite
npm run test:watch
npm run test:coverage
npm run smoke:agent1           # Agent 1 end-to-end smoke against a sample brief
npm run seed:rag               # seed RAG/example data
npm run seed:reference         # seed reference taxonomies
npm run complexity:parity      # cross-check Section 16 complexity wire parity
```

Role administration (from the repo root):

```bash
npm run set-user-role          # writes Firebase custom claims
npm run get-user-role
```

---

## 9. Pilot status (what's shipped, what's next)

**Shipped in main:**
- Full Specialist Dashboard workspace (Brief / Draft / History tabs) over the `Story` model with the state machine.
- Agent 1 pipeline (pre-check + Architect + Author + Post-Validation) for Fear & Anxiety, ages 3–5 / 5–7 / 7–9 / 9–12.
- Hybrid draft storage (localStorage pre-submission, REST post-submission).
- Public site: discovery, story detail, personalization wizard, book reader, cart API + preview + checkout + full-story generation.
- Template-based per-page illustration generation behind the `ImageGenerationProvider` interface (provider implementation is plugged in via env at deploy time).
- Specialist-side **illustration v2** workspace (Visual Bible, scene plans, per-page image review, publish to `story_templates`) per [docs/illustration/spec.md](docs/illustration/spec.md).
- Bilingual UI (Hebrew default, Arabic, partial English fallback).

**Active development:**
- Post-pilot illustration hardening (e.g. dedicated image safety classifier beyond the `safetyFlags` stub, multi-instance worker, Cloud Tasks migration) as called out in the illustration spec.

**Out of scope for v1** (see [client/src/specialist/docs/07-out-of-scope.md](client/src/specialist/docs/07-out-of-scope.md)):
- Agent 2 (targeted edit loop).
- Story types other than Fear & Anxiety.
- Rich-text editing, collaborative editing, comments, @mentions, diff viewer.
- Bulk actions, notifications.

---

## 10. Where to start when…

| You want to…                                          | Start with                                                                              |
|-------------------------------------------------------|-----------------------------------------------------------------------------------------|
| Understand the brief data model                       | [server/src/models/storyBrief.model.ts](server/src/models/storyBrief.model.ts) + [docs/dammah-story-brief-spec-v1.3.md](docs/dammah-story-brief-spec-v1.3.md) |
| Touch Agent 1 prompts                                 | [server/src/agent1/docs/01-architecture.md](server/src/agent1/docs/01-architecture.md), then the relevant `prompt-sections/` file |
| Add a specialist API endpoint                         | [server/src/routes/specialist/stories.router.ts](server/src/routes/specialist/stories.router.ts) + [server/src/specialist/docs/05-api-surface.md](server/src/specialist/docs/05-api-surface.md) |
| Change the Draft tab UX                               | [client/src/specialist/components/draftB/](client/src/specialist/components/draftB) + [docs/draft-tab-ui-ux-spec.md](docs/draft-tab-ui-ux-spec.md) |
| Wire up a different image generator                   | [server/src/shared/types/aiProvider.ts](server/src/shared/types/aiProvider.ts), then register via `registerImageProvider(...)` at server startup |
| Touch personalization rendering                       | [server/src/services/personalization.service.ts](server/src/services/personalization.service.ts) + [client/src/pages/PersonalizeStoryPage.tsx](client/src/pages/PersonalizeStoryPage.tsx) |
| Adjust the public site catalog or store schema        | [server/src/shared/types/storyTemplate.ts](server/src/shared/types/storyTemplate.ts), [firestore.rules](firestore.rules) |
| Add a Firestore index for a new query                 | [firestore.indexes.json](firestore.indexes.json)                                       |
