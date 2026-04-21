import type { IdeaFormValues, SubmitErrorCode, SubmitResult } from "../types";

type ApiErrorBody =
  | {
      success: false;
      errorCode?: string;
      field?: string;
      message?: string;
    }
  | {
      success: false;
      error?: string;
      details?: string;
    };

const KNOWN_ERROR_CODES: SubmitErrorCode[] = [
  "validation_error",
  "topic_not_found",
  "caregiver_not_found",
  "caregiver_profile_incomplete",
  "rate_limit",
  "forbidden",
  "server_error",
  "network_error",
  "unauthenticated",
];

function normalizeErrorCode(code: unknown): SubmitErrorCode {
  if (typeof code !== "string") return "server_error";
  if (KNOWN_ERROR_CODES.includes(code as SubmitErrorCode)) return code as SubmitErrorCode;
  return "server_error";
}

export async function submitIdea(
  values: IdeaFormValues & { language: "he" | "en" | "ar" },
  idToken: string
): Promise<SubmitResult> {
  if (!idToken) {
    return {
      ok: false,
      errorCode: "unauthenticated",
      message: "Not authenticated",
    };
  }

  try {
    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        title: values.title,
        topicId: values.topicId,
        ageRange: values.ageRange,
        description: values.description,
        motivation: values.motivation,
        contactConsent: values.contactConsent,
        language: values.language,
      }),
    });

    const data = (await res.json().catch(() => null)) as
      | { success: true; ideaId: string }
      | ApiErrorBody
      | null;

    if (res.ok && data && (data as any).success === true) {
      return { ok: true, ideaId: (data as any).ideaId };
    }

    const errorCode = normalizeErrorCode((data as any)?.errorCode);
    const field =
      (data as any)?.field && typeof (data as any).field === "string"
        ? ((data as any).field as string)
        : undefined;

    const message =
      (data as any)?.message && typeof (data as any).message === "string"
        ? (data as any).message
        : (data as any)?.error && typeof (data as any).error === "string"
          ? (data as any).error
          : "Request failed";

    return {
      ok: false,
      errorCode: errorCode as any,
      ...(field ? { field } : {}),
      message,
    };
  } catch (err) {
    return { ok: false, errorCode: "network_error", message: "Network error" };
  }
}

