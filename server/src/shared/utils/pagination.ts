import type { Query, QueryDocumentSnapshot } from "firebase-admin/firestore";

export interface CursorPage<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Generic Firestore cursor pagination: fetches `limit + 1` docs to detect
 * `hasMore` without a separate count query, optionally resuming after a
 * previous page's last document id via `startAfter`.
 *
 * Generalized from the ad-hoc limit+1/startAfter/hasMore pattern already
 * used in auditTrail.service.ts::getByBriefId — reused by the admin Users
 * and Audit Log list routes instead of re-implementing it per route.
 */
export async function fetchCursorPage<T>(
  baseQuery: Query,
  limit: number,
  cursorDocId: string | undefined,
  mapDoc: (doc: QueryDocumentSnapshot) => T,
): Promise<CursorPage<T>> {
  let q = baseQuery.limit(limit + 1);

  if (cursorDocId) {
    const cursorSnap = await baseQuery.firestore.doc(cursorDocId).get();
    if (cursorSnap.exists) {
      q = q.startAfter(cursorSnap);
    }
  }

  const snap = await q.get();
  const hasMore = snap.docs.length > limit;
  const docs = hasMore ? snap.docs.slice(0, limit) : snap.docs;
  const lastDoc = docs[docs.length - 1];

  const page: CursorPage<T> = {
    items: docs.map(mapDoc),
    hasMore,
  };
  if (hasMore && lastDoc) {
    page.nextCursor = lastDoc.ref.path;
  }
  return page;
}
