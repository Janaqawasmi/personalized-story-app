import path from "path";
import fs from "fs";
import admin from "firebase-admin";

const serviceAccountPath = path.resolve(
  __dirname,
  "../../config/serviceAccountKey.json"
);

// Read & parse once
const serviceAccount = JSON.parse(
  fs.readFileSync(serviceAccountPath, "utf8")
);

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log(
      "Firebase initialized - Project:",
      serviceAccount.project_id
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

// Must show real project ID
console.log("🔥 Firebase project:", admin.app().options.projectId);

const firestore = admin.firestore();
const db = firestore;

export { admin, firestore, db };
