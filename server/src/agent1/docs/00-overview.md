# 00 — Agent 1 System Overview

**Audience:** Anyone working on Agent 1 — read this first, always.
**Length:** ~10 minutes.
**Status:** Authoritative for v1.0.

---

## What Agent 1 is

Agent 1 is a deterministic pipeline wrapped around two LLM calls. Its job is to turn one structured artifact (the story brief) into one creative artifact (a first story draft) that a licensed child psychologist can then approve, edit, or regenerate.

It is not a chatbot. It runs once per "Generate Draft" click, produces a complete output, and stops. There is no streaming UX, no multi-turn conversation, no agentic loop. The specialist reviews the output and either approves it or triggers a feedback rerun.

---

## The pipeline

```
PRE-CHECK (rule-based, no LLM)
  1. Brief quality gate on creative fields
  2. Vague-intention detection
  3. Complexity budget calculation
       ↓
       If issues: specialist sees feedback + "Enrich brief" / "Generate anyway"

STEP 1 — Story Architect (Claude Opus)
  Input:  Full story brief + therapeutic approach agent instructions
          + narrative obligation tiers + complexity status
          + acknowledged warnings + 2 few-shot blueprint examples
  Output: Emotional truth paragraph
          Narrative blueprint (6 points)
          Coping tool placement note
          Approach instruction
          Inferred intention flag (conditional)
          Compression metadata (conditional)
          Character notes contradictions (conditional)
       ↓
STEP 2 — Author (Claude Opus)
  Input:  Step 1 outputs + selected brief fields (incl. verbatim
          source-detail blocks for Field 2.1 and Field 2.2)
          + obligation tiers + 1 few-shot story example
  Output: Title + full story draft
       ↓
POST-VALIDATION (Claude Sonnet)
  Input:  Story draft + hard constraints + structural parameters
  Output: PASS or structured per-flag objects
          + alignment note (2–3 sentences, clinical read)
       ↓
SPECIALIST RECEIVES:
  Emotional truth paragraph
  Blueprint + coping tool placement note + approach instruction
  Inferred intention flag (if any)
  Compression metadata (if any)
  Character notes contradictions (if any)
  Story title + full draft
  Alignment note
  Safety flags (if any)
```

A complete generation event is **3 LLM calls**. With reruns, the maximum is **9 calls** (3 generations × 3 calls), but the typical case is 3.

---

## The one rule

**The therapeutic message must be felt, never stated.**

Never lecture the child. Never explain the lesson. Never have a character say what the child should learn. The message lives in what happens — not in what anyone says about what happens.

This rule is the entire reason Agent 1 has a Story Architect step that is separate from the Author step. The Story Architect handles all the clinical reasoning and translates clinical language into narrative language. The Author never sees the clinical labels (like "Cognitive reframing" or "Graduated exposure") and never sees the brief's therapeutic intention as a destination string. The Author only writes from the blueprint. This separation is what stops the model from compliance-mode prose where every clinical box gets a sentence.

The post-validation step does **not** check whether the story lectures. That is a quality judgment on a spectrum, made exclusively by the specialist.

---

## Key design decisions

These are the calls that shape every line of code in Agent 1. If you want to change one of these, you are changing the architecture, not refactoring it.

### D1 — Two-step chain, not four, not one

**Why not four steps:** A four-step chain (Read → Plan → Safety Check → Write) creates an information bottleneck at the planning step and silently loses clinical specificity. A standalone safety filter would also check the abstract blueprint instead of the concrete prose, which is structurally wrong.

**Why not one prompt:** A single mega-prompt produces compliance mode. The model checks every clinical box and the prose comes out flat. There is also no specialist checkpoint, no place to inject feedback, and no way to debug which stage went wrong.

**Why two:** The meaningful cognitive boundary is between *understanding plus planning* and *writing*. Step 1 reads the brief, resolves conflicts, plans the arc, and outputs a clean blueprint plus a plain-language approach instruction. Step 2 writes from that blueprint with no clinical noise.

### D2 — No standalone safety filter

Safety checking lives in two places: embedded in Step 1's instructions (the "before finalizing" check), and in the post-validation pass on the finished story. There is no separate safety stage.

### D3 — Post-validation flags, never blocks

The specialist is a licensed psychologist. Post-validation is a second pair of eyes, not a gatekeeper. Every flag is surfaced with a passage, a reason, and a severity. The story is always returned to the specialist regardless of flags.

### D4 — Therapeutic approach labels are withheld from the Author

The Author never sees `"cognitive_reframing"` or `"graduated_exposure"`. It sees an `approach_instruction` field (2–4 sentences, plain language) that describes how the approach manifests as narrative action in this specific story. This prevents clinical contamination of the prose.

### D5 — Creative vision is a seed, not a template, with mechanism precedence

The clinical creative vision (brief Field 2.4) is the seed the story grows from. When it conflicts with the therapeutic mechanism (brief Field 3.1), the mechanism wins and the vision is adapted to serve it. Example: vision says "a safe hiding place"; mechanism is graduated exposure → the hiding place becomes the *starting point* the protagonist ventures out from, not the resolution.

