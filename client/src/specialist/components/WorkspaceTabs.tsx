// client/src/specialist/components/WorkspaceTabs.tsx
//
// Tab bar for the Story Workspace: Brief / Story (generated text) / History.
// Implements the WAI-ARIA tabs pattern via MUI Tabs (role="tablist", aria-selected, etc.).
// Story tab is disabled when agent1Result === null.
//
// Important: `Tab` must be a direct child of `Tabs`. Wrapping a Tab in Tooltip/Box
// breaks MUI’s tab list (wrong child count / onChange), so clicks do nothing.

import React from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";

import { useSpecialistDeskUi } from "../../i18n/specialistDeskUi";
import type { Story, StoryStatus } from "../../types/story";
import { COLORS } from "../../theme";
import { DRAFT_B } from "./draftB/tokens";

const ILLUSTRATION_STATUSES = new Set<StoryStatus>([
  "prompt_review", "illustrating", "illustration_review", "illustration_ready", "published",
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WorkspaceTabValue = "brief" | "draft" | "history" | "illustrations";

export interface WorkspaceTabsProps {
  story: Story;
  activeTab: WorkspaceTabValue;
  onTabChange: (tab: WorkspaceTabValue) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WorkspaceTabs({
  story,
  activeTab,
  onTabChange,
}: WorkspaceTabsProps) {
  const desk = useSpecialistDeskUi();
  const draftDisabled = story.agent1Result === null && story.currentDraft === null;
  const illustrationsEnabled = ILLUSTRATION_STATUSES.has(story.status);

  function handleChange(
    _event: React.SyntheticEvent,
    newValue: WorkspaceTabValue
  ) {
    onTabChange(newValue);
  }

  return (
    <Box sx={{ borderBottom: `1px solid ${DRAFT_B.border}`, bgcolor: DRAFT_B.cream, px: { xs: 2, sm: 3, md: 5 } }}>
      <Tabs
        value={activeTab}
        onChange={handleChange}
        aria-label={desk.tabsAriaLabel}
        sx={{
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.875rem",
            minWidth: 80,
          },
          "& .Mui-selected": {
            color: `${COLORS.primary} !important`,
          },
          "& .MuiTabs-indicator": {
            backgroundColor: COLORS.primary,
          },
        }}
      >
        <Tab
          label={desk.tabBrief}
          value="brief"
          id="tab-brief"
          aria-controls="tabpanel-brief"
        />

        <Tab
          label={desk.tabStory}
          value="draft"
          id="tab-draft"
          aria-controls="tabpanel-draft"
          disabled={draftDisabled}
          title={
            draftDisabled ? desk.tabStoryDisabledTooltip : undefined
          }
          sx={
            draftDisabled
              ? {
                  opacity: 0.4,
                }
              : {}
          }
        />

        <Tab
          label={desk.tabIllustrations}
          value="illustrations"
          id="tab-illustrations"
          aria-controls="tabpanel-illustrations"
          disabled={!illustrationsEnabled}
          sx={!illustrationsEnabled ? { opacity: 0.4 } : {}}
        />

        <Tab
          label={desk.tabHistory}
          value="history"
          id="tab-history"
          aria-controls="tabpanel-history"
        />
      </Tabs>
    </Box>
  );
}
