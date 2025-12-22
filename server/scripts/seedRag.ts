import "dotenv/config";
import { db } from "../src/config/firebase";

/**
 * Seed script to populate Firestore with BOOK-BASED RAG knowledge base data
 * Run with: ts-node scripts/seedRag.ts
 *
 * Notes:
 * - Uses deterministic doc IDs (no duplicates)
 * - Uses merge to allow safe re-run
 */

type SeedDoc = {
  collection: string;
  docId: string;
  data: Record<string, any>;
};

async function seedRAG() {
  console.log("Starting BOOK-BASED RAG data seeding...");

  const now = new Date().toISOString();

  // -------------------------
  // Book-based RAG docs
  // -------------------------
  const docs: SeedDoc[] = [
    // -------------------------
    // Core (general)
    // -------------------------
    {
      collection: "rag_therapeutic_principles",
      docId: "general_therapeutic_storytelling",
      data: {
        source: "Therapeutic Storytelling – Susan Perrow (conceptual principles)",
        version: 1,
        updatedAt: now,
        principles: [
          "Stories can be healing by engaging imagination and emotion rather than instruction.",
          "Therapeutic stories aim to restore balance and wholeness, not to correct behavior.",
          "Healing is gradual and unfolds through the story journey.",
          "Children should feel reflected and understood, not judged or fixed.",
          "Stories should leave space for the child to form their own meaning.",
        ],
      },
    },
    {
      collection: "rag_narrative_framework",
      docId: "classic_therapeutic_framework",
      data: {
        source: "Therapeutic Storytelling – Susan Perrow (metaphor–journey–resolution)",
        version: 1,
        updatedAt: now,
        framework: [
          {
            stage: "metaphor",
            description:
              "Introduce the emotional experience through gentle narrative elements without diagnosis or lecturing.",
          },
          {
            stage: "journey",
            description:
              "Allow the story to unfold as a process where challenges are met gradually, with small shifts over time.",
          },
          {
            stage: "resolution",
            description:
              "End with a calm, realistic resolution that restores balance rather than perfection or instant change.",
          },
        ],
      },
    },
    {
      collection: "rag_writing_rules",
      docId: "therapeutic_writing_rules",
      data: {
        source: "Therapeutic Storytelling – Susan Perrow (non-directive storytelling rules)",
        version: 1,
        updatedAt: now,
        rules: [
          "Do not moralize or teach a lesson explicitly.",
          "Do not lecture or directly address the child reader.",
          "Reflect emotions before offering comfort.",
          "Use imagination as a medium, not explanation.",
          "Allow subtlety: let meaning emerge without stating it.",
          "Let change emerge gradually through the narrative.",
          // Your constraint:
          "Main character must be a human child; do not portray the child as an animal.",
          "Animals may appear only as side characters (pets/wildlife) and must not replace the child protagonist.",
        ],
      },
    },
    {
      collection: "rag_dont_do_list",
      docId: "global_therapeutic_avoid_list",
      data: {
        source: "Therapeutic Storytelling – Susan Perrow (avoid moralizing/guilt/punitive endings)",
        version: 1,
        updatedAt: now,
        avoid: [
          "Moralizing endings",
          "Inducing guilt or shame",
          "Correcting behavior directly",
          "Instant or magical fixes",
          "Over-intellectual explanations",
          "Forcing a single interpretation",
          "Portraying the child protagonist as an animal character",
        ],
      },
    },
    {
      collection: "rag_story_intent",
      docId: "therapeutic_story_intent",
      data: {
        source: "Therapeutic Storytelling – Susan Perrow (restore balance, not fix child)",
        version: 1,
        updatedAt: now,
        intent: [
          "Support emotional balance",
          "Normalize the child’s experience",
          "Empower the child through identification with the character",
          "Offer comfort without pressure",
          "Encourage inner coping without direct instruction",
        ],
      },
    },
    {
      collection: "rag_example_snippets",
      docId: "general_style_snippets",
      data: {
        source: "Inspired style snippets (original, not copied text)",
        version: 1,
        updatedAt: now,
        snippets: [
          "{{child_name}} felt the worry quietly settle inside {{pronoun_possessive}} chest, waiting to be noticed.",
          "Nothing needed to be fixed right away; being heard was enough for now.",
          "Step by step, the feeling softened—not disappearing, but becoming easier to carry.",
        ],
      },
    },
    {
      collection: "rag_sources",
      docId: "perrow_therapeutic_storytelling",
      data: {
        title: "Therapeutic Storytelling: 101 Healing Stories for Children",
        author: "Susan Perrow",
        type: "Book",
        usage:
          "Conceptual framework for therapeutic storytelling principles. No story text is stored; only abstracted principles are used.",
        version: 1,
        updatedAt: now,
      },
    },

    // -------------------------
    // Resolution (positive resolutions)
    // -------------------------
    {
      collection: "rag_resolution_principles",
      docId: "positive_therapeutic_resolutions",
      data: {
        source: "Therapeutic Storytelling – Susan Perrow (resolution principles)",
        version: 1,
        updatedAt: now,
        principles: [
          "The resolution should restore balance and harmony, not punish behavior.",
          "Affirmation should replace guilt or shame at the end of the story.",
          "Transformation should occur through experience and insight, not external enforcement.",
          "Resolutions should feel earned through the story journey, not sudden or magical.",
          "For young children, resolutions should be hopeful and emotionally satisfying.",
        ],
      },
    },
    {
      collection: "rag_resolution_rules",
      docId: "resolution_writing_rules",
      data: {
        source: "Therapeutic Storytelling – Susan Perrow (non-punitive endings)",
        version: 1,
        updatedAt: now,
        rules: [
          "Do not end the story with punishment or moral judgment.",
          "Do not use fear, threat, or loss as the main corrective force.",
          "Avoid endings where power is shifted from victim to aggressor.",
          "Let the character arrive at change through choice or understanding.",
          "Ensure the ending feels calm, safe, and reassuring.",
        ],
      },
    },
    {
      collection: "rag_resolution_patterns",
      docId: "behavior_to_balance_patterns",
      data: {
        source: "Therapeutic Storytelling – Susan Perrow (transformational resolution patterns)",
        version: 1,
        updatedAt: now,
        patterns: [
          { from: "Using strength to harm", to: "Using strength to protect or help" },
          { from: "Withdrawal or disengagement", to: "Curiosity and re-engagement" },
          { from: "Fear and insecurity", to: "Confidence and courage" },
          { from: "Excessive control or perfection", to: "Flexibility and acceptance" },
          { from: "Chaos and noise", to: "Rhythm and balance" },
          { from: "Always complaining / never satisfied", to: "Interest and motivation" },
          { from: "Being teased / feeling like a victim", to: "Self-confidence and assertive support" },
          { from: "Inability to listen / constant talking", to: "Learning to pause and listen" },
        ],
      },
    },
    {
      collection: "rag_age_sensitive_resolution",
      docId: "age_based_resolution_guidance",
      data: {
        source: "Therapeutic Storytelling – Susan Perrow (age sensitivity in endings)",
        version: 1,
        updatedAt: now,
        guidance: [
          {
            ageGroup: "4-7",
            rules: [
              "Prefer hopeful and happy endings.",
              "Avoid tragic or unresolved endings.",
              "Endings should emphasize safety and support.",
            ],
          },
          {
            ageGroup: "8+",
            rules: [
              "More complex emotions can be introduced gradually.",
              "Sadness may be present, but hope should remain.",
            ],
          },
        ],
      },
    },

    // -------------------------
    // Metaphor (mystery & magic of metaphor + obstacle/helper)
    // -------------------------
    {
      collection: "rag_metaphor_principles",
      docId: "metaphor_foundations",
      data: {
        source: "Therapeutic Storytelling – Susan Perrow (metaphor foundations)",
        version: 1,
        updatedAt: now,
        principles: [
          "Metaphor engages imagination and emotion more effectively than direct explanation.",
          "Therapeutic metaphors help the child explore inner experiences safely and indirectly.",
          "Metaphor should feel vivid and experiential, not analytical or educational.",
          "Metaphors can shift meaning depending on context and the story journey.",
        ],
      },
    },
    {
      collection: "rag_metaphor_rules",
      docId: "metaphor_writing_rules",
      data: {
        source: "Therapeutic Storytelling – Susan Perrow (metaphor usage rules)",
        version: 1,
        updatedAt: now,
        rules: [
          "Prefer metaphor over simile for younger children (avoid heavy 'like/as' comparisons).",
          "Avoid describing the child’s real-life issue directly; lift it into a metaphorical world.",
          "Use concrete sensory imagery (place, texture, movement) to activate inner images.",
          "Use metaphors to carry meaning; avoid overt explanation of what the metaphor 'means'.",
        ],
      },
    },
    {
      collection: "rag_metaphor_roles",
      docId: "obstacle_and_helper_metaphors",
      data: {
        source: "Therapeutic Storytelling – Susan Perrow (obstacle/helping roles)",
        version: 1,
        updatedAt: now,
        roles: [
          {
            role: "obstacle",
            description:
              "Metaphors that represent hindrances, temptations, pressure, or forces that pull the situation out of balance.",
          },
          {
            role: "helper",
            description:
              "Metaphors that represent guides, supportive figures, tools, or safe places that help restore balance.",
          },
        ],
        designNotes: [
          "A metaphor can switch roles depending on context (the same element can become safe or challenging).",
          "Aim for a balanced mix: obstacles create tension; helpers create safety and movement toward resolution.",
        ],
      },
    },
    {
      collection: "rag_metaphor_design_patterns",
      docId: "metaphor_transform_patterns",
      data: {
        source: "Therapeutic Storytelling – Susan Perrow (metaphor-driven transformation)",
        version: 1,
        updatedAt: now,
        patterns: [
          {
            pattern: "negative_to_positive_capacity",
            description:
              "Transform a capacity used harmfully into the same capacity used helpfully.",
            examples: [
              { from: "voice used to hurt", to: "voice used to create beauty/support" },
              { from: "strength used to push", to: "strength used to protect" },
            ],
          },
          {
            pattern: "shedding_old_self",
            description:
              "Represent change as letting go of an old layer/habit and emerging renewed.",
            examples: [
              { from: "old skin", to: "new skin" },
              { from: "heavy shell", to: "lighter movement" },
            ],
          },
        ],
      },
    },
    {
      collection: "rag_metaphor_starters",
      docId: "starter_metaphor_bank_v1",
      data: {
        source: "Curated starter metaphors (original) + constraints",
        version: 1,
        updatedAt: now,
        starterMetaphors: [
          {
            theme: "focus_attention",
            metaphors: ["a lighthouse beam", "a radio tuning knob", "a steady drum rhythm", "a path with signposts"],
          },
          {
            theme: "fear_anxiety",
            metaphors: ["a small storm cloud", "a doorway with gentle light", "a backpack of worries", "waves that rise then settle"],
          },
        ],
        constraints: {
          avoidAnimalsAsChildCharacter: true,
          allowAnimalsAsSideCharacters: true,
        },
      },
    },
    {
      collection: "rag_metaphor_selection",
      docId: "choose_metaphors_tips_v1",
      data: {
        source: "Therapeutic Storytelling – Susan Perrow (tips for choosing metaphors)",
        version: 1,
        updatedAt: now,
        tips: [
          "Choose metaphors that directly match the specific behavior/situation (same 'quality' or energy).",
          "A metaphor can also work in reverse: start with the opposite behavior and let obstacles reveal the stuckness.",
          "Prefer concrete, sensory metaphors that a child can imagine (movement, sound, texture, place).",
          "Avoid metaphors that are unrelated to the behavior (they feel random and weaken the story).",
          "Keep the protagonist a human child; metaphors can be animals/objects/nature as side elements."
        ]
      }
    },
    {
      collection: "rag_metaphor_workflow",
      docId: "simile_to_metaphor_workflow_v1",
      data: {
        source: "Therapeutic Storytelling – Susan Perrow (example-based method)",
        version: 1,
        updatedAt: now,
        workflow: [
          "Observe the behavior/situation (what is out of balance?).",
          "Start with a simile (X is like Y) to find a good match.",
          "Convert to metaphor (remove 'like/as': X becomes Y).",
          "Dive into the story world immediately using that metaphor.",
          "Add obstacle metaphors that intensify the out-of-balance experience.",
          "Add helping metaphors that guide back toward balance.",
          "Use repetition/rhythm motifs for younger children when it fits (gentle, not moralizing).",
          "End with an affirmative resolution (no guilt, no punishment)."
        ]
      }
    },
    {
      collection: "rag_metaphor_role_taxonomy",
      docId: "metaphor_roles_v2",
      data: {
        source: "Therapeutic Storytelling – Susan Perrow (roles + shifting roles)",
        version: 1,
        updatedAt: now,
        roles: [
          { role: "obstacle", meaning: "Hindrances/temptations/pressures that pull the situation further out of balance." },
          { role: "helper", meaning: "Guides/tools/safe places that support movement back toward balance." },
          { role: "transitional", meaning: "A pause/space/time metaphor that allows change to emerge." },
          { role: "transformational", meaning: "A deep shift metaphor where the 'old way' is shed and a new way emerges." }
        ],
        notes: [
          "The same metaphor may switch roles depending on story context.",
          "Not every metaphor must be labeled; some are subtle but still effective."
        ]
      }
    },
    {
      collection: "rag_metaphor_pattern_library",
      docId: "behavior_to_metaphor_candidates_v1",
      data: {
        source: "Therapeutic Storytelling – Susan Perrow (abstracted guidance + original examples)",
        version: 1,
        updatedAt: now,
        patterns: [
          {
            behaviorKey: "hurting_hands",
            matchQuality: "impact / force / uncontrolled movement",
            metaphorCandidates: ["a heavy hammer", "a crashing wave", "a runaway drumbeat", "a strong animal as a side character"],
            recommendedRoles: ["obstacle", "helper", "transformational"],
            notes: ["Keep protagonist human. The animal/object is symbolic or a side element."]
          },
          {
            behaviorKey: "loud_constant_noise",
            matchQuality: "repetitive loud sound / no rhythm",
            metaphorCandidates: ["banging drumsticks", "a storm of noise", "a radio stuck on high volume"],
            recommendedRoles: ["obstacle", "helper", "transitional"]
          },
          {
            behaviorKey: "withdrawal_shyness",
            matchQuality: "closing in / hiding / small voice",
            metaphorCandidates: ["a closed door", "a tiny seed not ready to open", "a quiet corner that becomes safe"],
            recommendedRoles: ["helper", "transitional"]
          },
          {
            behaviorKey: "inattention_distracted",
            matchQuality: "attention hopping / scattered focus",
            metaphorCandidates: ["a flashlight beam jumping", "a radio tuning knob", "a butterfly as a side element (not the child)"],
            recommendedRoles: ["obstacle", "helper", "transitional"]
          }
        ],
        constraints: {
          avoidAnimalsAsChildCharacter: true,
          allowAnimalsAsSideCharacters: true
        }
      }
    },
    {
  collection: "rag_metaphor_selection",
  docId: "tips_for_choosing_metaphors_v2",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (tips for choosing metaphors)",
    version: 2,
    updatedAt: now,
    tips: [
      "Choose metaphors that directly match the behavior's qualities (energy, movement, impact, sound, pace).",
      "Avoid mismatched metaphors that weaken the story (e.g., gentle images for aggressive behaviors).",
      "Use reverse metaphors when useful: start with the opposite pattern and let obstacles guide change.",
      "Keep the protagonist a human child; animals/objects/nature may appear only as side characters or symbolic elements."
    ]
  }
},
{
  collection: "rag_personalization_hooks",
  docId: "metaphor_from_child_favorites_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (using child favorites and environment)",
    version: 1,
    updatedAt: now,
    hooks: [
      "Use the child's favorite toy/animal/color as a metaphor clue to increase engagement.",
      "Use the child's daily environment (river/forest/city/buildings/school routines) as metaphor material.",
      "Use a simple prop or 'helper role' to anchor attention (e.g., holding an object that appears in the story)."
    ],
    inputsExpected: ["favoriteColor", "favoriteToy", "favoriteAnimal", "homeEnvironment", "schoolTheme"]
  }
},
{
  collection: "rag_group_story_metaphors",
  docId: "class_theme_and_context_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (class themes and local context)",
    version: 1,
    updatedAt: now,
    guidance: [
      "For group/class stories, choose metaphors from curriculum themes (history, knights, adventures).",
      "Use local environment metaphors children share (sea, beach, city, forest).",
      "Use metaphors that support the target behavior gently, without naming real children or blaming."
    ]
  }
},
{
  collection: "rag_humor_metaphors",
  docId: "humor_and_nonsense_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (humor and nonsense metaphors)",
    version: 1,
    updatedAt: now,
    guidance: [
      "Humor/nonsense metaphors can safely mirror disruption and guide back to calm relief.",
      "Use humor to regulate energy, not to mock the child or make them feel wrong.",
      "Avoid sarcasm or shame-based jokes."
    ]
  }
},
{
  collection: "rag_metaphor_brainstorming",
  docId: "lateral_thinking_workflow_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (lateral thinking / mind-maps)",
    version: 1,
    updatedAt: now,
    workflow: [
      "List the behavior and its qualities (sound/impact/speed/avoidance).",
      "Brainstorm many metaphor candidates (animals/objects/places) that share the same quality.",
      "Pick 1 central metaphor and build obstacles/helpers around it.",
      "If stuck: change setting (ocean/forest/city) or switch to reverse metaphor strategy.",
      "Keep story safe and age-appropriate; high-risk topics require specialist-only handling."
    ]
  }
},
{
  collection: "rag_metaphor_safety",
  docId: "metaphor_caution_rules_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (caution in choosing metaphors)",
    version: 1,
    updatedAt: now,
    rules: [
      "Do not choose metaphors that are likely to scare the child or create vivid fear images.",
      "Avoid 'threat' metaphors (biting, attacking, hidden creatures) for very young ages unless strongly transformed and softened.",
      "If a metaphor could trigger nightmares or body-related fear (e.g., something living inside the body), do not use it.",
      "Avoid metaphors that unintentionally increase the undesired behavior (e.g., making the child seek the fairy inside the piano).",
      "Prefer gentle, calming, and 'transformative' metaphors that lead toward safety and balance.",
      "If storytelling is not appropriate for the goal, choose alternative strategies (song, routine, role modeling)."
    ]
  }
},
{
  collection: "rag_metaphor_risk_patterns",
  docId: "metaphor_backfire_patterns_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (metaphor backfire examples abstracted)",
    version: 1,
    updatedAt: now,
    riskPatterns: [
      {
        riskType: "fear_scare",
        description: "Metaphor creates scary mental images and increases anxiety.",
        avoidSignals: ["bite", "attack", "come out at night", "hidden creatures", "punishment vibe"],
        saferAlternatives: ["washing/cleansing flow", "gentle transformation", "comfort + routine"]
      },
      {
        riskType: "body_intrusion",
        description: "Metaphor suggests something living inside the body and may trigger nightmares.",
        avoidSignals: ["living in ear/body", "creature inside you", "cannot control"],
        saferAlternatives: ["nature metaphors outside the body (leaf on tree, autumn falling)"]
      },
      {
        riskType: "attention_backfire",
        description: "Metaphor increases distraction or reinforces the undesired habit.",
        avoidSignals: ["child keeps checking/searching for the metaphor character/object"],
        saferAlternatives: ["invisible helper metaphors", "focus anchors", "simple routines"]
      }
    ]
  }
},
{
  collection: "rag_intervention_selector",
  docId: "when_not_to_use_story_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (story not always appropriate)",
    version: 1,
    updatedAt: now,
    guidance: [
      "If the story is likely to scare the child, do not use a story approach.",
      "If the goal is discipline-like training (e.g., long practice), consider age and ethics before using story persuasion.",
      "For toddlers/very young children, prefer songs, playful routines, and parent role modeling when appropriate."
    ]
  }
},
{
  collection: "rag_story_journey",
  docId: "tension_principles_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (Building tension – the journey)",
    version: 1,
    updatedAt: now,
    principles: [
      "The story journey builds tension that makes the resolution land emotionally (like pulling back a bowstring before releasing the arrow).",
      "The journey guides the listener into the imbalance and back out into balance.",
      "Younger children need simple events and low tension; older children can handle more complex tension and events.",
      "Obstacle metaphors primarily build tension; helping metaphors primarily enable resolution."
    ]
  }
},
{
  collection: "rag_story_journey",
  docId: "movement_types_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (linear vs circular movement)",
    version: 1,
    updatedAt: now,
    movementTypes: [
      {
        type: "linear",
        definition: "Behavior starts out of balance and gradually comes into balance.",
        useWhen: ["confidence building", "skill-building", "gradual growth stories"]
      },
      {
        type: "circular",
        definition: "Behavior begins in balance, falls out of balance, then returns to balance.",
        useWhen: ["relapse/temptation arcs", "returning to a strength that was lost"]
      }
    ],
    instruction: "Choose one movement type before drafting pages to keep the journey coherent."
  }
},
{
  collection: "rag_story_journey",
  docId: "story_bones_method_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (bones then flesh)",
    version: 1,
    updatedAt: now,
    method: [
      "Write the 'bones' first: a short sequence summary of the main beats.",
      "Only after the bones work, add the 'flesh': sensory details, dialogue, imagery.",
      "Starting with full wording too early makes you less flexible and slows iteration.",
      "Sometimes a clear image can lead the bones; but the bones-first method is the default."
    ],
    deliverableTemplate: {
      bones: [
        "Beat 1: Setup (balance/character context)",
        "Beat 2: Imbalance emerges",
        "Beat 3: Tension increases via obstacle metaphors",
        "Beat 4: Turning point / small attempt",
        "Beat 5: Setback or task",
        "Beat 6: Helping metaphor appears",
        "Beat 7: Practice/effort",
        "Beat 8: Resolution (affirming, non-punitive)",
        "Beat 9: Reflection (sense of safety/strength)"
      ]
    }
  }
},
{
  collection: "rag_age_complexity_rules",
  docId: "journey_complexity_by_age_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (Different story journeys for different ages)",
    version: 1,
    updatedAt: now,
    rules: [
      {
        ageGroup: "3-4",
        guidance: [
          "Use simple journeys with small tension.",
          "Build tension primarily via repetition (same experience, rhyme, or chant repeated).",
          "Keep events few and clear; resolution should arrive gently."
        ],
        recommendedDevices: ["repetition", "rhyme/chant motif", "simple obstacle + simple helper"]
      },
      {
        ageGroup: "4-6",
        guidance: [
          "Use simple events but allow a clearer arc into imbalance and out.",
          "Repetition still works well; add one mild turning point.",
          "Keep obstacle metaphors non-scary and helpers warm/supportive."
        ],
        recommendedDevices: ["repetition", "one turning point", "light cumulative pattern"]
      },
      {
        ageGroup: "7-9",
        guidance: [
          "Use a more involved journey with a small quest or tasks.",
          "Include turning points and at least one setback (realistic practice).",
          "Use helpers as tools/gifts/support that enable the child to progress."
        ],
        recommendedDevices: ["quest/tasks", "turning points", "setback", "helpers as tools"]
      },
      {
        ageGroup: "10+",
        guidance: [
          "Journeys can be more complex and layered.",
          "Multiple tasks/setbacks are okay as long as emotional safety is maintained.",
          "Resolution should still be affirming and hopeful."
        ],
        recommendedDevices: ["multi-step quest", "multiple turning points", "deeper reflection"]
      }
    ]
  }
},
{
  collection: "rag_story_devices",
  docId: "tension_building_devices_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (repetition, cumulative stories, quests)",
    version: 1,
    updatedAt: now,
    devices: [
      {
        device: "repetition_motif",
        purpose: "Build gentle tension and anticipation through repeated rhyme/phrase/action.",
        bestForAges: ["3-4", "4-6"],
        notes: ["Repetition should increase longing for a positive solution."]
      },
      {
        device: "cumulative_structure",
        purpose: "Build tension by adding characters/events one-by-one around a single expandable image.",
        bestForAges: ["3-4", "4-6"],
        notes: ["Without the build-up, the incident feels insignificant."]
      },
      {
        device: "quest_with_tasks",
        purpose: "Build resilience through a meaningful journey with tasks, tools, and turning points.",
        bestForAges: ["7-9", "10+"],
        notes: ["Avoid granting wishes too quickly; challenges make the resolution meaningful."]
      },
      {
        device: "turning_points_and_setbacks",
        purpose: "Make the journey believable and practice-based (growth takes time).",
        bestForAges: ["7-9", "10+"],
        notes: ["Setbacks must stay emotionally safe and non-shaming."]
      }
    ]
  }
},
{
  collection: "rag_obstacle_helper_integration",
  docId: "journey_obstacle_helper_mapping_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (obstacle metaphors build tension; helping metaphors resolve)",
    version: 1,
    updatedAt: now,
    guidance: [
      "Use obstacle metaphors to pull the story deeper into the imbalance (tension).",
      "Introduce helping metaphors at turning points to open a path back toward balance.",
      "Balance obstacle intensity with age appropriateness (avoid fear-inducing obstacles for young ages).",
      "The resolution should be achieved through helpers, support, and effort—not punishment."
    ],
    pagePlanningHint: [
      "Pages 1-2: setup + early imbalance",
      "Pages 3-5: obstacle metaphors increase tension (1-2 beats)",
      "Page 6: turning point (helper appears or tool given)",
      "Page 7: practice + small progress",
      "Page 8: affirming resolution + reflection"
    ]
  }
},
{
  collection: "rag_props",
  docId: "props_value_and_usage_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (value of props)",
    version: 1,
    updatedAt: now,
    principles: [
      "Some stories gain extra therapeutic strength when paired with a simple prop (toy/puppet/object), but many stories work without props.",
      "Props can deepen comprehension and help the story 'go in' through visual + play integration.",
      "Props can become gentle reminders after the story (wearable, pocket token, costume).",
      "Props should be simple, safe, and non-scary; avoid expensive/consumer-driven assumptions."
    ],
    usageModes: [
      "Gift the prop to accompany the story (token/reminder).",
      "Play with the prop together while storytelling (role modeling).",
      "Use props for group storytelling (puppet show)."
    ]
  }
},
{
  collection: "rag_props",
  docId: "prop_ideas_library_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (examples + inspiration: handmade + nature)",
    version: 1,
    updatedAt: now,
    handmadeIdeas: [
      "Simple crown / badge / shield as a 'strength' or 'protection' symbol (class/group stories).",
      "Stitched felt figure (small animal/object from story) as a calm reminder token.",
      "Paper/card key, small charm, or bracelet that represents the helping metaphor."
    ],
    natureIdeas: [
      "Shells, nuts, acorns, feathers, driftwood, seedpods as story characters or tokens.",
      "A shiny stone/crystal used as a 'good luck' or calming anchor.",
      "Nature textures/patterns as inspiration for scenes and metaphors."
    ],
    safetyNotes: [
      "No frightening objects; nothing that triggers fear images.",
      "Keep props age-safe (no choking hazards for young children)."
    ]
  }
},
{
  collection: "rag_ethics",
  docId: "healing_vs_manipulative_gate_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (question of ethics)",
    version: 1,
    updatedAt: now,
    definitions: {
      healing: "Restore balance/wholeness where something is genuinely out of balance.",
      manipulative: "Using story to control/influence for an adult's convenience, not the child's wellbeing."
    },
    preflightQuestions: [
      "Is something truly out of balance for the child (emotion/behavior/situation), or is the adult trying to optimize convenience?",
      "Is the child developmentally ready for the change being targeted (age/stage readiness)?",
      "Does the story encourage core values (courage, empathy, resilience, honesty, care) rather than compliance?",
      "Could this story backfire by increasing fear, guilt, or pressure?"
    ],
    guardrails: [
      "Avoid stories that push a child to 'skip' normal development stages (e.g., demanding maturity too early).",
      "Prefer affirming, non-shaming arcs that invite the child's own motivation to change.",
      "If goal is adult convenience (e.g., keep child away), do not use a therapeutic story approach."
    ]
  }
},
{
  collection: "rag_story_adaptation",
  docId: "adapt_existing_story_integrity_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (adjusting stories to different situations)",
    version: 1,
    updatedAt: now,
    principles: [
      "Adapting an existing story can be an effective shortcut and a stepping stone to original writing.",
      "Use 'poetic license' carefully: adapt details to fit the child's context while preserving story integrity.",
      "If swapping characters/metaphors, choose equivalents that maintain the same function (e.g., similar environment/feature)."
    ],
    adaptationChecklist: [
      "Keep the original therapeutic arc (imbalance → journey → resolution) intact.",
      "Preserve the role of obstacle metaphors and helping metaphors; only replace with functional equivalents.",
      "Ensure the adaptation stays age-appropriate and culturally/language appropriate.",
      "Record what was changed and why (for specialist audit trail)."
    ],
    examplesAbstracted: [
      "Change main character to a more familiar equivalent for the child (if it preserves metaphor meaning).",
      "Reuse a story for a related situation by adjusting a few beats while keeping the same resolution logic."
    ]
  }
},
{
  collection: "rag_specialist_review_gates",
  docId: "phase4_ethics_and_props_checks_v1",
  data: {
    source: "Derived from Therapeutic Storytelling – Susan Perrow (ethics + props sections)",
    version: 1,
    updatedAt: now,
    specialistChecklist: [
      "Ethics check passed: story addresses a real imbalance, not adult convenience.",
      "Developmental readiness check passed for targeted change.",
      "Resolution is affirming (no guilt/shame), and encourages core values.",
      "If props are suggested: they are optional, safe, simple, and reinforce the helping metaphor."
    ],
    outputRequirements: [
      "If ethics check fails: recommend non-story approach or revise goal framing.",
      "If prop is included: include a short 'Prop Suggestion' field (optional) for parents/teachers."
    ]
  }
},
{
  collection: "rag_theme_patterns",
  docId: "anxiety_global_crisis_externalization_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (The Shadow Giant – anxious/insecure/fearful theme)",
    version: 1,
    updatedAt: now,
    topicTags: ["anxiety", "insecurity", "fearful", "collective_safety", "community_support"],
    intent: [
      "Help children process big, scary events indirectly (disasters, instability) without graphic detail.",
      "Encourage discussion and reflection through imaginative distance (metaphor).",
      "Move from helplessness → shared agency and caring."
    ],
    coreMechanics: [
      "Externalize the fear into a non-human symbolic force (a 'shadow' / dark presence) instead of blaming a person.",
      "Use a wise guide/leader figure who listens to many perspectives before proposing action.",
      "Use helpers distributed across the world (or community) to show 'you are not alone'.",
      "Resolution is collective: caring + cooperation gradually reduce the fear (not instant magic)."
    ],
    safetyNotes: [
      "Avoid vivid disaster imagery for young ages; keep details symbolic and non-graphic.",
      "Maintain hope and empowerment; do not end in helplessness.",
      "Keep the protagonist a human child when writing personalized stories; symbolic forces and animals may appear as side elements."
    ]
  }
},
{
  collection: "rag_example_deconstructions",
  docId: "shadow_giant_obstacle_helper_map_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (The Shadow Giant – deconstruction)",
    version: 1,
    updatedAt: now,
    ageFit: ["9-12", "13-16"], // you can adjust based on your product
    movementType: "linear_or_circular_ok",
    storyBones: [
      "A large unseen threat causes widespread worry and uncertainty (symbolic).",
      "A wise leader gathers helpers and listens to many accounts.",
      "Helpers go on a quest to understand the threat's weakness.",
      "Discovery reveals the 'weakness' as an internal value problem (selfishness/greed).",
      "A counter-message is shared widely: strength through caring and togetherness.",
      "Hopeful ending: change is gradual, sustained by reminders/messages."
    ],
    obstacleMetaphors: [
      "Unseen shadow/dark force (fear without a face)",
      "Pollution/fog/cracks (symbolic consequences, not graphic trauma)",
      "Long quest duration (patience + persistence)"
    ],
    helpingMetaphors: [
      "Wise leader/guide who listens and organizes",
      "Messenger helpers spreading a protective message",
      "Small ‘tokens/messages’ that remind children of safety/support"
    ],
    tensionDevices: [
      "Quest with delayed success (days/weeks/months pass)",
      "Repetition/chanting motif (simple repeated line, not scary)",
      "Many helpers from different places (scale + unity)"
    ],
    resolutionPrinciple: "Collective caring counters isolation and fear; progress is realistic and gradual."
  }
},
{
  collection: "rag_theme_patterns",
  docId: "grief_tragedy_resilience_transformation_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (The Rose and the Thorn – resilience after tragedy)",
    version: 1,
    updatedAt: now,
    topicTags: ["loss", "grief", "trauma", "hope", "resilience"],
    intent: [
      "Acknowledge that bad events can happen (without graphic details).",
      "Offer meaning-making and hope: something new can grow after loss.",
      "Avoid false reassurance ('it never happens') or magical reversal."
    ],
    coreMechanics: [
      "A symbol of beauty/safety is harmed by a sharp intrusive force (symbolic 'thorn').",
      "The story allows sadness/mourning (emotional honesty).",
      "Transformation: many new sources of beauty/hope appear after loss (renewal).",
      "The resolution lifts the listener to a higher perspective (growth, continuity)."
    ],
    safetyNotes: [
      "Avoid explicit violence; keep it symbolic.",
      "Do not imply guilt/blame on the child.",
      "End with hope and warmth, especially for younger listeners."
    ]
  }
},
{
  collection: "rag_example_deconstructions",
  docId: "rose_thorn_story_map_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (The Rose and the Thorn – deconstruction)",
    version: 1,
    updatedAt: now,
    ageFit: ["9-12", "13-16"],
    movementType: "circular",
    storyBones: [
      "A safe, beautiful situation is established.",
      "A hidden sharp force emerges and causes loss (symbolic).",
      "Characters mourn and feel the weight of change.",
      "A new morning/clearing arrives (shift in emotional weather).",
      "Many new symbols of life/hope appear where loss occurred.",
      "Resolution: hope, variety, renewal, community gratitude."
    ],
    obstacleMetaphors: [
      "Hidden thorn (intrusion/attack symbol)",
      "Fog/heaviness (sadness period)"
    ],
    helpingMetaphors: [
      "New growth (renewal)",
      "Morning/clearing (emotional transition)",
      "Many colors/variety (life continues, not identical replacement)"
    ],
    tensionDevices: [
      "Slow build-up of an unseen problem",
      "Sudden change event (symbolic)",
      "Contrast between night/fog and morning/clarity"
    ],
    resolutionPrinciple: "Loss is acknowledged; hope emerges through renewal and meaning, not denial."
  }
}, 
{
  collection: "rag_story_devices",
  docId: "message_motif_chant_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (journey + repeated message motif in examples)",
    version: 1,
    updatedAt: now,
    device: "message_motif",
    purpose: "A short repeated phrase that supports emotional memory and carries the therapeutic core.",
    rules: [
      "Keep it non-scary and non-shaming.",
      "Use it 2–4 times across the story (not every page).",
      "It should point toward values (caring, courage, togetherness) rather than commands.",
      "Avoid moralizing tone; make it feel like encouragement."
    ],
    exampleTopics: ["anxiety", "fear", "community_support", "resilience"]
  }
},
{
  collection: "rag_delivery_methods",
  docId: "repetition_and_puppet_show_for_trauma_anxiety_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (The Ants and the Storm – storytelling module)",
    version: 1,
    platformConstraints: {
      childCharacterMustBeHuman: true,
      animalsAllowedAsSideCharacters: true,
      note: "This pattern uses animal imagery in the source. In our platform, keep the child protagonist human; use animals as supporting metaphors/characters only.",
    },
    updatedAt: now,
    method: "repeat_told_story_with_props",
    whyItWorks: [
      "Very young children benefit from repetition to rebuild safety and predictability after a frightening event.",
      "A simple puppet show format supports attention, containment, and emotional processing.",
      "Repetition reduces anxiety by making the narrative familiar and controllable."
    ],
    usageGuidelines: [
      "Keep the journey simple, with a clear helper and a safe resolution.",
      "Avoid graphic detail; use metaphor + safe setting.",
      "Repeat the same story multiple times over days/weeks if needed."
    ],
    bestForAges: ["3-4", "4-6"]
  }
},
{
  collection: "rag_theme_patterns",
  docId: "young_child_disaster_reassurance_rebuild_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (The Ants and the Storm – deconstruction)",
    version: 1,
    updatedAt: now,
    topicTags: ["anxiety", "fearful", "trauma_reassurance", "natural_disaster"],
    intent: [
      "Help young children integrate a scary event through metaphor and safety.",
      "Emphasize protection by caregivers and return to stability.",
      "Reinforce: 'adults help, you are safe, we rebuild together'."
    ],
    storyBones: [
      "Safe home + familiar play setting is established.",
      "A storm/ground shaking disrupts safety (symbolic, non-graphic).",
      "Caregivers anticipate danger and guide children to safety in time.",
      "A helper provides a safe floating/holding place through the night.",
      "Morning comes: shaking stops; rebuilding begins.",
      "Life resumes with familiar play + calm."
    ],
    obstacleMetaphors: ["storm", "shaking ground", "cracks (symbolic)"],
    helpingMetaphors: ["prepared caregivers", "safe boats/shelter", "lullaby/soothing rhythm", "trees/nature helpers"],
    safetyNotes: [
      "Avoid vivid destruction imagery for ages 3–6.",
      "Keep the threat brief; the majority of pages should communicate safety and care.",
      "Resolution should be complete and reassuring for young ages."
    ]
  }
},
{
  collection: "rag_theme_patterns",
  docId: "reframe_after_flood_water_fear_and_community_hope_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (The Sparkling River – deconstruction)",
    version: 1,
    updatedAt: now,
    topicTags: ["fear", "anxiety", "disaster_recovery", "cognitive_reframe", "community_support"],
    intent: [
      "Help a child reframe a fearful association (e.g., 'water is bad') after floods.",
      "Normalize that a familiar thing can change temporarily and become safe again.",
      "Highlight hope through human kindness and support during recovery."
    ],
    coreMechanics: [
      "Contrast: the same element (river/water) can be calm/sparkling OR muddy/swollen depending on conditions.",
      "Recovery is gradual (months), which normalizes time-to-heal.",
      "Introduce an emotional ‘sparkle’ not in the river, but in helpers’ eyes (hope through community)."
    ],
    storyBones: [
      "Establish love/beauty of the river (safe baseline).",
      "Seasonal change occurs but returns to normal (predictability).",
      "Extreme event disrupts (flood) and causes displacement/cleanup (non-graphic).",
      "Long recovery normalizes slow healing.",
      "Reframe: 'sparkle' can also mean kindness and helping hands.",
      "Return of safety/beauty with a hopeful memory."
    ],
    safetyNotes: [
      "Avoid fear-inducing details; keep focus on hope and rebuilding.",
      "Make the message: water can be safe again; the child can feel safe again."
    ]
  }
},
{
  collection: "rag_theme_patterns",
  docId: "fear_trigger_avoidance_to_agency_with_tool_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (The Golden Pipe – deconstruction)",
    version: 1,
    updatedAt: now,
    topicTags: ["fear", "night_fear", "avoidance", "safety_tool", "coping_skill"],
    intent: [
      "Address a new fear after a triggering experience (e.g., scary visit).",
      "Transform avoidance into safe re-engagement using a calming tool.",
      "Give the child an internalizable skill (learn the tool) instead of relying only on adults."
    ],
    storyBones: [
      "Child has a safe joyful routine (baseline).",
      "A frightening intruder/trigger appears and disrupts safety (brief).",
      "Adults remove the threat, but fear/avoidance remains.",
      "A trusted elder introduces a calming, beautiful cue (music/tool) that signals safety.",
      "Child re-enters the feared space gradually, supported.",
      "Child learns the tool and gains a lasting way to call back safety/joy."
    ],
    obstacleMetaphors: ["intruder in safe place (symbolic)", "avoidance/withdrawal"],
    helpingMetaphors: ["elder guide", "music as regulator", "learnable tool/skill"],
    transferToChild: [
      "End with the child learning the coping tool (ownership + agency)."
    ],
    safetyNotes: [
      "Keep the scary element short; do not dwell on predator imagery for young ages.",
      "Do not imply the child is weak; emphasize recovery and capability."
    ]
  }
},
{
  collection: "rag_character_archetypes",
  docId: "elder_helper_archetype_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (multiple stories: teacher/parent/grandparent guides)",
    version: 1,
    updatedAt: now,
    archetype: "trusted_elder_helper",
    functions: [
      "Provides calm co-regulation (voice, rhythm, ritual).",
      "Introduces a tool/skill (breath, song, object, routine).",
      "Models safety and gradual re-engagement."
    ],
    doNot: [
      "Do not shame, moralize, or force exposure.",
      "Do not invalidate fear."
    ]
  }
},
{
  collection: "rag_theme_patterns",
  docId: "school_transition_separation_anxiety_age3_5_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (The Star Child’s Journey – use case: first weeks of school year)",
    version: 1,
    updatedAt: now,
    topicTags: ["starting_school", "separation_anxiety", "new_environment", "night_anxiety"],
    targetAges: ["3-5"],
    intent: [
      "Soothe anxiety about new places (school/kindergarten) using a safe, guided ‘journey’.",
      "Support bedtime reassurance and reduce nightmares through comforting imagery + repetition."
    ],
    storyBones: [
      "Child is safe and loved at home (strong attachment baseline).",
      "Child feels curiosity + worry about a new ‘world’ (school).",
      "Caregivers say: not yet → then later: you are ready (developmental readiness).",
      "Caregivers give supportive ‘gifts’ (tools/comfort objects) for day + night.",
      "A gentle helper guides transitions (morning/day cycles).",
      "Child arrives and finds peers/friends and joins play safely."
    ],
    safetyNotes: [
      "Keep the child character human (no animal-child).",
      "Use symbolic helpers/objects freely (boats, sails, shells, light) without making the child an animal.",
      "Tone: soothing, reassuring, predictable; happy resolution is required."
    ]
  }
},
{
  collection: "rag_story_devices",
  docId: "transitional_object_and_safety_tool_from_caregiver_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (Star Child’s Journey – caregiver gifts as support)",
    version: 1,
    updatedAt: now,
    device: "caregiver_gift_transitional_support",
    purpose: [
      "Externalize safety into a concrete object the child can imagine holding.",
      "Bridge day/night and home/school transitions."
    ],
    rules: [
      "Gift should be soft/comforting OR guiding/protective (not magical punishment).",
      "Reinforce: caregiver love travels with the child.",
      "Connect the object to coping: breathing, grounding, a short mantra, a small routine."
    ],
    examplesNonCopyright: [
      "comfort object for sleep",
      "guiding symbol for storms/dark moments",
      "morning helper / bedtime helper framing"
    ]
  }
},
{
  collection: "rag_theme_patterns",
  docId: "bedtime_anxiety_soothing_quest_song_age4_8_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (The Song of the Seashell – bedtime story for anxious children)",
    version: 1,
    platformConstraints: {
      childCharacterMustBeHuman: true,
      animalsAllowedAsSideCharacters: true,
      note: "This pattern uses animal imagery in the source. In our platform, keep the child protagonist human; use animals as supporting metaphors/characters only.",
    },
    updatedAt: now,
    topicTags: ["bedtime_anxiety", "night_fear", "soothing_rhythm", "safe_guidance"],
    targetAges: ["4-8"],
    intent: [
      "Reduce night fear with a calm, rhythmic journey that leads to warmth/safety.",
      "Use a gentle guiding cue (a ‘song’/sound) to model self-soothing and orientation."
    ],
    coreMechanics: [
      "A difficult environment (cold/dark) motivates a search for warmth/safety.",
      "A wise guide provides a mission + then a guiding object/cue.",
      "The child/listener learns: ‘follow the soft cue’ through uncertainty.",
      "Resolution is a safe, warm place; tension is contained and not graphic."
    ],
    safetyNotes: [
      "Avoid scary sea-depth descriptions for younger kids; keep ‘deep/dark’ brief and neutral.",
      "End in warmth, safety, and rest."
    ]
  }
},
{
  collection: "rag_theme_patterns",
  docId: "farewell_friends_change_beehive_age4_6_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (The Bees by Silviah Njagi – farewell / friends leaving)",
    version: 1,
    platformConstraints: {
      childCharacterMustBeHuman: true,
      animalsAllowedAsSideCharacters: true,
      note: "The source uses bees as the main metaphor. In our platform, keep the child protagonist human; bees can appear as side characters (a classroom story, drawing, or imagination scene) to carry the metaphor.",
    },
    updatedAt: now,
    topicTags: ["friend_leaving", "transition", "change", "separation", "school", "sadness"],
    targetAges: ["4-6"],
    intent: [
      "Help children cope when close friends move away or leave school.",
      "Normalize sadness and uncertainty while preserving hope and continuity.",
      "Encourage openness to new friendships without dismissing the old ones.",
    ],
    recommendedMetaphor: {
      coreImage: "A hive where some bees travel to help other hives, and new bees arrive in time.",
      obstacleMetaphors: ["worry that the hive will become empty", "nights of crying / fear of being alone"],
      helpingMetaphors: ["a caring guide/fairy promise of renewal", "community routines that remain steady"],
      resolutionShift: "From fear of emptiness → trust in continuity and new connections (without guilt).",
    },
    journeyDesign: {
      movementType: "circular",
      tensionBuilder: [
        "Repetition rhyme/motif to build safety and predictability.",
        "Show bees leaving gradually, then new bees arriving, maintaining the hive’s ‘humming’ life.",
      ],
      motifExample: "A short repeated verse about being a ‘busy hive’ can be used as a soothing refrain.",
    },
    writingGuidance: [
      "Validate the child’s sadness: missing friends is normal.",
      "Do not shame the child for feeling upset, and do not rush to ‘replace’ friends.",
      "End with hope and belonging: community remains, new friends can come, and memories stay.",
      "Optionally include a gentle ritual/prop (e.g., a ‘friendship token’ or drawing) to carry the message.",
    ],
    dontDo: [
      "Avoid promises like ‘you will forget them soon’ or ‘you will have a better friend’.",
      "Avoid guilt language like ‘don’t be selfish’ or ‘you should be happy for them’.",
    ],
  },
},

