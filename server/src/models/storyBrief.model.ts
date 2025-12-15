export interface StoryBrief {
  id?: string;
  topicKey: string;
  targetAgeGroup: string;
  therapeuticMessages: string[];
  shortDescription?: string;
  status: "pending_generation" | "draft_generated";
  createdAt: string;
  createdBy: string;
}

