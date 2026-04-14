# Step 3 — Post-Validation Prompt

**Audience:** Anyone touching `step3-post-validation/`.
**Model:** Claude Sonnet (latest available — Sonnet, not Opus, because the task is bounded checking, not creative writing).
**Output target:** `PostValidationResult` from `02-data-contracts.md`.

---

## What this prompt does

Two jobs:

1. **Constraint check.** Look for likely violations of the must-never list, the shame rules, the coping-tool-must-appear-at-the-peak rule, and age appropriateness.
2. **Alignment note.** Write a 2–3 sentence clinical read of what the story actually achieves — what mechanism is embodied, where the coping tool appears, what the emotional arc lands on.

Post-validation **never blocks**. Every flag is surfaced to the specialist with a passage and a reason. The specialist decides whether to act on it.

---

## What post-validation does *not* check

- **Whether the story lectures the child.** That is "the one rule" from the Author prompt. Whether a story lectures is a quality judgment on a spectrum, made exclusively by the licensed psychologist. Trying to automate this check produces noise that erodes trust in the flag system.
- **Prose quality.** Flow, voice, word choice, sentence rhythm — not the validator's job.
- **Whether the blueprint was a good plan.** That's reviewed by the specialist on the Step 1 outputs panel.
- **Word count.** Already computed by the Step 2 output parser and surfaced separately.

The constraint check is intentionally narrow. Four checks. No more.

---

## Prompt structure

One file: `step3-post-validation/prompt-builder.ts`. The prompt is short enough to live in a single template — no section files.

```
You are a clinical safety reviewer for therapeutic children's
stories. You have two jobs: check hard constraints, and write a
short alignment note.

You are NOT judging the story's quality. You are NOT judging whether
the story lectures the child or has good prose. You check specific
rules and provide a clinical read.

THE STORY:
{step2Output.title}

{step2Output.story}

===== PART 1: CONSTRAINT CHECK =====

1. MUST-NEVER LIST:
The psychologist provided these constraints. Each is absolute.
{for each item in mustNeverList with index i: {i+1}. {item}}

For each item, check whether the story may violate it.
If you find a likely violation: quote the passage (15 words maximum),
name which constraint was violated by index, and explain in one
sentence why.

2. SHAME HANDLING:
Shame dimension: {therapeuticArchitecture.shameDimension}

{if shameDimension === "central":
  Three rules to check:
  (1) Does the story demonstrate the child is not alone in this
      feeling? (At least one other character shares or has shared
      the experience.)
  (2) Does the story avoid implying the child should have known
      better, done better, or felt differently?
  (3) Does at least one character witness the protagonist's
      difficulty and respond with acceptance, not correction?
  Flag any rule that is not met.}

{if shameDimension === "present":
  Is the protagonist observed in their shame by other characters?
  Shame should be internal, not performed. Flag if the protagonist
  is publicly shamed.}

{if shameDimension === "not_significant":
  No shame check needed. Skip this section.}

3. COPING TOOL:
The coping tool is: {therapeuticArchitecture.copingTool}
The story architect specified its placement: {step1Output.copingToolPlacement}

Check: Does the coping tool appear in the story? Is it shown in
action at the emotional peak, or is it explained / suggested by
another character / named without being demonstrated? Flag the
latter cases.

4. AGE APPROPRIATENESS:
Age range: {ageAndScope.ageRange}
Peak intensity: {ageAndScope.peakIntensity}

Does any scene exceed the specified intensity for this age? In
particular: scenes that would be "significant" intensity in a
"very_gentle" or "moderate" brief, or scenes that would be
"moderate" or higher in a 3–5 brief.

OUTPUT FOR PART 1:
Either output the literal word "PASS" on its own line, or output
one or more flags using exactly this format:

FLAG
check_type: <must_never | shame_handling | coping_tool | age_appropriateness>
constraint_id_or_index: <for must_never: the 1-based index from the
  list above; for shame_handling: 1, 2, or 3 corresponding to the
  three rules; for coping_tool: "placement" or "demonstration"; for
  age_appropriateness: "intensity">
passage: <quoted from the story, 15 words maximum>
reasoning: <one sentence>
severity: <likely_violation | borderline_specialist_review>
END_FLAG

Use "borderline_specialist_review" when you can see why a clinical
reviewer might question the passage but you are not certain it
violates the constraint. Default to flagging only when you would
genuinely raise it as a reviewer.

===== PART 2: ALIGNMENT NOTE =====

In 2–3 sentences, describe what you actually see in this story:
- Which therapeutic mechanism is embodied (in your words, not by
  naming the approach)
- Where the coping tool appears and how it manifests
- What the emotional arc achieves

The story architect's approach instruction was:
"{step1Output.approachInstruction}"

The expected resolution signature is:
{getResolutionSignature(resolutionCompleteness)}

Describe what you see in the story, not what should be there. If the
story diverges from the approach instruction or the resolution
signature, say so plainly.

OUTPUT FOR PART 2:
ALIGNMENT_NOTE
<your 2–3 sentence alignment note>
END_ALIGNMENT_NOTE
```

