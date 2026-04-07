import path from "path";
import fs from "fs";
import admin from "firebase-admin";

/**
 * Production (e.g. Render): set env `FIREBASE_SERVICE_ACCOUNT_JSON` to the full
 * service account JSON (single line). Do not commit the key file.
 * Local: uses `server/config/serviceAccountKey.json` when the env var is unset.
 */
function loadServiceAccount(): Record<string, unknown> {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (fromEnv && fromEnv.trim()) {
    return JSON.parse(fromEnv) as Record<string, unknown>;
  }

  const serviceAccountPath = path.resolve(
    __dirname,
    "../../config/serviceAccountKey.json"
  );
  return JSON.parse(fs.readFileSync(serviceAccountPath, "utf8")) as Record<
    string,
    unknown
  >;
}

const serviceAccount = loadServiceAccount();

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(
        serviceAccount as admin.ServiceAccount
      ),
    });

    console.log(
      "Firebase initialized - Project:",
      (serviceAccount as { project_id?: string }).project_id
    );
  } else {
    console.log(
      "Firebase already initialized - Project:",
      admin.app().options.projectId
    );
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
  throw error;
}

console.log("🔥 Firebase project:", admin.app().options.projectId);

const firestore = admin.firestore();
const db = firestore;

export { admin, firestore, db };
