import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { ReferenceData } from "../types/referenceData";

export async function fetchSituationsByTopic(topicKey: string) {
  const ref = collection(db, "referenceData", "situations", "items");

  const q = query(
    ref,
    where("active", "==", true),
    where("topicKey", "==", topicKey)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  }));
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

  return {
    topics: topicsSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    })),
    situations: situationsSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    })),
  };
}
