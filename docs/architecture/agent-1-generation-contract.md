# Agent 1: Generation Contract Builder

## Overview

Agent 1, the **Generation Contract Builder**, is the foundational safety and validation layer in the DAMMAH multi-agent architecture. It operates as the first critical checkpoint in the story generation pipeline, transforming human-specified therapeutic intentions into machine-executable generation contracts that enforce clinical safety rules, age-appropriate constraints, and therapeutic integrity.

The agent serves as a deterministic translation layer between the specialist's domain knowledge (expressed through Story Briefs) and the generative AI system's operational parameters. It ensures that every story generation request is validated, constrained, and traceable before any AI model is invoked.

## Purpose

Agent 1 exists to:

1. **Enforce Clinical Safety**: Apply evidence-based clinical rules that prevent harmful content generation and ensure age-appropriate therapeutic interventions.

2. **Validate Therapeutic Intent**: Verify that specialist-provided inputs align with approved reference data and therapeutic frameworks.

3. **Create Executable Contracts**: Transform validated inputs into structured contracts that downstream agents can execute without ambiguity.

4. **Enable Traceability**: Maintain immutable records of which rules were applied, which versions were used, and which overrides were exercised.

5. **Support Human Oversight**: Provide specialists with transparent, reviewable contracts that can be modified before finalization.

## Responsibilities

### Core Functions

1. **Input Validation**
   - Validate all required fields in Story Brief inputs
   - Verify reference data integrity (topics, situations, goals, exclusions)
   - Enforce type constraints and business rules
   - Detect and report data inconsistencies

2. **Clinical Rules Application**
   - Load and apply versioned clinical rules from Firestore
   - Map therapeutic goals to required story elements
   - Apply age-band-specific constraints (word limits, scene counts, sentence complexity)
   - Enforce emotional sensitivity rules
   - Apply ending style requirements

3. **Contract Construction**
   - Build complete Generation Contract objects
   - Calculate length budgets based on age groups
   - Determine allowed coping tools based on age and goals
   - Compile required elements and avoidance patterns
   - Generate style rules (sentence length, dialogue policy, abstract concepts)

4. **Override Management**
   - Accept and validate specialist overrides (e.g., coping tool selection)
   - Preserve override metadata (reason, timestamp, tool ID)
   - Ensure overrides comply with age-band constraints
   - Maintain override history in contract metadata

5. **Persistence and Traceability**
   - Save contracts to Firestore with version metadata
   - Record rules version used for each contract
   - Maintain timestamps for audit trails
   - Support contract retrieval and regeneration

### Safety Guarantees

- **No Invalid Contracts**: Agent 1 will not produce a contract with critical errors. Contracts with errors are marked as invalid and blocked from downstream processing.

- **Version Consistency**: All contracts reference specific clinical rules versions, enabling reproducibility and rollback capabilities.

- **Override Validation**: All specialist overrides are validated against clinical rules before acceptance.

- **Immutable Audit Trail**: Contract creation, modification, and override events are permanently recorded with timestamps.

## Non-Responsibilities

Agent 1 explicitly does **not**:

1. **Generate Story Content**: Agent 1 does not invoke any language models or produce narrative text. It only creates contracts that specify *how* stories should be generated.

2. **Execute Contracts**: Agent 1 does not pass contracts to downstream agents or trigger story generation. It only builds and validates contracts.

3. **Manage Draft Lifecycle**: Agent 1 does not track draft status, manage generation queues, or handle draft revisions. These responsibilities belong to downstream agents.

4. **Store Generated Stories**: Agent 1 does not persist generated story content or manage story templates. It only manages contracts and briefs.

5. **Handle User Authentication**: Agent 1 does not validate user permissions or manage access control. Authentication is handled at the API layer.

6. **Perform Real-time Monitoring**: Agent 1 does not monitor contract execution or track generation performance metrics.

7. **Manage Clinical Rules Content**: Agent 1 loads and applies clinical rules but does not create, edit, or version the rules themselves. Rule management is a separate administrative function.

## Inputs

### Primary Input: Story Brief

A Story Brief is a structured document containing:

#### Therapeutic Focus
- **primaryTopic**: Reference data key identifying the therapeutic domain (e.g., "fear_anxiety", "social_skills")
- **specificSituation**: Reference data key identifying the precise situation (e.g., "fear_of_school", "making_friends")

#### Child Profile
- **ageGroup**: One of `"0_3"`, `"3_6"`, `"6_9"`, or `"9_12"` (age bands in years)
- **emotionalSensitivity**: One of `"low"`, `"medium"`, or `"high"`