### D6 — Verbatim source-detail blocks

The Author receives **four** verbatim text blocks from the brief, not summaries:

1. Field 2.1 — Emotional World of the Population (source for the protagonist's inner voice)
2. Field 2.2 — The Specific Trigger (source for the trigger scene)
3. Field 2.4 — Clinical Creative Vision (the image at the center)
4. Field 2.5 — One True Thing (when present)

The blueprint is a planning artifact and compresses these. The Author also gets the raw text so the sensory and emotional texture is preserved.

### D7 — Token-based branch logic, never display strings

Every conditional in every prompt template compares against snake_case token values from `server/src/models/storyBrief.model.ts`. Display strings are for UI only. CI fails if a branch references a token that doesn't exist in the model file. See `types/model-file-reference.md` for the full token list and the integration test.

### D8 — Narrative obligation tiers govern compression

When a brief's obligations exceed the available word/page budget, both the Story Architect and the Author follow the brief's 4-tier priority system (brief Section 15). Tier 1 elements must always appear as fully realized scenes. Lower tiers are compressed or omitted as needed. Compression decisions are transparent — the specialist sees what was compressed and why in the compression metadata output.

### D9 — Pre-check is the second sanity layer, not the first

The brief UI runs cross-field validations and quality nudges before submission. Agent 1's pre-check is a second, agent-side layer that runs after the brief UI has had its chance to fire. It is intentionally stricter on some checks (e.g., the therapeutic intention character threshold) because it protects the agent's ability to plan a story, not the psychologist's drafting flow.

### D10 — Acknowledged warnings are passed to Step 1 as design choices

When the brief UI showed a hard warning that the psychologist acknowledged (e.g., Significant intensity for ages 3–5), the validation ID lands in `storyBrief.acknowledgedWarnings`. Step 1 looks each ID up in `CROSS_FIELD_VALIDATIONS` and treats the configuration as intentional. The post-validation alignment note may comment on how the story navigates the trade-off. Per priority rule 1, validated combinations override approach defaults.

### D11 — First supporting character's functional role is Tier 2, not Tier 3

Brief Field 4.6 calls supporting character functional roles "high-priority instruction for the climactic scene." Tier 3 (compressible to a single beat) is too low for that. The first character's functional role is Tier 2 (must appear, can be compressed in length but not in substance). The second character's functional role stays Tier 4.

### D12 — Pacing is encoded in blueprint density, not templates

There is no beat sheet in the Author prompt. The Story Architect writes blueprint points with density proportional to narrative weight — the climax point is longer and more specific than the opening point. The Author reads density as a pacing signal and writes the central scenes longer than the framing scenes.

---

## Specialist review interface (data contract only)

Agent 1 returns this object to whatever UI is consuming it. The React component that renders it is built separately against this contract.

```typescript
interface Agent1Result {
  // From Step 1
  emotionalTruth: string;
  blueprint: BlueprintPoint[];        // 6 points
  copingToolPlacement: string;
  approachInstruction: string;

  // Conditional from Step 1
  inferredIntention?: InferredIntention;
  compressionMetadata?: CompressionMetadata;
  characterNotesContradictions?: ContradictionFlag[];

  // From Step 2
  title: string;
  story: string;

  // From Post-Validation
  alignmentNote: string;
  postValidationFlags: PostValidationFlag[];  // empty array if PASS

  // System
  generationId: string;
  rerunCount: number;
  totalLatencyMs: number;
  llmCalls: LLMCallRecord[];
}
```

Full type definitions live in `02-data-contracts.md`.

---

## What you need to know before reading anything else

1. **The brief is `StoryBrief` from `server/src/models/storyBrief.model.ts`.** Every field on that interface is real and typed. Agent 1 never accepts a partial brief — only `status === "submitted"` briefs enter the pipeline.
2. **There are constants in the model file Agent 1 must import, not duplicate.** `STRUCTURAL_PARAMS`, `OBLIGATION_WEIGHTS`, `AGE_WEIGHT_MULTIPLIERS`, `CROSS_FIELD_VALIDATIONS`, `STORY_TYPE_ROUTING`, `FIELD_REGISTRY`. Re-defining any of these in Agent 1 code is a defect.
3. **The pilot is Fear & Anxiety only.** The model file types `TherapeuticApproach` as `FearAnxietyApproach` for now. The discriminated union `TypeSpecificClinicalField` will have non-pilot variants present in the type system that Agent 1 must guard against (`if typeSpecificField.fieldType !== "somatic_expression": throw`).
4. **Few-shot examples cover ages 3–5, 5–7, and 7–9 at launch.** For 9–12 stories, Step 1 falls through to a quality-standard cold-start fallback. The specialist UI must show a notice. See `testing/test-strategy.md` for the example bank seed plan.

Now go read `01-architecture.md`.
