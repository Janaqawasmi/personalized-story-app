import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
} from "firebase-admin/firestore";
import { Caregiver } from "../types/caregiver";
import { ChildProfile } from "../types/childProfile";
import { StoryTemplate } from "../types/storyTemplate";
import { StoryPreview } from "../types/storyPreview";
import { CartItem } from "../types/cartItem";
import { Purchase } from "../types/purchase";
import { PersonalizedStory } from "../types/personalizedStory";

/**
 * Generic converter factory that ensures Firestore Timestamp fields
 * are properly handled on read. Writes pass through as-is since
 * Admin SDK handles Timestamp serialization.
 */
function createConverter<T extends DocumentData>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T): DocumentData {
      return data as DocumentData;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): T {
      const data = snapshot.data();
      return data as T;
    },
  };
}

export const caregiverConverter: FirestoreDataConverter<Caregiver> = {
  toFirestore(caregiver: Caregiver): DocumentData {
    const { uid: _uid, ...data } = caregiver;
    return data;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Caregiver {
    const data = snapshot.data();
    return {
      uid: snapshot.id,
      email: data.email as string,
      displayName: data.displayName as string | null,
      language: data.language as "ar" | "he",
      paymentCustomerId: data.paymentCustomerId as string | null,
      consentTimestamp: data.consentTimestamp as string,
      consentVersion: data.consentVersion as string,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp,
      childCount: data.childCount as number,
      purchaseCount: data.purchaseCount as number,
    };
  },
};

export const childProfileConverter: FirestoreDataConverter<ChildProfile> = {
  toFirestore(child: ChildProfile): DocumentData {
    const { childId: _childId, ...data } = child;
    return data;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): ChildProfile {
    const data = snapshot.data();
    return {
      childId: snapshot.id,
      firstName: data.firstName as string,
      gender: data.gender as ChildProfile["gender"],
      ageGroup: data.ageGroup as ChildProfile["ageGroup"],
      photoPath: data.photoPath as string | null,
      photoStatus: data.photoStatus as ChildProfile["photoStatus"],
      photoUploadedAt: data.photoUploadedAt as string | null,
      photoRetainUntil: data.photoRetainUntil as string | null,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp,
    };
  },
};

export const storyTemplateConverter: FirestoreDataConverter<StoryTemplate> = createConverter<StoryTemplate>();

export const storyPreviewConverter: FirestoreDataConverter<StoryPreview> = {
  toFirestore(preview: StoryPreview): DocumentData {
    return preview as unknown as DocumentData;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): StoryPreview {
    const data = snapshot.data();
    return {
      previewId: snapshot.id,
      caregiverUid: data.caregiverUid as string,
      childId: data.childId as string,
      templateId: data.templateId as string,
      childFirstName: data.childFirstName as string,
      childGender: data.childGender as StoryPreview["childGender"],
      templateTitle: data.templateTitle as string,
      templateVersion: data.templateVersion as number,
      language: data.language as "ar" | "he",
      previewPageCount: data.previewPageCount as number,
      pages: data.pages as StoryPreview["pages"],
      coverImageUrl: data.coverImageUrl as string | null,
      generationStatus: data.generationStatus as StoryPreview["generationStatus"],
      pagesCompleted: data.pagesCompleted as number,
      generationStartedAt: data.generationStartedAt as string | null,
      generationCompletedAt: data.generationCompletedAt as string | null,
      failureReason: data.failureReason as string | null,
      status: data.status as StoryPreview["status"],
      expiresAt: data.expiresAt as string | null,
      purchaseId: data.purchaseId as string | null,
      personalizedStoryId: data.personalizedStoryId as string | null,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp,
    };
  },
};

export const cartItemConverter: FirestoreDataConverter<CartItem> = {
  toFirestore(cartItem: CartItem): DocumentData {
    const { cartItemId: _cartItemId, ...data } = cartItem;
    return data;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): CartItem {
    const data = snapshot.data();
    return {
      cartItemId: snapshot.id,
      caregiverUid: data.caregiverUid as string,
      previewId: data.previewId as string,
      templateId: data.templateId as string,
      templateTitle: data.templateTitle as string,
      childId: data.childId as string,
      childFirstName: data.childFirstName as string,
      coverImageUrl: data.coverImageUrl as string | null,
      priceCents: data.priceCents as number,
      currency: data.currency as string,
      language: data.language as "ar" | "he",
      addedAt: data.addedAt as Timestamp,
    };
  },
};

export const purchaseConverter: FirestoreDataConverter<Purchase> = {
  toFirestore(purchase: Purchase): DocumentData {
    return purchase as unknown as DocumentData;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Purchase {
    const data = snapshot.data();
    return {
      purchaseId: snapshot.id,
      caregiverUid: data.caregiverUid as string,
      previewId: data.previewId as string,
      templateId: data.templateId as string,
      childId: data.childId as string,
      personalizedStoryId: data.personalizedStoryId as string | null,
      paymentTransactionId: data.paymentTransactionId as string,
      paymentSessionId: data.paymentSessionId as string | null,
      paymentChargeId: data.paymentChargeId as string | null,
      amountCents: data.amountCents as number,
      currency: data.currency as string,
      status: data.status as Purchase["status"],
      paidAt: data.paidAt as string | null,
      completedAt: data.completedAt as string | null,
      failedAt: data.failedAt as string | null,
      failureReason: data.failureReason as string | null,
      refundedAt: data.refundedAt as string | null,
      paymentRefundId: data.paymentRefundId as string | null,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp,
    };
  },
};

export const personalizedStoryConverter: FirestoreDataConverter<PersonalizedStory> = {
  toFirestore(story: PersonalizedStory): DocumentData {
    return story as unknown as DocumentData;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): PersonalizedStory {
    const data = snapshot.data();
    return {
      storyId: snapshot.id,
      caregiverUid: data.caregiverUid as string,
      childId: data.childId as string,
      purchaseId: data.purchaseId as string,
      previewId: data.previewId as string,
      childFirstName: data.childFirstName as string,
      childGender: data.childGender as PersonalizedStory["childGender"],
      templateId: data.templateId as string,
      templateTitle: data.templateTitle as string,
      templateVersion: data.templateVersion as number,
      language: data.language as "ar" | "he",
      dedicationName: data.dedicationName as string | null,
      coverImageUrl: data.coverImageUrl as string,
      generationStatus: data.generationStatus as PersonalizedStory["generationStatus"],
      totalPages: data.totalPages as number,
      pagesCompleted: data.pagesCompleted as number,
      pagesFromPreview: data.pagesFromPreview as number,
      pagesFailedIndexes: data.pagesFailedIndexes as number[],
      generationStartedAt: data.generationStartedAt as string | null,
      generationCompletedAt: data.generationCompletedAt as string | null,
      pages: data.pages as PersonalizedStory["pages"],
      isAccessible: data.isAccessible as boolean,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp,
    };
  },
};