#### Therapeutic Intent
- **emotionalGoals**: Array of 1-3 goal keys from reference data (e.g., `["normalize_emotions", "reduce_fear"]`)
- **keyMessage**: Optional free-text message (max 200 characters) conveying a specific therapeutic point

#### Language & Tone
- **complexity**: One of `"very_simple"`, `"simple"`, or `"moderate"`
- **emotionalTone**: One of `"very_gentle"`, `"calm"`, or `"encouraging"`

#### Safety Constraints
- **enforced**: Hard-coded safety rules (always enforced, not user-configurable)
  - `noThreateningImagery: true`
  - `noShameLanguage: true`
  - `noMoralizing: true`
  - `validateEmotions: true`
  - `externalizeProblem: true`
- **exclusions**: Array of exclusion keys from reference data (e.g., `["medical_imagery", "authority_figures"]`)

#### Story Preferences
- **caregiverPresence**: One of `"included"` or `"self_guided"`
- **endingStyle**: One of `"calm_resolution"`, `"open_ended"`, or `"empowering"`

#### Optional Overrides
- **overrides.copingToolId**: Optional specialist-selected coping tool override
- **overrides.reason**: Optional free-text reason for the override (can be empty string)

#### Metadata
- **briefId**: Unique identifier for the brief
- **rulesVersion**: Optional explicit rules version (defaults to system default if not specified)

### Secondary Inputs

1. **Clinical Rules**: Loaded from Firestore based on version (default or specified)
2. **Reference Data**: Validated against Firestore collections (topics, situations, goals, exclusions)

## Outputs

### Primary Output: Generation Contract

A Generation Contract is a complete, executable specification containing:

#### Contract Metadata
- **briefId**: Reference to the source Story Brief
- **rulesVersionUsed**: Exact version of clinical rules applied (e.g., `"v1"`)
- **status**: `"valid"` or `"invalid"` (invalid contracts cannot proceed)
- **createdAt**: Timestamp of contract creation
- **updatedAt**: Timestamp of last modification

#### Therapeutic Context
- **topic**: Resolved topic label/key
- **situation**: Resolved situation label/key
- **ageBand**: Age group identifier
- **caregiverPresence**: Caregiver inclusion setting
- **emotionalSensitivity**: Sensitivity level

#### Length Budget
- **minScenes**: Minimum number of story scenes (age-dependent)
- **maxScenes**: Maximum number of story scenes (age-dependent)
- **maxWords**: Maximum total word count (age-dependent)
- **targetWords**: Optional target word count (if specified)

#### Style Rules
- **maxSentenceWords**: Maximum words per sentence (age-dependent)
- **dialoguePolicy**: One of `"none"`, `"minimal"`, or `"allowed"` (age-dependent)
- **abstractConcepts**: One of `"no"`, `"limited"`, or `"yes"` (age-dependent)
- **emotionalTone**: Resolved emotional tone setting
- **languageComplexity**: Resolved complexity setting

#### Required Elements
Array of required story elements derived from:
- Goal mappings (e.g., `"emotion_labeling"`, `"validation_phrase"`)
- Ending rules (e.g., `"emotional_closure"`, `"calm_state"`)
- Sensitivity rules (e.g., `"safe_present_moment"`)

#### Allowed Coping Tools
Array of coping tool IDs that are:
- Allowed for the specified age band
- Mapped from the selected therapeutic goals
- Potentially overridden by specialist selection

#### Must Avoid Patterns
Array of patterns to avoid, derived from:
- Goal mappings (e.g., `"shaming_language"`, `"suspense"`)
- Ending rules (e.g., `"cliffhanger"`, `"new_threat"`)
- Sensitivity rules (e.g., `"sudden_surprise"`, `"emotional_spikes"`)
- Exclusion rules (e.g., `"needles"`, `"blood"`, `"police_threat"`)

#### Ending Contract
- **endingStyle**: Selected ending style
- **mustInclude**: Required ending elements
- **mustAvoid**: Prohibited ending elements
- **requiresEmotionalStability**: Boolean flag
- **requiresSuccessMoment**: Boolean flag
- **requiresSafeClosure**: Boolean flag

#### Override Information
- **overrideUsed**: Boolean indicating if specialist override was applied
- **overrideDetails**: Object containing:
  - `copingToolId`: Overridden tool ID
  - `reason`: Override reason (may be empty string)

#### Optional Key Message
- **keyMessage**: Specialist-provided key message (if specified)