---

## Output parsing

The parser is a small state machine that extracts:

1. **`PASS`** as the literal word on a line of its own — sets `result: "PASS"`.
2. **One or more `FLAG` blocks** between `FLAG` and `END_FLAG` markers — each becomes one `PostValidationFlag`.
3. **One `ALIGNMENT_NOTE` block** between `ALIGNMENT_NOTE` and `END_ALIGNMENT_NOTE` markers — becomes `alignmentNote`.

Implementation lives in `step3-post-validation/output-parser.ts`.

**Permissive about:**

- Whitespace before/after markers
- Order of sections (PASS or FLAG can come before or after the alignment note)
- Quote characters around the passage (single or double)

**Strict about:**

- The presence of an alignment note. If missing, the post-validation result is treated as a soft failure: `result: "PASS", flags: [], alignmentNote: "(post-validation produced no alignment note)"`. The story still ships to the specialist. A system warning is logged.
- The presence of either `PASS` or at least one `FLAG`. If neither, same soft failure.

Soft failures never block the specialist from seeing the draft. Post-validation is a courtesy layer; its failure is an operational issue, not a clinical one.

---

## Why Sonnet, not Opus

Three reasons:

1. **The task is bounded.** Four checks plus a 2–3 sentence note. Sonnet handles bounded structured tasks reliably and faster.
2. **Cost.** Post-validation runs on every generation including reruns. At 3 calls per generation × Opus rates, this stage would be expensive for the lowest-value step.
3. **Latency.** The specialist is waiting. Sonnet shaves 5–15 seconds off the total wait.

If empirical evidence shows Sonnet missing genuine violations the clinical team would catch, the model can be upgraded. The flag system is forgiving by design — the cost of a missed flag is one specialist correction; the cost of every false positive is erosion of trust in the entire flag system.

---

## Calibration

The flag system is monitored. Track:

- **Dismissal rate**: how often the specialist marks a flag as "not actually a problem."
- **Override rate**: how often the specialist publishes a story with active flags.
- **False negative rate**: how often a story with no post-validation flags is rejected by the specialist for a constraint violation that was in the must-never list.

If dismissal rate exceeds 70%, the validator is too noisy. Tighten the prompt or downgrade some checks to "borderline" only. If false negatives exceed 5%, the validator is too lenient. Loosen the bar or add a check.

These metrics live in the analytics layer (out of scope for v1.0 build but the data shape supports them — every flag is logged with its disposition).

---

## How to add a check

Adding a fifth check is a substantial change. Follow this order:

1. **Justify it clinically.** A new check should correspond to a real failure mode the clinical team has seen. Anecdote is enough; a single example story with the problem is even better.
2. **Add it to the prompt template** in a new numbered block (5, 6, ...).
3. **Add it to the output parser's `checkType` enum** in `02-data-contracts.md`.
4. **Add a unit test** with a fixture story that should produce the flag and a fixture that should not.
5. **Run the calibration checks above** for a week before declaring it stable.

Removing a check is the same workflow in reverse.
