import { collection, getDocs } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { db } from "../../../firebase";
import { useLanguage } from "../../../i18n/context/useLanguage";
import type { TopicOption } from "../types";

type RawTopic = { id: string; data: any };

let cachedRawTopics: RawTopic[] | null = null;
let cachedError: Error | null = null;
let cachedPromise: Promise<RawTopic[]> | null = null;

function pickLabel(data: any, lang: "he" | "en" | "ar", id: string): string {
  const candidates =
    lang === "he"
      ? ["nameHe", "name_he", "label_he", "nameHE"]
      : lang === "ar"
        ? ["nameAr", "name_ar", "label_ar", "nameAR"]
        : ["nameEn", "name_en", "label_en", "nameEN"];

  for (const key of candidates) {
    const v = data?.[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }

  const fallbackEn = data?.nameEn ?? data?.name_en ?? data?.label_en;
  if (typeof fallbackEn === "string" && fallbackEn.trim()) return fallbackEn.trim();
  return id;
}

async function loadTopicsRaw(): Promise<RawTopic[]> {
  const snap = await getDocs(collection(db, "topics"));
  return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
}

export function useTopics(): {
  topics: TopicOption[];
  loading: boolean;
  error: Error | null;
} {
  const { language } = useLanguage();
  const [raw, setRaw] = useState<RawTopic[]>(cachedRawTopics ?? []);
  const [loading, setLoading] = useState<boolean>(cachedRawTopics == null && cachedError == null);
  const [error, setError] = useState<Error | null>(cachedError);

  useEffect(() => {
    if (cachedRawTopics) {
      setRaw(cachedRawTopics);
      setLoading(false);
      setError(null);
      return;
    }
    if (cachedError) {
      setRaw([]);
      setLoading(false);
      setError(cachedError);
      return;
    }

    setLoading(true);
    setError(null);

    const p =
      cachedPromise ??
      (cachedPromise = loadTopicsRaw().then(
        (t) => {
          cachedRawTopics = t;
          cachedError = null;
          return t;
        },
        (e) => {
          cachedRawTopics = null;
          cachedError = e instanceof Error ? e : new Error("Failed to load topics");
          throw cachedError;
        }
      ));

    p.then(
      (t) => {
        setRaw(t);
        setLoading(false);
      },
      (e) => {
        setRaw([]);
        setLoading(false);
        setError(e instanceof Error ? e : new Error("Failed to load topics"));
      }
    );
  }, []);

  const topics = useMemo(() => {
    const mapped = raw.map((r) => ({ id: r.id, label: pickLabel(r.data, language, r.id) }));
    mapped.sort((a, b) => a.label.localeCompare(b.label));
    return mapped;
  }, [raw, language]);

  return { topics, loading, error };
}