#### Validation Results
- **warnings**: Array of non-blocking warnings (e.g., unknown exclusion rules, no coping tools available)
- **errors**: Array of blocking errors (e.g., missing age rules, missing goal mappings)
- **validationSummary**: Object containing:
  - `errorCount`: Number of errors
  - `warningCount`: Number of warnings

## UI Contract

The UI Contract defines how Generation Contract data is presented to specialists in the Contract Review interface. It specifies which fields are displayed, their visibility, editability, formatting rules, and organizational structure.

### Contract Review Page Structure

The Contract Review page (`/specialist/story-briefs/:briefId/contract`) displays the contract in the following sections:

#### 1. Validation Alerts (Top of Page)

**Display Rules:**
- **Errors**: Always displayed if `contract.errors.length > 0`
  - Display format: Red alert box with error count in header
  - Content: List of all error messages
  - Visibility: Always visible when errors exist
  - Editability: Read-only
  - Impact: Blocks contract confirmation (disables "Confirm & Continue" button)

- **Warnings**: Always displayed if `contract.warnings.length > 0`
  - Display format: Yellow/orange alert box with warning count in header
  - Content: List of all warning messages
  - Visibility: Always visible when warnings exist
  - Editability: Read-only
  - Impact: Non-blocking (does not prevent contract confirmation)

#### 2. Brief Summary Card (Left Column)

**Display Rules:**
- **Section Title**: "Brief Summary"
- **Layout**: Card component in left column of two-column grid
- **All Fields**: Read-only (display only)

**Fields Displayed:**

| Field | Source | Display Label | Formatting | Visibility |
|-------|--------|---------------|------------|------------|
| `topic` | `contract.topic` | "Topic" | `formatDisplayText()` - Capitalize words, replace underscores with spaces | Always visible |
| `situation` | `contract.situation` | "Situation" | `formatDisplayText()` - Capitalize words, replace underscores with spaces | Always visible |
| `ageGroup` | `brief.childProfile.ageGroup` | "Age Group" | `formatAgeGroup()` - Maps enum to display (e.g., "0_3" → "0–3 years") | Always visible |
| `emotionalSensitivity` | `brief.childProfile.emotionalSensitivity` | "Emotional Sensitivity" | `formatDisplayText()` - Capitalize words, replace underscores with spaces | Always visible |
| `emotionalGoals` | `brief.therapeuticIntent.emotionalGoals` | "Emotional Goals" | Array displayed as chips, each goal formatted with `formatDisplayText()` | Always visible |
| `endingStyle` | `brief.storyPreferences.endingStyle` | "Ending Style" | `formatDisplayText()` - Capitalize words, replace underscores with spaces | Always visible |

**Display Format:**
- Each field uses a two-line layout:
  - Line 1: Caption (small, secondary color text)
  - Line 2: Value (normal body text)
- Emotional Goals displayed as Material-UI Chips with small size

#### 3. Contract Details Card (Right Column)

**Display Rules:**
- **Section Title**: "Contract Details"
- **Layout**: Card component in right column of two-column grid
- **All Fields**: Read-only (display only)

**Fields Displayed:**

| Field | Source | Display Label | Formatting | Visibility | Display Limit |
|-------|--------|---------------|------------|------------|---------------|
| `lengthBudget` | `contract.lengthBudget` | "Length Budget" | Combined format: "{minScenes}–{maxScenes} scenes, max {maxWords} words" | Always visible | N/A |
| `requiredElements` | `contract.requiredElements` | "Required Elements ({count})" | Array displayed as chips, each element formatted with `formatDisplayText()`, showing first 10 items | Always visible | First 10 items, "+{N} more" indicator if > 10 |
| `allowedCopingTools` | `contract.allowedCopingTools` | "Allowed Coping Tools ({count})" | Array displayed as chips, each tool formatted with `formatDisplayText()` | Always visible | All items (no limit) |
| `mustAvoid` | `contract.mustAvoid` | "Must Avoid (showing first 20 of {count})" | Array displayed as error-colored outlined chips, each item formatted with `formatDisplayText()`, showing first 20 items | Always visible | First 20 items, "+{N} more" indicator if > 20 |

**Display Format:**
- Length Budget: Single-line text display
- Arrays: Material-UI Chips with small size
- Must Avoid chips use error color variant (red outlined)
- Required Elements and Allowed Coping Tools use default chip styling

#### 4. Override Section (Full Width)

**Display Rules:**
- **Section Title**: "Override Coping Tool"
- **Layout**: Paper component spanning full width (both columns)
- **Purpose**: Allow specialist to override automatically selected coping tool
- **Visibility**: Always visible

**Fields Displayed:**

