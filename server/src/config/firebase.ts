import path from 'path';
import admin from 'firebase-admin';

const serviceAccountPath = path.resolve(__dirname, '../../config/serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
}

const firestore = admin.firestore();
const db = firestore;

export { admin, firestore, db };

