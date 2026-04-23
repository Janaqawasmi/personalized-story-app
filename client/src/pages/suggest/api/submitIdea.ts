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
    return { ok: false, errorCode: "unauthenticated", message: "Not authenticated" };
  }

  const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

  try {
    const res = await fetch(`${API_BASE}/api/ideas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        title: values.title,
        ageRange: values.ageRange,
        description: values.description,
        motivation: values.motivation,
        contactConsent: values.contactConsent,
        language: values.language,
      }),
    });

    const contentType = res.headers.get("content-type") || "";
    let data: any = null;
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      console.error("[submitIdea] Non-JSON response", { status: res.status, text: text.slice(0, 300) });
      return { ok: false, errorCode: "server_error", message: "Server error" };
    }

    if (!res.ok) {
      console.error("[submitIdea] Server rejected", { status: res.status, data });
      const field =
        data?.field && typeof data.field === "string" ? (data.field as string) : undefined;
      const message =
        data?.message && typeof data.message === "string"
          ? (data.message as string)
          : data?.error && typeof data.error === "string"
            ? (data.error as string)
            : "Request failed";
      return {
        ok: false,
        errorCode: normalizeErrorCode(data?.errorCode),
        ...(field ? { field } : {}),
        message,
      };
    }

    if (!data?.success || !data?.ideaId) {
      console.error("[submitIdea] Unexpected success shape", data);
      return { ok: false, errorCode: "server_error", message: "Server error" };
    }

    return { ok: true, ideaId: data.ideaId };
  } catch (err) {
    console.error("[submitIdea] Network/parse failure", err);
    return { ok: false, errorCode: "server_error", message: "Server error" };
  }
}

