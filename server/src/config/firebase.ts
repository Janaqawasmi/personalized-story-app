import path from "path";
import fs from "fs";
import admin from "firebase-admin";

// In Firebase Functions, use default credentials
// In local development, use service account file
let serviceAccount: any = null;
const serviceAccountPath = path.resolve(
  __dirname,
  "../../config/serviceAccountKey.json"
);

// Try to load service account file (only in local dev)
try {
  if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = JSON.parse(
      fs.readFileSync(serviceAccountPath, "utf8")
    );
  }
} catch (error) {
  // Service account file not found - will use default credentials (Functions)
  console.log("Service account file not found, using default credentials");
}

try {
  if (!admin.apps.length) {
    if (serviceAccount) {
      // Local development: use service account file
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log(
        "Firebase initialized (local) - Project:",
        serviceAccount.project_id
      );
    } else {
      // Firebase Functions: use default credentials
      admin.initializeApp();
      console.log("Firebase initialized (Functions) - using default credentials");
    }
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

// Must show real project ID
console.log("🔥 Firebase project:", admin.app().options.projectId);

const firestore = admin.firestore();
const db = firestore;

export { admin, firestore, db };
