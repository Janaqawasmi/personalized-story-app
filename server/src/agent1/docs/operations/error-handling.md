# Error Handling and Operations

**Audience:** Anyone running Agent 1 in production or debugging a failure.
**Scope:** Failure modes, retry policy, cost ceilings, observability.

---

## Failure modes

Agent 1 has a fixed set of things that can go wrong. This section enumerates them, what the user sees, what gets logged, and what the recovery path is.

### F1 — Brief is not loadable

**Trigger:** Firestore read fails, brief document does not exist, or brief document is malformed (fails the `StoryBrief` type check at runtime).

**User-visible:** "We couldn't load your brief. Please try again or contact support."

**Logged:** `level: error`, `code: brief_load_failed`, `briefId`, the underlying Firestore error.

**Recovery:** None automatic. The user retries. If it persists, an engineer investigates the brief document.

### F2 — Brief is not in the right state

**Trigger:** `brief.status !== "submitted"`. Most common case: brief is still `"draft"` because the user didn't actually submit it but a stale URL or button triggered generation.

**User-visible:** "This brief isn't ready to generate yet. Please complete and submit it first."

**Logged:** `level: warn`, `code: brief_not_ready`, `briefId`, `actualStatus`.

**Recovery:** User returns to the brief editor.

### F3 — Brief uses an unsupported story type

**Trigger:** `brief.storyType !== "fear_anxiety"`. This should be impossible in production because the brief UI restricts the picker to Fear & Anxiety in v1.0, but the agent guards against it anyway.

**User-visible:** "This story type isn't supported yet. Only Fear & Anxiety stories can be generated in this version."

**Logged:** `level: error`, `code: unsupported_story_type`, `briefId`, `storyType`.

**Recovery:** None. The user is told the story type isn't supported.

### F4 — Type-specific clinical field mismatch

**Trigger:** `brief.therapeuticArchitecture.typeSpecificField.fieldType !== "somatic_expression"`. Should also be impossible in production for the same reason as F3.

**User-visible:** "This brief has a configuration issue. Please contact support."

**Logged:** `level: error`, `code: type_mismatch`, `briefId`, `actualFieldType`.

**Recovery:** Engineer investigates the brief document.

### F5 — LLM call fails (transient)

**Trigger:** Anthropic SDK returns a 5xx status, a 429 (rate limit), or a network timeout.

**User-visible:** Nothing yet. The wrapper in `shared/llm-client.ts` handles this internally.

**Logged:** `level: warn`, `code: llm_transient_error`, `step`, `attempt`, the underlying SDK error.

**Recovery:** Automatic. One retry with exponential backoff (250ms, then 1s). If both retries fail, escalates to F6.

### F6 — LLM call fails (permanent)

