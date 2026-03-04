# Phase 1: Safety & Governance - Deployment Guide

This guide walks you through the final steps to activate the safety and governance features.

## Prerequisites

1. **Firebase CLI** must be installed:
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase project** must be initialized (if not already):
   ```bash
   firebase login
   firebase init firestore
   ```

3. **User UID** from Firebase Authentication Console (needed for role assignment)

---

## Step 1: Set User Roles

Before users can access specialist/admin features, you must assign roles using Firebase Auth custom claims.

### Get User UID

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** → **Users**
4. Find the user and copy their **UID**

### Assign Role

Run the script from the project root:

```bash
# For Windows PowerShell:
cd server
npx ts-node scripts/setUserRole.ts <USER_UID> specialist

# Or for admin role:
npx ts-node scripts/setUserRole.ts <USER_UID> admin

# Or for viewer role (read-only):
npx ts-node scripts/setUserRole.ts <USER_UID> viewer
```

**Example:**
```bash
npx ts-node scripts/setUserRole.ts abc123xyz456 specialist
```

**Important:** After setting a role, the user must **sign out and sign back in** for the new role to take effect in their ID token.

### Valid Roles

- `specialist` - Can create briefs, approve contracts, generate stories
- `admin` - Full access (same as specialist)
- `viewer` - Read-only access

---

## Step 2: Deploy Firestore Security Rules

The security rules provide a second layer of protection at the database level.

```bash
firebase deploy --only firestore:rules
```

**What this does:**
- Enforces authentication requirements at the database level
- Prevents unauthorized writes to contracts and audit trail
- Ensures only specialists/admins can create briefs
- Blocks client-side writes to generation contracts (server-only)

**Expected output:**
```
✔  Deploy complete!

Firestore Rules deployed successfully
```

---

## Step 3: Deploy Firestore Indexes

The indexes are required for efficient audit trail queries.

```bash
firebase deploy --only firestore:indexes
```

**What this does:**
- Creates composite indexes for audit trail queries
- Enables efficient queries by resourceType, resourceId, and timestamp
- May take a few minutes to build (Firebase will show progress)

**Expected output:**
```
✔  Deploy complete!

Firestore indexes deployed successfully
```

**Note:** If indexes are still building, you'll see a message like:
```
Creating indexes... this may take several minutes
```

You can check index status in the [Firebase Console](https://console.firebase.google.com/) under **Firestore** → **Indexes**.

---

## Step 4: Verify Deployment

### Test Authentication

1. Start your backend server:
   ```bash
   cd server
   npm start
   ```

2. Try accessing a protected endpoint without authentication - should return 401

3. Log in through the frontend and try again - should work

### Test Approval Workflow

1. Create a story brief (requires specialist/admin role)
2. Navigate to contract review page
3. Verify you can see the contract
4. Click "Approve Contract" - should succeed
5. Try to generate a draft - should work (contract is approved)
6. Check audit history - should show approval event

### Test Generation Guard

1. Create a new brief and build contract
2. **Don't approve it** - leave status as "valid"
3. Try to generate a draft - should fail with 403 error:
   ```
   Contract has not been reviewed yet. A specialist must approve it before generation.
   ```

---

## Troubleshooting

### Firebase CLI Not Found

**Install Firebase CLI:**
```bash
npm install -g firebase-tools
```

**Verify installation:**
```bash
firebase --version
```

### User Role Not Working

1. **Check custom claims:**
   - Go to Firebase Console → Authentication → Users
   - Click on the user
   - Check "Custom claims" section - should show `{"role": "specialist"}`

2. **User must re-authenticate:**
   - The user must sign out and sign back in
   - ID tokens are cached - old tokens don't include new claims

3. **Verify in backend logs:**
   - Check server console when user makes a request
   - Should see user role in logs

### Firestore Rules Deployment Fails

1. **Check firebase.json:**
   ```json
   {
     "firestore": {
       "rules": "firestore.rules",
       "indexes": "firestore.indexes.json"
     }
   }
   ```

2. **Verify files exist:**
   - `firestore.rules` in project root
   - `firestore.indexes.json` in project root

3. **Check Firebase project:**
   ```bash
   firebase projects:list
   firebase use <project-id>
   ```

### Indexes Not Building

1. Check Firebase Console → Firestore → Indexes
2. Look for "Building" status
3. Wait for completion (can take 5-10 minutes)
4. If stuck, check for errors in console

---

## Security Checklist

After deployment, verify:

- [ ] All specialist routes require authentication (401 without token)
- [ ] Only specialists/admins can create briefs (403 for viewers)
- [ ] Generation requires approved contract (403 for unapproved)
- [ ] Audit trail entries are being created
- [ ] Firestore rules block unauthorized writes
- [ ] User roles are set correctly in Firebase Auth

---

## Next Steps

Once deployment is complete:

1. **Test the full workflow:**
   - Create brief → Build contract → Approve → Generate draft

2. **Monitor audit trail:**
   - Check that all actions are logged
   - Verify actor information is correct

3. **Set roles for all users:**
   - Assign appropriate roles to all team members
   - Document who has specialist/admin access

4. **Review security:**
   - Ensure no unauthorized access is possible
   - Test edge cases (expired tokens, invalid roles, etc.)

---

## Support

If you encounter issues:

1. Check server logs for detailed error messages
2. Verify Firebase project configuration
3. Ensure serviceAccountKey.json is valid
4. Check that all dependencies are installed
