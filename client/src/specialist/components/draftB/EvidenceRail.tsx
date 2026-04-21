import React from "react";
import Box from "@mui/material/Box";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import type { Agent1Result } from "../../../types/agent1Result";
import type { Story } from "../../../types/story";
import { COLORS } from "../../../theme";
import { COPING_TOOL_LABELS } from "../../../types/storyBrief";
import ReasoningPanel from "./ReasoningPanel";
import SafetyPanel from "./SafetyPanel";
import ToolsPanel from "./ToolsPanel";
import { countUndismissedFlags } from "./shared";
import { DRAFT_B, RAIL_WIDTH_DEFAULT } from "./tokens";

export type RailTab = "safety" | "reasoning" | "tools";

export interface EvidenceRailProps {
  story: Story;
  result: Agent1Result;
  dismissedFlags: Set<number>;
  onToggleFlag: (index: number) => void;
  onFlagHover: (index: number | null) => void;
  onGoToPassage: (flagIndex: number) => void;
  activeTab: RailTab;
  onTabChange: (tab: RailTab) => void;
  onFeedback: (card: string, text: string) => void;
  onInsertPlaceholder: (token: string) => void;
  onNavigateToBrief?: () => void;
  onEditBrief: () => void | Promise<void>;
  readOnly: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  width?: number;
  selectedVersionIndex: number;
  ageRangeLabel: string;
  storyTypeLabel: string;
}

function SafetyTabLabel({
  undismissedCount,
  hasFlags,
}: {
  undismissedCount: number;
  hasFlags: boolean;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      Safety
      {undismissedCount > 0 ? (
        <span
          style={{
            minWidth: 16,
            padding: "0 5px",
            borderRadius: 8,
            background: COLORS.error,
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            lineHeight: "16px",
            textAlign: "center",
          }}
        >
          {undismissedCount}
        </span>
      ) : hasFlags ? (
        <CheckCircleIcon style={{ fontSize: 14, color: COLORS.success, marginLeft: 4 }} />
      ) : null}
    </span>
  );
}

export default function EvidenceRail({
  story,
  result,
  dismissedFlags,
  onToggleFlag,
  onFlagHover,
  onGoToPassage,
  activeTab,
  onTabChange,
  onFeedback,
  onInsertPlaceholder,
  onNavigateToBrief,
  onEditBrief,
  readOnly,
  scrollRef,
  width = RAIL_WIDTH_DEFAULT,
  selectedVersionIndex,
  ageRangeLabel,
  storyTypeLabel,
}: EvidenceRailProps) {
  const flags = result.postValidationFlags ?? [];
  const undismissedCount = countUndismissedFlags(flags, dismissedFlags);

  const copingTool = story.brief.section3?.copingTool;
  const copingToolLabel = copingTool != null ? COPING_TOOL_LABELS[copingTool] : null;

  const tabs: RailTab[] = ["safety", "reasoning", "tools"];

  return (
    <Box
      sx={{
        width: `${width}px`,
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: DRAFT_B.cream,
        borderLeft: `1px solid ${DRAFT_B.border}`,
      }}
    >
      <Box sx={{ display: "flex", borderBottom: `1px solid ${DRAFT_B.border}`, flexShrink: 0 }}>
        {tabs.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "13px",
                borderBottom: active ? `2px solid ${COLORS.primary}` : "2px solid transparent",
                marginBottom: -1,
                color: active ? COLORS.primary : DRAFT_B.inkMuted,
                fontWeight: active ? 700 : 500,
              }}
            >
              {tab === "safety" && (
                <SafetyTabLabel undismissedCount={undismissedCount} hasFlags={flags.length > 0} />
              )}
              {tab === "reasoning" && "Reasoning"}
              {tab === "tools" && "Tools"}
            </button>
          );
        })}
      </Box>

      <Box ref={scrollRef} sx={{ flex: 1, overflowY: "auto", p: "16px 16px 24px" }}>
        {activeTab === "safety" && (
          <SafetyPanel
            flags={flags}
            dismissedFlags={dismissedFlags}
            onToggleFlag={onToggleFlag}
            onFlagHover={onFlagHover}
            onGoToPassage={onGoToPassage}
            mustNeverList={story.brief.section3?.mustNeverList ?? []}
            readOnly={readOnly}
          />
        )}
        {activeTab === "reasoning" && (
          <ReasoningPanel result={result} onFeedback={onFeedback} readOnly={readOnly} onEditBrief={onEditBrief} />
        )}
        {activeTab === "tools" && (
          <ToolsPanel
            onInsertPlaceholder={onInsertPlaceholder}
            copingToolLabel={copingToolLabel}
            copingToolPlacement={result.copingToolPlacement}
            onNavigateToBrief={onNavigateToBrief}
            ageRange={ageRangeLabel}
            storyTypeLabel={storyTypeLabel}
            targetRange={result.targetWordRange}
            selectedVersionIndex={selectedVersionIndex}
            readOnly={readOnly}
          />
        )}
      </Box>
    </Box>
  );
}