| Field | Source | Display Label | Input Type | Editability | Validation |
|-------|--------|---------------|------------|-------------|------------|
| `copingTool` | `contract.allowedCopingTools` (populated in dropdown) | "Coping Tool" | Material-UI Select dropdown | Editable | Required (cannot be empty) |
| `overrideReason` | User input (not from contract) | "Reason (optional)" | Material-UI TextField | Editable | Optional (can be empty string) |
| `overrideStatus` | `contract.overrideUsed` + `contract.overrideDetails.copingToolId` | N/A (info alert) | Info alert box | Read-only | N/A |

**Initial State:**
- If `contract.overrideUsed === true` and `contract.overrideDetails.copingToolId` exists:
  - Selected coping tool: `contract.overrideDetails.copingToolId`
- Else if `contract.allowedCopingTools.length > 0`:
  - Selected coping tool: First item in `contract.allowedCopingTools`
- Else:
  - Selected coping tool: Empty (dropdown disabled)

**Override Application:**
- When "Apply Override & Regenerate" button is clicked:
  - Validates that `selectedCopingTool` is not empty
  - Calls `applyContractOverride(briefId, { copingToolId, reason })` API
  - Updates contract state with regenerated contract
  - Synchronizes `selectedCopingTool` with new `contract.overrideDetails.copingToolId`
  - Clears `overrideReason` field after successful override

**Override Status Display:**
- If override is active (`contract.overrideUsed === true`):
  - Display info alert: "Override is currently active: {formatted tool name}"
  - Format tool name using `formatDisplayText()`

#### 5. Action Buttons (Full Width)

**Display Rules:**
- **Layout**: Stack of buttons at bottom, right-aligned
- **Visibility**: Always visible

**Buttons:**

| Button | Label | Variant | Editability | Disabled Condition |
|--------|-------|---------|-------------|-------------------|
| Back | "Back" | Outlined | Action (navigates back) | Never disabled |
| Confirm & Continue | "Confirm & Continue" | Contained (primary) | Action (navigates to generate draft page) | Disabled if `contract.errors.length > 0` |

**Navigation:**
- Back button: `navigate(-1)` (browser back)
- Confirm & Continue button: Navigates to `/specialist/generate-draft?briefId={briefId}`

### Field Formatting Functions

The UI uses helper functions to format contract data for display:

#### `formatDisplayText(text: string): string`
- **Purpose**: Converts snake_case or kebab-case keys to human-readable labels
- **Logic**:
  1. Split by underscores
  2. Filter out empty strings
  3. Capitalize first letter of each word
  4. Join with spaces
- **Examples**:
  - `"fear_anxiety"` → `"Fear Anxiety"`
  - `"making_friends"` → `"Making Friends"`
  - `"very_gentle"` → `"Very Gentle"`

#### `formatAgeGroup(ageGroup: string): string`
- **Purpose**: Converts age group enum to display format
- **Mapping**:
  - `"0_3"` → `"0–3 years"`
  - `"3_6"` → `"3–6 years"`
  - `"6_9"` → `"6–9 years"`
  - `"9_12"` → `"9–12 years"`
  - Unknown values → Return as-is

### Fields NOT Displayed in UI

The following Generation Contract fields are **not** displayed in the Contract Review UI but are available in the contract object:

- **Contract Metadata**:
  - `briefId` (used internally for API calls)
  - `rulesVersionUsed` (not shown to specialist)
  - `status` (used internally to disable buttons)
  - `createdAt` (not shown)
  - `updatedAt` (not shown)

- **Therapeutic Context**:
  - `caregiverPresence` (not shown in contract review, may be in brief summary)

- **Length Budget**:
  - `targetWords` (optional field, not displayed)

- **Style Rules**:
  - `styleRules.maxSentenceWords` (not displayed)
  - `styleRules.dialoguePolicy` (not displayed)
  - `styleRules.abstractConcepts` (not displayed)
  - `styleRules.emotionalTone` (not displayed, but may be in brief summary)
  - `styleRules.languageComplexity` (not displayed, but may be in brief summary)

- **Ending Contract**:
  - `endingContract.mustInclude` (not displayed)
  - `endingContract.mustAvoid` (not displayed, but merged into `contract.mustAvoid`)
  - `endingContract.requiresEmotionalStability` (not displayed)
  - `endingContract.requiresSuccessMoment` (not displayed)
  - `endingContract.requiresSafeClosure` (not displayed)

- **Override Information**:
  - `overrideDetails.reason` (not displayed separately, only used when applying new override)

- **Key Message**:
  - `keyMessage` (not displayed in contract review)

