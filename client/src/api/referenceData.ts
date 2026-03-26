import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { ReferenceData } from "../types/referenceData";

function byOrderThenLabel(a: any, b: any): number {
  const orderA = typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
  const orderB = typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;

  const labelA = (a.label_en || a.label_he || a.label_ar || a.id || "").toString();
  const labelB = (b.label_en || b.label_he || b.label_ar || b.id || "").toString();
  return labelA.localeCompare(labelB);
}

export async function fetchSituationsByTopic(topicKey: string) {
  const ref = collection(db, "referenceData", "situations", "items");

  const q = query(
    ref,
    where("active", "==", true),
    where("topicKey", "==", topicKey)
  );

  const snap = await getDocs(q);

  return snap.docs
    .map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }))
    .sort(byOrderThenLabel);
}

export async function fetchReferenceData(): Promise<ReferenceData> {
  const topicsRef = collection(db, "referenceData", "topics", "items");
  const situationsRef = collection(db, "referenceData", "situations", "items");

  const topicsQuery = query(topicsRef, where("active", "==", true));
  const situationsQuery = query(situationsRef, where("active", "==", true));

  const [topicsSnap, situationsSnap] = await Promise.all([
    getDocs(topicsQuery),
    getDocs(situationsQuery),
  ]);

  const topics = topicsSnap.docs
    .map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }))
    .sort(byOrderThenLabel);

  const situations = situationsSnap.docs
    .map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }))
    .sort(byOrderThenLabel);

  return {
    topics,
    situations,
  };
}
