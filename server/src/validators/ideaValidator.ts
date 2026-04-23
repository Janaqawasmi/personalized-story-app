export type AgeRange = "3-5" | "6-8" | "9-12";
export type IdeaLanguage = "he" | "en" | "ar";

export type SanitizedIdea = {
  title: string;
  ageRange: AgeRange;
  description: string;
  motivation: string | null;
  contactConsent: boolean;
  language: IdeaLanguage;
};

export type IdeaValidationError = {
  ok: false;
  errorCode: "validation_error";
  field: string;
  message: string;
};

export type IdeaValidationResult =
  | { ok: true; value: SanitizedIdea }
  | IdeaValidationError;

function stripHtmlAndNormalizeNewlines(input: string): string {
  const noTags = input.replace(/<[^>]*>/g, "");
  const trimmed = noTags.trim();
  return trimmed.replace(/\n{3,}/g, "\n\n");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string";
}

export function validateIdeaInput(body: any): IdeaValidationResult {
  const rawTitle = body?.title;
  if (!isNonEmptyString(rawTitle)) {
    return {
      ok: false,
      errorCode: "validation_error",
      field: "title",
      message: "Title is required",
    };
  }
  const title = stripHtmlAndNormalizeNewlines(rawTitle);
  if (title.length < 3 || title.length > 80) {
    return {
      ok: false,
      errorCode: "validation_error",
      field: "title",
      message: "Title must be 3-80 characters",
    };
  }
  if (title.includes("http://") || title.includes("https://")) {
    return {
      ok: false,
      errorCode: "validation_error",
      field: "title",
      message: "Title must not contain links",
    };
  }

  const rawAgeRange = body?.ageRange;
  if (!isNonEmptyString(rawAgeRange)) {
    return {
      ok: false,
      errorCode: "validation_error",
      field: "ageRange",
      message: "Age range is required",
    };
  }
  const ageRange = rawAgeRange.trim() as AgeRange;
  if (ageRange !== "3-5" && ageRange !== "6-8" && ageRange !== "9-12") {
    return {
      ok: false,
      errorCode: "validation_error",
      field: "ageRange",
      message: "Invalid age range",
    };
  }

  const rawDescription = body?.description;
  if (!isNonEmptyString(rawDescription)) {
    return {
      ok: false,
      errorCode: "validation_error",
      field: "description",
      message: "Description is required",
    };
  }
  const description = stripHtmlAndNormalizeNewlines(rawDescription);
  if (description.length < 20 || description.length > 500) {
    return {
      ok: false,
      errorCode: "validation_error",
      field: "description",
      message: "Description must be 20-500 characters",
    };
  }

  const rawMotivation = body?.motivation;
  let motivation: string | null = null;
  if (rawMotivation !== undefined) {
    if (!isNonEmptyString(rawMotivation)) {
      return {
        ok: false,
        errorCode: "validation_error",
        field: "motivation",
        message: "Motivation must be a string",
      };
    }
    const cleaned = stripHtmlAndNormalizeNewlines(rawMotivation);
    motivation = cleaned ? cleaned : null;
    if (motivation !== null && motivation.length > 300) {
      return {
        ok: false,
        errorCode: "validation_error",
        field: "motivation",
        message: "Motivation must be 300 characters or less",
      };
    }
  }

  const rawContactConsent = body?.contactConsent;
  let contactConsent = false;
  if (rawContactConsent !== undefined) {
    if (typeof rawContactConsent !== "boolean") {
      return {
        ok: false,
        errorCode: "validation_error",
        field: "contactConsent",
        message: "Contact consent must be a boolean",
      };
    }
    contactConsent = rawContactConsent;
  }

  const rawLanguage = body?.language;
  if (!isNonEmptyString(rawLanguage)) {
    return {
      ok: false,
      errorCode: "validation_error",
      field: "language",
      message: "Language is required",
    };
  }
  const language = rawLanguage.trim() as IdeaLanguage;
  if (language !== "he" && language !== "en" && language !== "ar") {
    return {
      ok: false,
      errorCode: "validation_error",
      field: "language",
      message: "Invalid language",
    };
  }

  return {
    ok: true,
    value: {
      title,
      ageRange,
      description,
      motivation,
      contactConsent,
      language,
    },
  };
}