- **Validation Summary**:
  - `validationSummary` (not displayed, but error/warning counts shown in alert headers)

### UI Contract API Endpoints

The UI interacts with the following API endpoints:

#### `POST /api/agent1/contracts/preview`
- **Purpose**: Preview a generation contract without saving to Firestore
- **Request Body**: `{ brief: StoryBrief, briefId?: string }`
- **Response**: `{ data: GenerationContract }`
- **Usage**: Load contract for initial display

#### `POST /api/agent1/contracts/:briefId/override`
- **Purpose**: Apply coping tool override and regenerate contract
- **Request Body**: `{ copingToolId: string, reason?: string }`
- **Response**: `{ data: GenerationContract }` (regenerated contract)
- **Usage**: Update contract with specialist override

### UI Contract Data Flow

1. **Initial Load**:
   - Load Story Brief by ID: `fetchStoryBriefById(briefId)`
   - Preview Contract: `previewContract(briefData, briefId)`
   - Display contract in UI sections
   - Initialize override UI state from contract

2. **Override Application**:
   - User selects coping tool and optionally provides reason
   - User clicks "Apply Override & Regenerate"
   - Call `applyContractOverride(briefId, { copingToolId, reason })`
   - Update contract state with regenerated contract
   - Refresh UI to show updated contract and override status

3. **Contract Confirmation**:
   - User reviews contract (all sections)
   - If no errors, "Confirm & Continue" button is enabled
   - User clicks button → Navigate to generate draft page with `briefId`

### UI Contract Validation Rules

- **Error Blocking**: Contracts with `status === "invalid"` or `errors.length > 0` cannot be confirmed
- **Warning Non-Blocking**: Contracts with only warnings can be confirmed
- **Override Validation**: Override coping tool must exist in `contract.allowedCopingTools` (validated server-side)
- **Required Fields**: Coping tool selection is required when applying override (client-side validation)

## Internal Processing Flow

### Step 1: Input Validation
1. Validate Story Brief structure and required fields
2. Verify all enum values are valid (age groups, sensitivity levels, etc.)
3. Check reference data integrity:
   - Verify topic exists and is active
   - Verify situation exists, is active, and matches topic
   - Verify all emotional goals exist and are active
   - Verify all exclusions exist and are active
4. Validate business rules:
   - Emotional goals array has 1-3 items
   - Key message (if provided) is ≤ 200 characters
   - Exclusions array is properly typed
5. Collect validation errors and warnings

### Step 2: Clinical Rules Loading
1. Determine rules version (use explicit version if provided, otherwise load default from `settings/rules`)
2. Load clinical rules from Firestore:
   - Age rules for all age bands
   - Goal mappings for all therapeutic goals
   - Coping tools with age restrictions
   - Ending rules for all ending styles
   - Sensitivity rules for all sensitivity levels
   - Exclusion rules (if any)
3. Verify rules completeness (all required subcollections exist)
4. Cache rules in memory (5-minute TTL)

### Step 3: Age Band Rule Application
1. Extract age band from child profile
2. Load age-specific rules:
   - Word limits (min/max)
   - Scene counts (min/max)
   - Sentence complexity (max words per sentence)
   - Dialogue policy
   - Abstract concepts policy
3. If age rules missing, add error and mark contract invalid

### Step 4: Goal Mapping Application
1. For each emotional goal in the brief:
   - Load goal mapping from clinical rules
   - Extract required elements
   - Extract allowed coping tools
   - Extract avoid patterns
   - Check if closure is required
2. Merge all goal-derived elements (deduplicated)
3. If any goal mapping missing, add error and mark contract invalid

### Step 5: Sensitivity Rule Application
1. Extract emotional sensitivity level
2. Load sensitivity-specific rules:
   - Additional "must avoid" patterns
   - Safe closure requirement flag
3. Apply sensitivity rules to contract
4. If sensitivity rules missing, add error and mark contract invalid

### Step 6: Ending Rule Application
1. Extract ending style from story preferences
2. Load ending-specific rules:
   - Required ending elements
   - Prohibited ending elements
   - Emotional stability requirement
   - Success moment requirement
   - Safe closure requirement
3. Apply ending rules to contract
4. If ending rules missing, add error and mark contract invalid

### Step 7: Coping Tool Filtering
1. Start with coping tools from goal mappings
2. Filter by age band compatibility (remove tools not allowed for age)
3. Check for specialist override:
   - If override provided, validate tool exists and is age-compatible
   - If valid, add override tool to allowed list (even if not in goal mapping)
   - If invalid, add warning and ignore override
4. If no coping tools remain after filtering, add warning (but do not block)

