/** Substring in FAILED_PRECONDITION when a composite index exists but is not ready yet. */
const INDEX_BUILDING = "currently building";

function grpcDetails(err: unknown): string {
  if (!err || typeof err !== "object") return "";
  const o = err as { details?: string; message?: string };
  if (typeof o.details === "string") return o.details;
  if (typeof o.message === "string") return o.message;
  return "";
}

export function isFirestoreCompositeIndexBuilding(err: unknown): boolean {
  return grpcDetails(err).includes(INDEX_BUILDING);
}

let lastIndexBuildingLogMs = 0;
const INDEX_BUILDING_LOG_THROTTLE_MS = 60_000;

/** Avoid flooding logs while Firestore finishes building new composite indexes after deploy. */
export function warnThrottledIndexBuilding(source: string): void {
  const now = Date.now();
  if (now - lastIndexBuildingLogMs < INDEX_BUILDING_LOG_THROTTLE_MS) return;
  lastIndexBuildingLogMs = now;
  console.warn(
    `[illustration/worker] ${source}: Firestore index still building (normal after deploy). Jobs will run when indexes are enabled. Firebase console → Firestore → Indexes.`,
  );
}
