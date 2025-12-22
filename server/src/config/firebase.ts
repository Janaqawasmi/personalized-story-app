import path from 'path';
import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccountPath = path.resolve(__dirname, '../../config/serviceAccountKey.json');

try {
  if (!admin.apps.length) {
    // Read service account to get project ID for logging
    let projectId = 'unknown';
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      projectId = serviceAccount.project_id || 'unknown';
    } catch (e) {
      // Ignore read errors, will use 'unknown'
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
    console.log("Firebase initialized - Project:", projectId);
  } else {
    const projectId = admin.app().options.projectId || 'unknown';
    console.log("Firebase already initialized - Project:", projectId);
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
  throw error;
}

const firestore = admin.firestore();
const db = firestore;

export { admin, firestore, db };

