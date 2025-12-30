// server/src/services/ragWritingRules.service.ts
import { firestore } from "../config/firebase";

/**
 * Document structure for rag_writing_rules collection
 */
interface WritingRuleDocument {
  title?: string;
  content?: string;
  rules?: string[]; // Legacy format support
  active?: boolean;
  priority?: number;
}

/**
 * Loads all active writing rules from rag_writing_rules collection.
 * Rules are sorted by priority (if exists), then by document ID.
 * 
 * Returns a formatted text block suitable for prompt injection.
 */
export async function loadWritingRules(): Promise<string> {
  try {
    const snapshot = await firestore
      .collection("rag_writing_rules")
      .get();

    if (snapshot.empty) {
      return "No writing rules found.";
    }

    // Map documents to rules with priority
    const rules: Array<{ text: string; priority: number }> = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as WritingRuleDocument;
      
      // Skip inactive documents (if active field exists and is false)
      if (data.active === false) {
        return;
      }

      // Use priority if available, otherwise default to 999 (lowest priority)
      const priority = data.priority ?? 999;

      // Extract rule content - support both formats
      if (data.content) {
        // New format: single content string
        rules.push({
          text: data.content,
          priority,
        });
      } else if (data.rules && Array.isArray(data.rules)) {
        // Legacy format: rules array - each rule becomes a separate entry
        data.rules.forEach((ruleText) => {
          if (ruleText && ruleText.trim()) {
            rules.push({
              text: ruleText.trim(),
              priority,
            });
          }
        });
      } else {
        // Fallback: use document ID
        rules.push({
          text: `[${doc.id}]`,
          priority,
        });
      }
    });

    // Sort by priority (lower number = higher priority)
    rules.sort((a, b) => a.priority - b.priority);

    // Format as bullet points
    if (rules.length === 0) {
      return "No active writing rules found.";
    }

    return rules.map((rule) => `- ${rule.text}`).join("\n");
  } catch (error: any) {
    console.error("Error loading writing rules from rag_writing_rules:", error);
    return `Error loading writing rules: ${error.message}`;
  }
}

