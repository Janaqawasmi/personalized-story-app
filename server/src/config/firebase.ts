import path from "path";
import fs from "fs";
import admin from "firebase-admin";

const serviceAccountPath = path.resolve(
  __dirname,
  "../../config/serviceAccountKey.json"
);

// ✅ READ AND PARSE THE JSON FILE
const serviceAccount = JSON.parse(
  fs.readFileSync(serviceAccountPath, "utf8")
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// ✅ This MUST show a real project ID
console.log("🔥 Firebase project:", admin.app().options.projectId);

const firestore = admin.firestore();
const db = firestore;

export { admin, firestore, db };
