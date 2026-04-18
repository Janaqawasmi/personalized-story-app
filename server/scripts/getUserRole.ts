// Look up Firebase Auth user by email or UID and print custom claims (role).
//
// From repo root:
//   npm run get-user-role -- user@example.com
//   npm run get-user-role -- abc123Uid
//
// Or: cd server && npx ts-node scripts/getUserRole.ts <email-or-uid>

import admin from "firebase-admin";
import path from "path";
import fs from "fs";

function loadServiceAccount(): Record<string, unknown> {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (fromEnv && fromEnv.trim()) {
    return JSON.parse(fromEnv) as Record<string, unknown>;
  }
  const serviceAccountPath = path.resolve(
    __dirname,
    "../config/serviceAccountKey.json"
  );
  if (!fs.existsSync(serviceAccountPath)) {
    console.error(
      "Missing credentials: set FIREBASE_SERVICE_ACCOUNT_JSON or add server/config/serviceAccountKey.json"
    );
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(serviceAccountPath, "utf8")) as Record<
    string,
    unknown
  >;
}

if (!admin.apps.length) {
  const serviceAccount = loadServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

async function main(identifier: string): Promise<void> {
  const isEmail = identifier.includes("@");
  const user = isEmail
    ? await admin.auth().getUserByEmail(identifier)
    : await admin.auth().getUser(identifier);

  const claims = user.customClaims ?? {};
  const role =
    typeof claims.role === "string" ? claims.role : "(no role claim — defaults to viewer in API)";

  console.log("UID:   ", user.uid);
  console.log("Email: ", user.email ?? "(none)");
  console.log("Role:  ", role);
  if (claims.admin === true && claims.role !== "admin") {
    console.log("Note:  legacy claim admin:true is treated as role admin by the API");
  }
  console.log("Full custom claims:", JSON.stringify(claims, null, 2));
}

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: npx ts-node scripts/getUserRole.ts <email-or-uid>");
  process.exit(1);
}

main(arg)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err?.code === "auth/user-not-found" ? "User not found." : err);
    process.exit(1);
  });