**Trigger:** Both retries from F5 failed, or the SDK returned a non-retryable error (4xx that isn't 429, malformed API key, etc.).

**User-visible:** "Generation failed. Please try again. If this keeps happening, contact support."

**Logged:** `level: error`, `code: llm_permanent_error`, `step`, the full error chain.

**Recovery:** None automatic. The user retries.

### F7 — Step 1 produced incoherent output (parser raised)

**Trigger:** The Story Architect's response could not be parsed into `Step1Output`. Usually this means the model didn't follow the output format — missing the emotional truth pattern, wrong number of blueprint points, etc.

**User-visible:** Nothing on first occurrence. The wrapper retries Step 1 once with the same prompt.

**Logged:** `level: warn` on first occurrence, `code: step1_parse_failed`, `attempt: 1`, the raw response and the parser error.

**On second failure:** `level: error`, `code: step1_incoherent`, `attempt: 2`. User sees: "We couldn't generate a draft this time. Please try again, or revisit your brief if this keeps happening."

**Recovery:** User retries the generation. If it persists across retries, an engineer should look at the raw responses in the logs and probably tweak the prompt template.

### F8 — Step 2 produced output with major word-count drift

**Trigger:** The Author's draft is more than 30% outside the target word range from `STRUCTURAL_PARAMS`.

**User-visible:** The draft is returned to the specialist with `wordCountDrift: "under" | "over"` set in the result. The UI surfaces a soft warning: "This draft is shorter/longer than expected. You can regenerate or work with it as-is."

**Logged:** `level: warn`, `code: step2_word_count_drift`, `actual`, `target_range`, `drift_direction`.

**Recovery:** No automatic retry. The specialist decides whether to regenerate.

**Why no retry:** Word count drift is usually a sign that the brief is overloaded (too many obligations for the chosen length) or underloaded (too little material for a long story). Retrying with the same brief produces the same result. The fix is brief-side, not agent-side.

### F9 — Step 2 missing TITLE marker

**Trigger:** The Author's response does not contain a `TITLE:` line.

**User-visible:** Nothing on first occurrence. The wrapper does **not** retry Step 2. Instead, the parser uses the first non-empty line of the response as the title and the rest as the story.

**Logged:** `level: warn`, `code: step2_missing_title_marker`. Used to monitor whether the prompt needs tightening.

**Recovery:** None. Specialist sees the result and can rename the story.

### F10 — Step 3 (post-validation) failed entirely

**Trigger:** Sonnet returned an error, or the response could not be parsed.

**User-visible:** The story is still returned to the specialist. The UI shows: "Validation didn't run for this draft. The draft is here for you to review."

**Logged:** `level: warn`, `code: post_validation_failed`, the underlying error.

**Recovery:** None automatic. Post-validation is courtesy. Its failure does not block the specialist.

### F11 — Few-shot example file is corrupted

**Trigger:** A JSON file in `examples/{ageRange}/` fails to parse at process start.

**User-visible:** Nothing immediate. The retriever returns an empty array for that age range, and the agent falls back to cold-start.

**Logged:** `level: error` at process start, `code: example_corrupted`, the file path and parser error.

**Recovery:** Engineer fixes the file. Until then, that age range runs on cold-start instructions.

### F12 — Cost ceiling exceeded

**Trigger:** The cumulative cost of LLM calls for a single generation event (including reruns) exceeds the configured ceiling. Default ceiling: $5 per generation event including all reruns.

**User-visible:** "This generation has used the maximum budget. Please contact your team admin if you need more reruns."

**Logged:** `level: error`, `code: cost_ceiling_exceeded`, `briefId`, `accumulatedCost`, `rerunCount`.

**Recovery:** Admin override or wait for the per-day budget to reset.

---

## Retry policy

| Step | Retries on transient LLM error | Retries on parse failure | Retries on word count drift |
|---|---|---|---|
| Pre-check | n/a (no LLM) | n/a | n/a |
| Step 1 (Story Architect) | 1 (in `llm-client.ts`) | 1 (in `step1-architect/index.ts`) | n/a |
| Step 2 (Author) | 1 (in `llm-client.ts`) | 0 (parser is permissive) | 0 (flag and proceed) |
| Step 3 (Post-Validation) | 1 (in `llm-client.ts`) | 0 (soft fail) | n/a |

**Maximum LLM calls per generation event** (including transient retries but not user-triggered reruns):

- Best case: 3 calls (one per step, no retries).
- Worst case: 8 calls (Step 1 transient retry + Step 1 parse retry + transient retry of the retry, Step 2 transient retry, Step 3 transient retry). In practice never seen because transient retries rarely chain.

**With user-triggered reruns** (max 2 reruns = 3 generations):

- Best case: 9 calls.
- Worst case: 24 calls. The cost ceiling exists to make this not happen in production.

---

## Cost ceilings

Agent 1 enforces three ceilings. All are configurable via environment variables; defaults shown.

| Ceiling | Default | What happens when hit |
|---|---|---|
| **Per-generation cost** (single Generate Draft click) | $2.00 | Hard stop. F12 error. |
| **Per-generation-event cost** (single click + up to 2 reruns) | $5.00 | Hard stop on the next call after the threshold is crossed. F12 error. |
| **Per-day total cost** | $200.00 | Hard stop on all new generations. Admin notified. Existing generations in flight finish. |

These ceilings are enforced in `shared/llm-client.ts` by tracking cumulative cost in a small in-memory counter (and a Firestore document for the per-day total so it survives restarts). The numbers are placeholders — calibrate against actual Opus/Sonnet pricing once production traffic establishes a baseline.

The per-day ceiling is a kill switch, not a budget plan. If you hit it regularly, the team needs to discuss either raising it or reducing rerun rates.

---

## Observability

Agent 1 logs to two channels:

### Structured logs (`logs/agent1.jsonl`)

Every event is one JSON line. Schema:

```json
{
  "timestamp": "2026-04-09T14:23:45.123Z",
  "level": "info | warn | error",
  "code": "string identifier — see failure modes above",
  "briefId": "...",
  "generationId": "...",
  "step": "pre_check | step1 | step2 | step3 | pipeline",
  "attempt": 1,
  "rerunCount": 0,
  "data": { /* context-specific */ }
}
```

Retention: 30 days local, indefinite in cold storage.

### LLM call audit log (`logs/agent1-calls.jsonl`)

Every LLM call is recorded for replay-ability. Schema:

```json
{
  "timestamp": "2026-04-09T14:23:45.123Z",
  "generationId": "...",
  "step": "step1 | step2 | step3",
  "attempt": 1,
  "model": "...",
  "promptHash": "sha256...",
  "promptLength": 4823,
  "responseLength": 612,
  "inputTokens": 4823,
  "outputTokens": 612,
  "latencyMs": 12483,
  "costUsd": 0.18
}
```

The full prompt and response are **not** logged here (PII risk and storage). The prompt hash plus the deterministic prompt builder lets you reconstruct the prompt from the brief if needed.

Retention: 7 days local for the full file; aggregated daily summaries kept indefinitely.

### Metrics to watch

These do not exist as a dashboard in v1.0 but the data is in the logs. Build the dashboard once you have a week of production traffic.

| Metric | Healthy range | Alert threshold |
|---|---|---|
| Generation success rate (no F-class error) | >95% | <90% |
| Step 1 parse failure rate | <2% | >5% |
| Step 2 word count drift rate | <10% | >25% |
| Post-validation failure rate (F10) | <1% | >5% |
| Average cost per generation | <$1.00 | >$1.50 |
| Average latency per generation | <40s | >60s |
| Rerun rate (% of generations that lead to a rerun) | <30% | >50% |
| Specialist override rate (publishing with active flags) | <20% | >40% |

---

## When to escalate

| Symptom | Action |
|---|---|
| Single user reports a failure | Look at the logs for that briefId. If isolated, retry. |
| Multiple users hit F6 (LLM permanent) in the same hour | Check Anthropic status page. Possibly downgrade to a fallback model. |
| Step 1 parse failure rate spikes | Look at recent prompt changes. Likely a section file changed and broke output formatting. |
| Cost ceiling alerts firing for many users | Either prompts grew, or rerun rates jumped. Investigate. |
| Word count drift on most generations | Brief complexity is exceeding length budgets. Talk to the clinical team about the brief UI's complexity meter calibration. |
| Token discipline test fails in CI | Don't merge. The branch has a token that doesn't exist in the model file. Fix the token or update the model file. |

---

## Recovery runbook

### A user says "my generation failed"

1. Get the `briefId` and the approximate timestamp.
2. Search `logs/agent1.jsonl` for events matching `briefId` and the time window.
3. Find the most recent `level: error`. Read the `code` field.
4. Look up the code in this document. The "Recovery" line tells you what to do.

### A user says "the story doesn't make sense"

This is not a failure mode. Agent 1 produced output and post-validation didn't flag it. The recourse is the rerun mechanism, then the brief editor. If "doesn't make sense" is a recurring complaint with a specific shape (always cliché endings, always too short, always lectures), tune the prompt template and ship a new version.

### A new code path is added that needs error handling

1. Pick an F-number (continue from F12).
2. Document it here: trigger, user-visible message, log shape, recovery.
3. Add it to the structured logger code.
4. Add a unit test that asserts the failure mode triggers correctly.
