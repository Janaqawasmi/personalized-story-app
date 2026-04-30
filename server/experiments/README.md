# Image Generation Experiments

Standalone harness for the image-gen-experiments branch. Reads a real story from Firestore, runs a chosen pipeline variant on a subset of pages, and dumps images + prompts + a markdown report to `results/<exp-id>/`. **Does not write to Firestore.**

## Methodology

- **Test set.** Phase 1: 1 real story, 3 selected pages. Scale to 2–3 stories later.
- **Real story input** (must be `approved` or later, with `pages` populated). Story-brief-to-story is a separate test surface.
- **One variable per experiment.** Don't bundle "new model + new prompt" into one run.
- **Score with a 1–5 rubric** across 5 dimensions — see [`rubric.md`](rubric.md).
- **Cheap before expensive.** Prompt-only variants before model swaps before architecture changes.

## How to run

```bash
# 1. List candidate stories so you can pick the canonical test story
npm run -w server experiment:list

# 2. Run a variant on chosen pages
npm run -w server experiment:run -- \
  --variant baseline \
  --story <storyId> \
  --pages 1,4,7 \
  --out exp-00-baseline
```

Outputs land in `server/experiments/results/<--out>/`.

## Folder layout

```
server/experiments/
  README.md            ← this file
  rubric.md            ← 1–5 scoring criteria
  report-template.md   ← per-experiment report template
  test-set.json        ← canonical {storyId, pages} once chosen
  src/
    cli.ts             ← entrypoint
    runner.ts          ← orchestrator (load story, dispatch variant, write report)
    types.ts           ← Variant + RunResult contracts
    helpers.ts         ← shared utilities (save image, write report)
    list-stories.ts    ← helper to pick a story
    variants/
      baseline.ts      ← mirrors current pipeline (Claude prompts → Seedream)
      index.ts         ← variant registry
  results/             ← gitignored; one folder per experiment run
```

## Backlog

See the project memory file or [project_image_gen_experiments.md](../../C--Users-jana-Desktop-fourth-year-final-project-personalized-story-app/memory/project_image_gen_experiments.md). Current order:

1. `exp-00-baseline` — current pipeline
2. `exp-01-prompts` — prompt template variants (one tweak per run)
3. `exp-02-story-context` — full story vs summary
4. `exp-03-no-reference` — drop image-to-image
5. `exp-04-gpt-prompts` — Claude → GPT for prompts
6. `exp-05-nano-banana` — Seedream → Gemini 2.5 Flash Image (blocked: needs API key)
7. `exp-06-avatars` — per-character avatars as references