{
  collection: "rag_story_devices",
  docId: "soothing_refrain_lullaby_v1",
  data: {
    source: "Therapeutic Storytelling – Susan Perrow (multiple: Star Child + Seashell + Bees use refrains)",
    version: 1,
    updatedAt: now,
    device: "refrain_or_lullaby",
    purpose: [
      "Build predictability and emotional regulation.",
      "Create a memorable coping phrase without moralizing."
    ],
    rules: [
      "Repeat 2–4 times across the story (not every page).",
      "Must be gentle, not commanding.",
      "Use simple language and calm rhythm."
    ]
  }
},
{
  collection: "rag_theme_patterns",
  docId: "friends_leaving_farewell_continuity_new_friends_v1",
  data: {
    source: "Therapeutic Storytelling – Silviah Njagi story (Bees – used for children distressed about friends moving away)",
    version: 1,
    updatedAt: now,
    topicTags: ["farewell", "friends_moving", "loss", "change", "new_belonging"],
    intent: [
      "Help child accept separation without feeling abandoned.",
      "Create continuity: the community remains, roles shift, new friends can arrive.",
      "Reduce sleep disruption and repetitive worry thoughts."
    ],
    storyBones: [
      "A close community is established (belonging).",
      "Some members leave (change triggers worry).",
      "A trusted helper explains meaning: leaving can be part of helping/growing.",
      "A promise of continuity: when someone leaves, others can join; you won’t be alone.",
      "Child feels sad AND hopeful; ends with openness to new friendships."
    ],
    safetyNotes: [
      "Validate sadness (don’t rush to ‘be happy’).",
      "No guilt or blame for missing friends.",
      "Keep resolution hopeful and realistic."
    ]
  }
},
{
  collection: "rag_style_policies",
  docId: "character_policy_no_animal_child_v1",
  data: {
    source: "Product rule (platform policy)",
    version: 1,
    updatedAt: now,
    policy: {
      childMustBeHuman: true,
      animalsAllowed: "side_characters_only",
      notes: [
        "Metaphors can use animals/objects as obstacles/helpers.",
        "Never describe {{child_name}} as an animal or non-human creature."
      ]
    }
  }
},

    // ─────────────────────────────────────────────────────────────
    // NEW: Story patterns & examples from the book (Rosella / Boat & Dolphin / Not-So-Perfect House)
    // Note: When generating personalized stories in your app, keep the CHILD as human.
    // Animals are allowed as SIDE characters or metaphors, not as the child protagonist.
    // ─────────────────────────────────────────────────────────────

    {
      collection: "rag_metaphor_selection",
      docId: "metaphor_real_world_coherence_v1",
      data: {
        title: "Metaphor coherence and believability",
        summary:
          "Choose metaphors that still make sense in the real-world logic of the story; if the metaphor breaks basic plausibility, it can break immersion and reduce therapeutic impact.",
        do: [
          "Pick an animal/object metaphor that matches the behavior quality AND fits the story context (what the character would realistically do).",
          "If you adapt a story, adjust the metaphor if it conflicts with basic knowledge (e.g., food, habitat, abilities).",
          "Keep the internal rules consistent across the journey (if the helper is a guide, make their guidance consistent).",
        ],
        avoid: [
          "Metaphors that accidentally confuse or distract the child (e.g., the child gets stuck on the literal detail).",
          "Animals/objects doing things that feel 'wrong' for the image you chose, unless the story is clearly nonsense-humor on purpose.",
        ],
        exampleNote:
          "In one workshop story, an owl metaphor was changed to a rosella because owls don't eat fruit—small coherence fixes like this keep the story believable.",
      },
    },

    {
      collection: "rag_theme_patterns",
      docId: "independence_anxiety_hovering_parent_v1",
      data: {
        title: "Independence anxiety + over-helping caregiver",
        outOfBalance:
          "Child resists doing simple tasks alone ('I need it now'), and caregiver hovers/does everything, reinforcing dependence.",
        therapeuticAim:
          "Gently invite small independent action, reduce hovering, and create a positive experience of 'I can do it' without shame.",
        targetAges: ["4-6"],
        movementType: "linear_or_circular",
        keyMoves: [
          "Use a repeated refrain for the stuck pattern (child’s resistant phrase).",
          "Introduce an inviting peer/helper that models independence without lecturing.",
          "Create a small, safe turning point where the child chooses to try (not forced).",
          "Reward with a warm, satisfying outcome and caregiver relief (harmony restored).",
        ],
        recommendedDevices: ["repetition_motif", "peer_invitation", "gentle_surprise", "affirming_resolution"],
        caution: [
          "Do not moralize ('you're lazy') or induce guilt.",
          "Keep the challenge age-appropriate and the win small-but-real.",
        ],
        noteForYourPlatform:
          "If you like the 'bird and berries' metaphor, keep the child human and make the animal a SIDE friend/guide, or shift the metaphor to an object (e.g., 'strawberry map', 'tiny flying kite').",
      },
    },

    {
      collection: "rag_theme_patterns",
      docId: "separation_anxiety_dropoff_safe_return_v1",
      data: {
        title: "Separation anxiety at school drop-off",
        outOfBalance:
          "Child struggles to separate from parents; fear of leaving the 'safe harbor' and worry about return.",
        therapeuticAim:
          "Build trust in a safe departure + reliable return, and internalize a 'guide' that stays with the child emotionally.",
        targetAges: ["4-6", "4-8"],
        movementType: "circular",
        keyMoves: [
          "Start in safety (home/harbor).",
          "Name the wish for adventure + the fear (without pressure).",
          "Introduce a guiding helper that promises: 'I will lead you out and back.'",
          "Show a successful day journey and a calm return (repeatable).",
        ],
        propsIdea:
          "A small pocket prop (felt dolphin / charm) as a transitional object that 'stays with the child' during the day.",
        recommendedDevices: ["helper_guide", "safe_return", "pocket_prop", "travel_song_optional"],
        caution: ["Avoid scary images; keep tone soothing and predictable."],
        noteForYourPlatform:
          "Use an animal as a SIDE guide (dolphin) while the child is human. The prop can be customized (color, small charm) for personalization.",
      },
    },

    {
      collection: "rag_theme_patterns",
      docId: "perfectionism_good_enough_playful_chaos_v1",
      data: {
        title: "Perfectionism + anxiety (good-enough restoration)",
        outOfBalance:
          "Rigid perfectionism causes worry, constant checking, and poor sleep; small 'imperfections' feel threatening.",
        therapeuticAim:
          "Loosen rigidity through a playful disruption, show that 'not perfect' can still be safe/useful, and restore rest/peace.",
        targetAges: ["8-12", "10+"],
        movementType: "circular",
        keyMoves: [
          "Show the rigid perfection routine (song/refrain).",
          "Introduce an unexpected discovery (hidden room/chest) that triggers curiosity.",
          "Escalate into manageable chaos (feathers everywhere) that cannot be controlled by the old strategy.",
          "End with a surprising body-level relief (best sleep) and optionally leave space for the listener to complete the ending.",
        ],
        recommendedDevices: ["humor", "surprise", "manageable_chaos", "open_ended_ending_optional"],
        caution: ["Keep the chaos non-threatening and avoid humiliation."],
      },
    },

    {
      collection: "rag_example_deconstructions",
      docId: "rosella_independence_deconstruction_v1",
      data: {
        title: "Deconstruction: Independence story pattern (Rosella & strawberries)",
        outOfBalance: "Dependence + refusal to act independently; caregiver over-serves needs.",
        obstacleMetaphors: ["stuck-in-nest / 'I need it now' refrain", "missed opportunity if staying stuck"],
        helpingMetaphors: ["peer invitation ('Follow me...')", "rewarding destination (strawberry patch)"],
        journeyNotes: [
          "Repetition of the stuck refrain builds tension.",
          "Peer helper continues forward without arguing; child chooses to follow.",
          "Resolution restores harmony and gives caregiver relief.",
        ],
        resolution: "Child experiences independent success and joy; caregiver’s load decreases without guilt.",
        adaptationNote:
          "For your platform: keep the child human; translate 'nest' to a safe place, and keep animals as side characters if used.",
      },
    },

    {
      collection: "rag_example_deconstructions",
      docId: "boat_dolphin_separation_deconstruction_v1",
      data: {
        title: "Deconstruction: Separation anxiety (Boat & dolphin)",
        outOfBalance: "Fear of leaving safe harbor / separation distress.",
        obstacleMetaphors: ["harbor as safety", "open sea as unknown"],
        helpingMetaphors: ["dolphin guide", "winds helping return"],
        props: ["small felt dolphin in pocket (transitional object)"],
        resolution: "Child internalizes: I can go out and come back; daily repetition strengthens confidence.",
        adaptationNote:
          "Use the animal as a side guide. Add a simple travel song only if it helps the child (don’t overcomplicate).",
      },
    },

    {
      collection: "rag_example_deconstructions",
      docId: "not_so_perfect_house_deconstruction_v1",
      data: {
        title: "Deconstruction: Perfectionism (Not-So-Perfect House)",
        outOfBalance: "Rigid perfection creates anxiety and insomnia.",
        obstacleMetaphors: ["locked chest / obsessive wondering", "feathers as uncontrollable disorder"],
        helpingMetaphors: ["body-level relief via softness/rest", "acceptance of imperfection"],
        journeyNotes: [
          "The perfection strategy fails against the feather chaos.",
          "Humor + overwhelm leads to surrender and rest.",
          "Optional open ending invites child’s own conclusion.",
        ],
        resolution: "Restoration of sleep/relaxation; soft acceptance replaces rigid control.",
      },
    },

    {
      collection: "rag_story_bones_examples",
      docId: "perfectionism_story_bones_v1",
      data: {
        title: "Story bones: Perfectionism (two variants)",
        bones: [
          {
            name: "Not-So-Perfect Car",
            idea:
              "A maker builds a working car from mismatched parts. It isn’t perfect, but it does a meaningful job (rescue / evacuation / helping).",
            message: "Useful beats perfect; good-enough can save the day.",
          },
          {
            name: "Not-So-Perfect Garden",
            idea:
              "A perfectionist gardener learns from a beaver that all shapes can be used to build something strong; rebuilds wall with mixed stones.",
            message: "Flexibility and function matter more than perfection.",
          },
        ],
        note:
          "Use these as 'bones' first, then add 'flesh' (details) after the movement and resolution are clear.",
      },
    },
  ];

  try {
    // Write using deterministic doc ids.
    // Preserve createdAt on existing docs (merge:true would overwrite it if we set createdAt every run).
    for (const d of docs) {
      const ref = db.collection(d.collection).doc(d.docId);
      const snap = await ref.get();

      // Always refresh these timestamps when the seed runs
      const basePayload = {
        ...d.data,
        updatedAt: now,
        seededAt: now,
      };

      if (!snap.exists) {
        await ref.set(
          {
            ...basePayload,
            createdAt: now,
          },
          { merge: true }
        );
        console.log(`  ✓ Created ${d.collection}/${d.docId}`);
      } else {
        await ref.set(basePayload, { merge: true });
        console.log(`  ✓ Updated ${d.collection}/${d.docId}`);
      }
    }

    console.log("\n✅ BOOK-BASED RAG seeding completed successfully!");
    console.log(`Seeded/updated ${docs.length} documents.`);
    console.log("\nSeeded collections:");
    const uniqueCollections = Array.from(new Set(docs.map((x) => x.collection)));
    uniqueCollections.forEach((c) => console.log(`  - ${c}`));
  } catch (error) {
    console.error("❌ Error seeding RAG data:", error);
    process.exit(1);
  }
}

// Run
seedRAG()
  .then(() => {
    console.log("\nSeed script finished.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