### Step 8: Exclusion Rule Application
1. For each exclusion in brief:
   - Load exclusion rule from clinical rules
   - Extract banned patterns
   - Add to "must avoid" list
2. If exclusion rule not found, add warning (non-blocking)

### Step 9: Override Processing
1. Check if brief contains override:
   - If `overrides.copingToolId` exists, validate tool
   - If valid, set `overrideUsed = true` and populate `overrideDetails`
   - If invalid, add warning and ignore override
2. Preserve override reason (even if empty string) for audit trail

### Step 10: Contract Assembly
1. Assemble all contract fields:
   - Metadata (briefId, rulesVersion, timestamps)
   - Therapeutic context (topic, situation, age, sensitivity)
   - Length budget (from age rules)
   - Style rules (from age rules and brief)
   - Required elements (merged from goals, ending, sensitivity)
   - Allowed coping tools (filtered and potentially overridden)
   - Must avoid patterns (merged from goals, ending, sensitivity, exclusions)
   - Ending contract (from ending rules)
   - Override information (if applicable)
   - Key message (if provided)
   - Validation results (errors, warnings, summary)
2. Set contract status:
   - If errors exist: `status = "invalid"`
   - If no errors: `status = "valid"`

### Step 11: Persistence (Optional)
1. If `skipSave` option is false (default):
   - Save contract to Firestore at `generationContracts/{briefId}`
   - Use `set()` with `merge: false` to overwrite existing contracts
   - Set `updatedAt` timestamp
2. If `skipSave` is true (preview mode):
   - Return contract without saving

### Step 12: Return Contract
1. Return complete Generation Contract object
2. Downstream systems check `status` field before proceeding

## Data Models

### Story Brief

A Story Brief represents a specialist's therapeutic intention before any AI generation occurs. It is a structured, validated document stored in Firestore at `storyBriefs/{briefId}`.

**Key Characteristics:**
- **Human-authored**: Created by specialists through a structured form
- **Reference-data-bound**: All categorical fields reference Firestore reference data collections
- **Versioned**: Includes metadata for tracking changes
- **Override-capable**: Supports specialist overrides for clinical judgment
- **Immutable intent**: Once created, the brief represents a fixed therapeutic intention

**Core Structure:**
- Therapeutic focus (topic + situation)
- Child profile (age + sensitivity)
- Therapeutic intent (goals + optional key message)
- Language & tone preferences
- Safety constraints (enforced + exclusions)
- Story preferences (caregiver presence + ending style)
- Optional overrides (coping tool + reason)
- Metadata (timestamps, version, status)

### Generation Contract

A Generation Contract is a machine-executable specification derived from a Story Brief. It is stored in Firestore at `generationContracts/{briefId}`.

**Key Characteristics:**
- **Deterministic**: Same brief + same rules version = same contract
- **Executable**: Contains all parameters needed for story generation
- **Traceable**: Records exact rules version and override history
- **Validated**: Includes error/warning metadata
- **Immutable snapshot**: Represents a point-in-time contract state

**Core Structure:**
- Contract metadata (briefId, rulesVersion, status, timestamps)
- Therapeutic context (resolved topic, situation, age, sensitivity)
- Length budget (age-derived constraints)
- Style rules (age-derived + brief-derived)
- Required elements (goal + ending + sensitivity derived)
- Allowed coping tools (goal-derived, age-filtered, potentially overridden)
- Must avoid patterns (goal + ending + sensitivity + exclusion derived)
- Ending contract (ending rule derived)
- Override information (if applicable)
- Key message (if provided)
- Validation results (errors, warnings, summary)

## Error Handling

### Error Codes

Errors are blocking conditions that prevent contract creation or mark contracts as invalid.

#### Validation Errors (from `validateStoryBriefInput`)

- **REQUIRED_FIELD_MISSING**: A required field in the Story Brief is missing or null
- **INVALID_AGE_GROUP**: Age group value is not one of the allowed enum values
- **INVALID_EMOTIONAL_SENSITIVITY**: Emotional sensitivity value is not one of the allowed enum values
- **INVALID_COMPLEXITY**: Complexity value is not one of the allowed enum values
- **INVALID_EMOTIONAL_TONE**: Emotional tone value is not one of the allowed enum values
- **INVALID_CAREGIVER_PRESENCE**: Caregiver presence value is not one of the allowed enum values
- **INVALID_ENDING_STYLE**: Ending style value is not one of the allowed enum values
- **INVALID_GOALS_COUNT**: Emotional goals array has fewer than 1 or more than 3 items
- **KEY_MESSAGE_INVALID_TYPE**: Key message is not a string (if provided)
- **KEY_MESSAGE_TOO_LONG**: Key message exceeds 200 characters
- **EXCLUSIONS_INVALID_TYPE**: Exclusions field is not an array (if provided)
- **TOPIC_NOT_FOUND_OR_INACTIVE**: Primary topic key does not exist in reference data or is inactive
- **SITUATION_NOT_FOUND_OR_INACTIVE**: Situation key does not exist in reference data or is inactive
- **SITUATION_TOPIC_MISMATCH**: Situation's topic key does not match the brief's primary topic
- **GOAL_NOT_FOUND_OR_INACTIVE**: One or more emotional goal keys do not exist in reference data or are inactive
- **EXCLUSION_NOT_FOUND_OR_INACTIVE**: One or more exclusion keys do not exist in reference data or are inactive

