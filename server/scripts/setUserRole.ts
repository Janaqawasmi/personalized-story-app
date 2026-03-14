// server/scripts/setUserRole.ts
//
// Utility script to set Firebase Auth custom claims (roles) on users.
// This is required for the auth middleware to recognize specialist/admin users.
//
// Usage:
//   npx ts-node scripts/setUserRole.ts <uid> <role>
//
// Examples:
//   npx ts-node scripts/setUserRole.ts abc123 specialist
//   npx ts-node scripts/setUserRole.ts def456 admin
//   npx ts-node scripts/setUserRole.ts ghi789 viewer

import admin from "firebase-admin";
import path from "path";
import fs from "fs";

// ============================================================================
// Initialize Firebase Admin
// ============================================================================

const serviceAccountPath = path.resolve(
  __dirname,
  "../config/serviceAccountKey.json"
);

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, "utf8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// ============================================================================
// Valid roles
// ============================================================================

const VALID_ROLES = ["specialist", "admin", "viewer"] as const;
type Role = (typeof VALID_ROLES)[number];

// ============================================================================
// Main
// ============================================================================

async function setUserRole(uid: string, role: Role): Promise<void> {
  // Verify user exists
  try {
    const userRecord = await admin.auth().getUser(uid);
    console.log(`Found user: ${userRecord.email || userRecord.uid}`);
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      console.error(`❌ User "${uid}" not found in Firebase Auth`);
      process.exit(1);
    }
    throw error;
  }

  // Set custom claims
  await admin.auth().setCustomUserClaims(uid, { role });

  // Verify
  const updatedUser = await admin.auth().getUser(uid);
  const claims = updatedUser.customClaims;

  console.log(`✅ Role set successfully`);
  console.log(`   UID:   ${uid}`);
  console.log(`   Email: ${updatedUser.email || "N/A"}`);
  console.log(`   Role:  ${claims?.role || "none"}`);
  console.log(`\nNote: The user must re-authenticate (sign out and back in)`);
  console.log(`for the new role to take effect in their ID token.`);
}

// ============================================================================
// CLI
// ============================================================================

const args = process.argv.slice(2);

if (args.length !== 2) {
  console.error("Usage: npx ts-node scripts/setUserRole.ts <uid> <role>");
  console.error(`Valid roles: ${VALID_ROLES.join(", ")}`);
  process.exit(1);
}

const [uid, role] = args;

if (!uid || !role) {
  console.error("Usage: npx ts-node scripts/setUserRole.ts <uid> <role>");
  console.error(`Valid roles: ${VALID_ROLES.join(", ")}`);
  process.exit(1);
}

if (!VALID_ROLES.includes(role as Role)) {
  console.error(`❌ Invalid role "${role}". Valid roles: ${VALID_ROLES.join(", ")}`);
  process.exit(1);
}

setUserRole(uid, role as Role)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Failed:", err);
    process.exit(1);
  });
