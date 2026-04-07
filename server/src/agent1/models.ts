/** Model for Step 1 (Story Architect) and Step 2 (Author). */
export const OPUS_MODEL = "claude-opus-4-6" as const;

/** Model for post-generation validation. */
export const SONNET_MODEL = "claude-sonnet-4-6" as const;

/** Agent 1 model union for type-safe model parameters. */
export type Agent1Model = typeof OPUS_MODEL | typeof SONNET_MODEL;

