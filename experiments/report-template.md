# Experiment {{ID}} — {{TITLE}}

**Date:** {{YYYY-MM-DD}}
**Branch:** image-gen-experiments
**Variant:** `{{variant-id}}`
**Compared against:** `{{baseline-or-prev-experiment-id}}`

## Hypothesis

What single variable did this experiment change? What did you expect to see?

## Setup

| Field | Value |
|---|---|
| Story ID | `{{storyId}}` |
| Pages tested | `{{1, 4, 7}}` |
| Prompt model | `{{claude-haiku-4-5-20251001}}` |
| Image model | `{{seedream-4-0-250828}}` |
| Reference strategy | `{{page1 / none / avatar}}` |
| Seed | `{{12345}}` |
| Guidance scale | `{{7.5}}` |
| Other params | |

## Results

For each page, embed the rendered image and score it against the [rubric](../rubric.md).

### Page 1
![page 1]({{relative-path-to-image}})

| Dimension | Score (1–5) | Note |
|---|---|---|
| Character consistency | | |
| Scene clarity | | |
| Emotional expression | | |
| Age-appropriateness | | |
| Art quality | | |
| **Total** | **/25** | |

### Page 4
![page 4]({{relative-path-to-image}})

| Dimension | Score (1–5) | Note |
|---|---|---|
| Character consistency | | |
| Scene clarity | | |
| Emotional expression | | |
| Age-appropriateness | | |
| Art quality | | |
| **Total** | **/25** | |

### Page 7
![page 7]({{relative-path-to-image}})

| Dimension | Score (1–5) | Note |
|---|---|---|
| Character consistency | | |
| Scene clarity | | |
| Emotional expression | | |
| Age-appropriateness | | |
| Art quality | | |
| **Total** | **/25** | |

## Aggregate

| Metric | Value |
|---|---|
| Average per-page total (out of 25) | |
| Δ vs baseline (out of 25) | |

## Observations

- Concrete things that improved or regressed.
- Surprises.
- Failure modes (extra fingers, character drift, scene mismatch, etc.).

## Decision

- ✅ **Adopt** — fold this change into the next baseline.
- 🔁 **Iterate** — promising but not ready; spawn follow-up experiment with note.
- ❌ **Reject** — no improvement or regression.

## Next experiment

What's the next single variable to change?