#### Contract Building Errors (from `buildGenerationContract`)

- **BRIEF_NOT_FOUND**: Story brief document does not exist in Firestore
- **MISSING_AGE_RULE**: Clinical rules are missing age rules for the specified age band
- **MISSING_GOAL_MAPPING**: Clinical rules are missing goal mapping for one or more emotional goals
- **MISSING_SENSITIVITY_RULE**: Clinical rules are missing sensitivity rules for the specified sensitivity level
- **MISSING_ENDING_RULE**: Clinical rules are missing ending rules for the specified ending style

### Warning Codes

Warnings are non-blocking conditions that do not prevent contract creation but indicate potential issues.

#### Validation Warnings

- **AGE_SELF_GUIDED_WARNING**: Age group is 0-3 years but caregiver presence is set to "self_guided" (may be inappropriate)

#### Contract Building Warnings

- **UNKNOWN_EXCLUSION_RULE**: An exclusion key in the brief does not have a corresponding rule in clinical rules (exclusion ignored)
- **UNKNOWN_COPING_TOOL**: A coping tool from goal mappings is not found in clinical rules (tool ignored)
- **NO_COPING_TOOL_AVAILABLE**: After age filtering, no coping tools remain available (story may lack coping mechanisms)
- **INVALID_OVERRIDE_COPING_TOOL**: Specialist override specifies a coping tool that is invalid or not allowed for the age band (override ignored)

### Error Handling Strategy

1. **Validation Phase**: All validation errors are collected before contract building begins. If errors exist, contract building may be skipped or contract marked as invalid.

2. **Contract Building Phase**: Errors in clinical rules (missing age rules, goal mappings, etc.) are added to the contract's error array and the contract is marked as `status: "invalid"`.

3. **Warning Collection**: Warnings are collected throughout processing but do not block contract creation. They are included in the contract for specialist review.

4. **Contract Status**: Contracts with errors have `status: "invalid"` and should not be used for story generation. Contracts with only warnings have `status: "valid"` but should be reviewed.

5. **Downstream Handling**: Downstream agents must check contract status before proceeding. Invalid contracts should trigger alerts to specialists.

## Override Behavior

Agent 1 supports **Option B** override workflow: specialists can review contracts and apply overrides before finalization.

### Override Types

Currently, Agent 1 supports one type of override:

1. **Coping Tool Override**: Specialists can select a specific coping tool that differs from the tools automatically selected based on goals and age constraints.

### Override Workflow

1. **Contract Preview**: Specialist creates a Story Brief and is automatically navigated to the Contract Review page.

2. **Contract Display**: The system displays the generated contract, including:
   - Automatically selected coping tools (from goal mappings, filtered by age)
   - All contract parameters (length budget, style rules, required elements, etc.)
   - Any warnings or errors

3. **Override Selection**: Specialist can:
   - View all available coping tools for the age band
   - Select an alternative coping tool (even if not in goal mapping)
   - Optionally provide a reason for the override (can be empty)

4. **Override Application**: When specialist applies override:
   - System validates override (tool exists and is age-compatible)
   - If valid: override is saved to Story Brief's `overrides` field
   - Contract is regenerated with override applied
   - Override metadata (tool ID, reason, timestamp) is preserved in contract

5. **Override Persistence**: Override is stored in:
   - Story Brief: `overrides.copingToolId` and `overrides.reason`
   - Generation Contract: `overrideDetails.copingToolId` and `overrideDetails.reason`

### Override Validation

- **Existence Check**: Override tool must exist in clinical rules
- **Age Compatibility**: Override tool must be allowed for the brief's age band
- **Invalid Override Handling**: If override is invalid, a warning is added and the override is ignored (contract uses default tool selection)

### Override Metadata

