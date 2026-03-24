import { ChildProfile, Gender } from "../shared/types/childProfile";
import { StoryTemplatePage } from "../shared/types/storyTemplate";

// ============================================================================
// Pronoun Sets
// ============================================================================

export interface PronounSet {
  subject: string;
  object: string;
  possessive: string;
}

const PRONOUN_MAPS: Record<"he" | "ar", Record<Gender, PronounSet>> = {
  he: {
    male: {
      subject: "הוא",
      object: "אותו",
      possessive: "שלו",
    },
    female: {
      subject: "היא",
      object: "אותה",
      possessive: "שלה",
    },
  },
  ar: {
    male: {
      subject: "هو",
      object: "ه",
      possessive: "ه",
    },
    female: {
      subject: "هي",
      object: "ها",
      possessive: "ها",
    },
  },
};

// ============================================================================
// Character Description for Image Prompts
// ============================================================================

const CHARACTER_DESCRIPTIONS: Record<Gender, string> = {
  male: "a young boy",
  female: "a young girl",
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Returns the pronoun set for a given gender and language.
 */
export function getPronounSet(gender: Gender, language: "ar" | "he"): PronounSet {
  return PRONOUN_MAPS[language][gender];
}

/**
 * Selects the correct text variant (masculine/feminine) from a page template
 * based on the child's gender.
 */
export function selectTextVariant(page: StoryTemplatePage, gender: Gender): string {
  return gender === "male" ? page.textTemplate.masculine : page.textTemplate.feminine;
}

/**
 * Personalizes a text template by replacing all placeholders with child data
 * and pronoun values for the given language.
 *
 * Supported placeholders:
 *   {{CHILD_NAME}}         → child.firstName
 *   {{PRONOUN_SUBJECT}}    → he/she in the target language
 *   {{PRONOUN_OBJECT}}     → him/her in the target language
 *   {{PRONOUN_POSSESSIVE}} → his/her in the target language
 *   {{DEDICATION_NAME}}    → optional dedication name (empty string if null)
 */
export function personalizeText(
  template: string,
  child: ChildProfile,
  language: "ar" | "he",
  dedicationName?: string | null
): string {
  const pronouns = getPronounSet(child.gender, language);

  let result = template;
  result = result.replace(/\{\{CHILD_NAME\}\}/g, child.firstName);
  result = result.replace(/\{\{PRONOUN_SUBJECT\}\}/g, pronouns.subject);
  result = result.replace(/\{\{PRONOUN_OBJECT\}\}/g, pronouns.object);
  result = result.replace(/\{\{PRONOUN_POSSESSIVE\}\}/g, pronouns.possessive);
  result = result.replace(/\{\{DEDICATION_NAME\}\}/g, dedicationName ?? "");

  return result;
}

/**
 * Builds an image generation prompt from the template's imagePromptTemplate
 * by substituting the {{CHARACTER_DESCRIPTION}} placeholder with
 * a gender-appropriate description and the child's name.
 */
export function buildImagePrompt(
  template: string,
  child: ChildProfile
): string {
  const description = `${CHARACTER_DESCRIPTIONS[child.gender]} named ${child.firstName}`;
  return template.replace(/\{\{CHARACTER_DESCRIPTION\}\}/g, description);
}

// ============================================================================
// Legacy API — backward compatibility with existing specialist controllers
// ============================================================================

/**
 * Legacy personalization function used by the existing specialist-side
 * personalizedStory.controller.ts. Performs simple {{CHILD_NAME}} and
 * gender-based placeholder substitution on all pages of a template.
 *
 * @deprecated Use personalizeText + selectTextVariant for new code
 */
export function personalizeTemplate(
  template: { pages?: Array<{ textTemplate?: { masculine: string; feminine: string } | string; [key: string]: unknown }>; [key: string]: unknown },
  child: { name: string; gender: string }
): { pages: Array<Record<string, unknown>> } {
  const pages = (template.pages ?? []).map((page) => {
    let text: string;
    if (typeof page.textTemplate === "object" && page.textTemplate !== null) {
      text = child.gender === "female"
        ? page.textTemplate.feminine
        : page.textTemplate.masculine;
    } else {
      text = (page.textTemplate as string) ?? "";
    }

    const personalizedText = text.replace(/\{\{CHILD_NAME\}\}/g, child.name);

    return { ...page, personalizedText };
  });

  return { pages };
}
