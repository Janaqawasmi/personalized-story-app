# Image Generation Experiments (research record)

> **Status: historical.** This directory holds the research that informed the
> v2 illustration architecture. The conclusions live in
> [`docs/illustration/spec.md`](../docs/illustration/spec.md). The harness here
> is **not currently runnable** — several variants depended on the v1
> production pipeline (`server/src/specialist/image-prompt-generator.ts`,
> `prompt-builder.ts`) which was removed when v2 was adopted. The runner and
> shared types also reference `VisualBible` / `PageIllustration` types that have
> been deleted from the canonical story model.
>
> Why keep it: the locked artefacts (`locked-style-bibles/`,
> `locked-visual-bibles/`), the test set, the rubric, and the report template
> are the concrete inputs and scoring criteria behind the v2 design decisions.
> Future v2 work that wants a controlled-experiment harness should resurrect
> the runner (with v2 types) rather than starting from zero.

---

## Original methodology

- **Test set.** Phase 1: 1 real story, 3 selected pages. Scale to 2–3 stories later.
- **Real story input** (must be `approved` or later, with `pages` populated). Story-brief-to-story is a separate test surface.
- **One variable per experiment.** Don't bundle "new model + new prompt" into one run.
- **Score with a 1–5 rubric** across 5 dimensions — see [`rubric.md`](rubric.md).
- **Cheap before expensive.** Prompt-only variants before model swaps before architecture changes.

## Folder layout

```
experiments/
  README.md            ← this file
  rubric.md            ← 1–5 scoring criteria
  report-template.md   ← per-experiment report template
  test-set.json        ← canonical {storyId, pages}
  locked-style-bibles/ ← reference StyleBible artefacts used as locked inputs
  locked-visual-bibles/← reference VisualBible artefacts (v1 shape — deprecated)
  src/
    cli.ts             ← entrypoint (historical)
    runner.ts          ← orchestrator (historical — references deleted types)
    types.ts           ← Variant + RunResult contracts (historical)
    helpers.ts         ← shared utilities (save image, write report)
    list-stories.ts    ← helper to pick a story
    print-pages.ts     ← helper to print story pages
    generate-style-bible.ts
    style-bible.types.ts
    style-bible.assembler.ts
    style-bible.generator.ts
    scene-director.ts
    avatar-generator.ts
    bootstrap.ts
    variants/
      style-bible.ts, style-bible-sonnet.ts
      avatar-only.ts, environment-only.ts, avatar-environment.ts
      scene-director.ts, scene-director-avatar.ts, scene-director-avatar-only.ts
      index.ts         ← variant registry
```

## Variant history (which strategies were tested)

The variants explored character/environment consistency across pages, with and
without reference images, and at progressively richer levels of textual scene
direction. The trail that won — verbose, structured text-only scene direction
backed by a once-per-story Visual Bible — is now the v2 architecture in the
spec.

Deleted variants (depended on the v1 production pipeline):

- `baseline`            — mirrored the v1 image-prompt-generator + prompt-builder
- `no-reference`        — v1 prompts without reference images
- `rolling-reference`   — v1 prompts with rolling per-page reference
- `prompt-engineering`  — v1 prompts with engineered system messages

Surviving variants (research-only — still reference some deleted types in
shared modules, so they will not compile against current `server/src/`):

- `style-bible*`        — Visual Bible / Style Bible scaffolding before scene direction
- `avatar-only`         — character reference image only
- `environment-only`    — environment reference image only
- `avatar-environment`  — both reference images
- `scene-director*`     — two-stage director (Visual Director → Scene Planner)

## Re-running the harness (Phase 1+ work)

To run experiments against the v2 architecture, the harness needs:

1. New local types for `VisualBibleArtefact`, `ScenePlanArtefact`, `FinalPromptArtefact` (see spec §3).
2. Variants updated to call the production v2 stages (Visual Director, Scene Planner, Prompt Engineer) rather than the deleted v1 modules.
3. A new locked-artefact format under `locked-visual-bibles/` matching the v2 `VisualBibleArtefact` shape (the existing files are v1 shape).
4. A standalone `experiments/tsconfig.json` and `package.json` so the harness compiles independently of `server/`.
