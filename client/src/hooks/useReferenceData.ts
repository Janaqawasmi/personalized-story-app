import { useEffect, useState } from "react";
import { fetchReferenceData } from "../api/referenceData";
import { ReferenceData, TopicRef, SituationRef } from "../types/referenceData";

export type ReferenceTopic = TopicRef;
export type ReferenceSituation = SituationRef;

export function useReferenceData() {
  const [data, setData] = useState<ReferenceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferenceData()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}
