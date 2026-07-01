# Phase 7 — E2E Manual Test Checklist

Run these steps against the running dev stack (`npm run dev` in `server/` + `npm start` in `client/`).

---

## Prerequisites

- Two Firebase test accounts: **Caregiver A** (owns stories) and **Caregiver B** (intruder).
- At least one published `story_templates` document that passes all readiness checks:
  - `personalizationEnabled: true`
  - `textPersonalizationReady: true`
  - `visualPersonalizationEnabled: true`
  - `visualPersonalizationReady: true`
  - `allowedIllustrationStyles` includes the style you will select during the test
  - `protagonistSlot` exists (non-null)
  - `personalizedCharacterPolicy: "replace_with_child_photo"`
  - `artDirectionSnapshot` exists inline OR `artDirectionStoredInline === false` with a `personalizationArtefacts/snapshot` subcollection document present
- Firestore emulator or real project with test data cleared between runs.

---

## 1. Happy path — completed generation

1. Sign in as **Caregiver A**.
2. Open a story detail page → click **Personalize**.
3. Fill in child name, gender, age group, visual style; upload a valid child photo.
4. Submit → confirm the free preview generates successfully (2 pages shown).
5. Add to cart → proceed to checkout.
6. Wait for background generation to finish.
7. Navigate to **My Stories → Purchased**.
   - Expected: card shows the story title + child name, a **Read story** chip (green), and a **Read** button.
8. Click **Read** → book reader opens, all pages display correctly.
9. Confirm raw child photo is no longer in Firebase Storage (`child-photos/`).
10. Confirm `personalizedStories/{id}.isAccessible === true` and `generationStatus === "completed"`.
11. Confirm `purchases/{id}.status === "completed"`.
12. Confirm final image storage paths are correct:
    - All `personalizedStories/{id}.pages[].generatedImagePath` values are under `generated-illustrations/{caregiverUid}/{storyId}/…`.
    - None reference `preview-illustrations/…`.
13. Confirm prompt safety for every page:
    - `pages[n].imagePromptUsed` is **not** identical to `story_templates/{templateId}.pages[n].imagePromptTemplate` (personalization was applied).
    - `pages[n].imagePromptUsed` does **not** contain the sample/template protagonist `characterAnchor` string (the child's photo description replaced it).

---

## 2. Partial failure — some pages fail

> Simulate by temporarily making the image provider reject for pages after the preview pages (pages 1–2 are copied from the preview; the provider is called for pages 3+).

14. Repeat steps 1–6 with the image provider misconfigured to fail for pages 3+.
15. Navigate to **My Stories → Purchased**.
    - Expected: card shows a **⚠ Partial failure** chip + "Story generation needs support" message + **Contact support** button. No **Read** button.
16. Confirm `personalizedStories/{id}.isAccessible === false` and `generationStatus === "partially_failed"`.
17. Confirm `purchases/{id}.status === "generation_partially_failed"` (NOT "completed").
18. Confirm raw child photo still exists in `child-photos/` (not deleted).
19. Confirm `storyPreviews/{id}.status === "generation_partially_failed"` (NOT "converted").
20. Confirm `GET /api/caregiver/stories/{storyId}` returns 403 (story is not accessible).

---

## 3. Full failure — all pages fail

> Failing only the image provider for pages 3+ produces `partially_failed` (not `failed`) because preview pages 1–2 are copied before the provider is called. To reach `failed`, you must prevent even those two preview pages from being used. Use one of these simulation approaches:
>
> - Delete the preview illustration files from Storage before triggering checkout, and also make the image provider reject all calls.
> - Make the child photo inaccessible (rename or delete it in Storage) before full generation starts, so the hard-fail guard triggers before any pages are written.
> - Corrupt or remove the art-direction snapshot so `ArtDirectionSnapshotNotReadyError` is thrown before generation begins.
> - Patch `fullStoryGeneration.service.ts` to throw unconditionally at the top of the function.

21. Trigger checkout using one of the failure approaches above.
22. Navigate to **My Stories → Purchased**.
    - Expected: card shows a **✗ Failed** chip + "Story generation failed" message + **Contact support** button.
23. Confirm `personalizedStories/{id}.isAccessible === false` and `generationStatus === "failed"`.
24. Confirm `purchases/{id}.status === "failed"`.
25. Confirm raw child photo is deleted from `child-photos/`.

---

## 4. Reader access control

26. As **Caregiver A**, copy the `storyId` of a **completed** personalized story.
27. As **Caregiver B**, call `GET /api/caregiver/stories/{storyId}`.
    - Expected: 403 Access denied.
28. As **Caregiver A**, attempt to call `GET /api/caregiver/stories/{partiallyFailedStoryId}`.
    - Expected: 403 Story is not accessible.
29. Confirm Firebase Storage rules block **Caregiver B** from reading `generated-illustrations/{caregiverA_uid}/…`.

---

## 5. Library endpoint only returns accessible stories

30. As **Caregiver A** (who has a completed story and a partially_failed story), call `GET /api/caregiver/stories/library`.
    - Expected: only the `completed + isAccessible=true` story appears.

---

## 6. Purchased endpoint returns all statuses

31. Call `GET /api/caregiver/stories/purchased` as **Caregiver A**.
    - Expected: all stories regardless of `generationStatus` appear (completed, partially_failed, failed, in_progress).

---

## 7. Cleanup job behavior

32. Set `photoRetainUntil` to a past timestamp on a `preview_used` photo document.
33. Trigger `cleanupPreviews()` manually (e.g., via a test script or scheduled function invocation).
    - Expected: photo deleted from Storage, `photoStatus === "deleted"`.
34. Confirm a photo with `photoRetainUntil` in the future is NOT deleted.
35. Set a `generation_partially_failed` preview's `updatedAt` to older than 30 days **and** ensure both `photoRetainUntil` and `childPhotoExpiresAt` are also set to past timestamps. Trigger cleanup.
    - Expected: raw child photo is deleted from Storage (Job 6 safety-net), preview illustrations are deleted, and the preview document itself is removed — all according to the cleanup policy.

---

## 8. Template images are untouched

36. After running cleanup, confirm that `specialist-illustrations/`, `template-assets/`, and `sampleImageUrl` files on story templates are unchanged.

---

## Status: Ready for manual verification