- **Reason Preservation**: Override reasons are preserved exactly as provided, including empty strings. This ensures audit trail completeness.
- **Timestamp Tracking**: Override timestamps are recorded in both brief and contract for audit purposes.
- **Version Traceability**: Contracts regenerated with overrides maintain the same rules version as the original contract (unless explicitly changed).

## Versioning Strategy

### Clinical Rules Versioning

Clinical rules are versioned to enable:
- **Reproducibility**: Contracts reference specific rules versions, ensuring identical briefs produce identical contracts
- **Rollback Capability**: System can revert to previous rules versions if issues are discovered
- **Gradual Rollout**: New rules versions can be tested on subset of briefs before full deployment
- **Audit Compliance**: All contracts are traceable to exact rules versions used

### Rules Version Resolution

1. **Default Version**: System maintains a default rules version in `settings/rules.defaultVersion`
2. **Explicit Version**: Briefs can specify `rulesVersion` to use a non-default version
3. **Contract Preservation**: When regenerating contracts (e.g., after override), the original contract's rules version is preserved unless explicitly changed
4. **Version Validation**: System validates that specified rules versions exist before contract building

### Contract Traceability

Every Generation Contract includes:
- **rulesVersionUsed**: Exact version string (e.g., `"v1"`)
- **briefId**: Reference to source Story Brief
- **createdAt**: Contract creation timestamp
- **updatedAt**: Contract modification timestamp
- **overrideDetails**: If override applied, includes override metadata

This enables:
- **Historical Analysis**: Query all contracts created with a specific rules version
- **Impact Assessment**: Identify which contracts would be affected by rules changes
- **Compliance Audits**: Trace any contract back to its rules version and brief

### Version Management

- **Rules Creation**: New rules versions are created through administrative seeding scripts
- **Version Activation**: Rules versions have a `status` field (`"active"` or other states)
- **Default Updates**: System administrators can update default version in `settings/rules`
- **Contract Regeneration**: Contracts can be regenerated with new rules versions if needed (requires explicit version specification)

## Why This Agent Is Critical to System Safety

Agent 1 serves as the **safety gatekeeper** for the entire DAMMAH story generation system. Its critical role cannot be overstated:

### 1. Prevents Harmful Content Generation

By enforcing clinical rules and safety constraints **before** any AI model is invoked, Agent 1 ensures that:
- Age-inappropriate content cannot be generated (word limits, sentence complexity, abstract concepts)
- Harmful patterns are explicitly prohibited (threatening imagery, shame language, moralizing)
- Therapeutic integrity is maintained (required elements, avoidance patterns)

### 2. Enables Human Oversight

The contract review workflow allows specialists to:
- Verify that automated rule application matches clinical judgment
- Override automated decisions when clinical expertise requires it
- Maintain full visibility into what constraints will be applied to story generation

### 3. Ensures Reproducibility and Auditability

By versioning rules and contracts:
- Identical briefs produce identical contracts (deterministic behavior)
- All decisions are traceable to specific rules versions
- Regulatory compliance is supported through complete audit trails

### 4. Prevents Downstream Failures

By validating inputs and rules completeness:
- Downstream agents receive only valid, complete contracts
- Generation failures due to missing parameters are prevented
- System errors are caught early, before expensive AI model invocations

### 5. Supports Clinical Governance

The override system enables:
- Specialists to exercise clinical judgment when automated rules are insufficient
- Override decisions to be documented and audited
- System to learn from override patterns (potential future enhancement)

### 6. Maintains System Integrity

By enforcing reference data validation:
- Only approved topics, situations, goals, and exclusions can be used
- Data consistency is maintained across the system
- Invalid or inactive reference data cannot corrupt contracts

### 7. Enables Scalability

By centralizing rule application:
- Clinical rules can be updated without modifying downstream agents
- New rules versions can be deployed gradually
- Rule changes are immediately reflected in all new contracts

### 8. Reduces Operational Risk

By providing clear error and warning signals:
- System operators can identify and fix issues before they affect story generation
- Specialists are alerted to potential problems (warnings)
- Invalid contracts are blocked from proceeding (errors)

## Conclusion

Agent 1 is not merely a validation layer—it is the **foundational safety mechanism** that ensures DAMMAH generates therapeutically appropriate, age-appropriate, and clinically safe stories. Without Agent 1, the system would lack the deterministic constraints, human oversight, and traceability required for a production therapeutic AI system.

The agent's design principles—determinism, traceability, human-in-the-loop oversight, and version control—are essential for building trust with specialists, ensuring regulatory compliance, and maintaining the therapeutic integrity of the DAMMAH platform.
