export type AgeRange = "3-5" | "6-8" | "9-12";

export type IdeaFormValues = {
  title: string;
  topicId: string;
  ageRange: AgeRange | "";
  description: string;
  motivation: string;
  contactConsent: boolean;
};

export type SubmitErrorCode =
  | "validation_error"
  | "topic_not_found"
  | "caregiver_not_found"
  | "caregiver_profile_incomplete"
  | "rate_limit"
  | "forbidden"
  | "server_error"
  | "network_error"
  | "unauthenticated";

export type SubmitResult =
  | { ok: true; ideaId: string }
  | {
      ok: false;
      errorCode: SubmitErrorCode;
      field?: string;
      message: string;
    };

export type TopicOption = { id: string; label: string };

