// client/src/specialist/components/WorkspaceTabs.tsx
//
// Tab bar for the Story Workspace: Brief / Draft / History.
// Implements the WAI-ARIA tabs pattern via MUI Tabs (role="tablist", aria-selected, etc.).
// Draft tab is disabled when agent1Result === null.
//
// Important: `Tab` must be a direct child of `Tabs`. Wrapping a Tab in Tooltip/Box
// breaks MUI’s tab list (wrong child count / onChange), so clicks do nothing.

import React from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";

import type { Story } from "../../types/story";
import { COLORS } from "../../theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WorkspaceTabValue = "brief" | "draft" | "history";

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
  const draftDisabled = story.agent1Result === null;

  function handleChange(
    _event: React.SyntheticEvent,
    newValue: WorkspaceTabValue
  ) {
    onTabChange(newValue);
  }

  return (
    <Box sx={{ borderBottom: `1px solid ${COLORS.border}` }}>
      <Tabs
        value={activeTab}
        onChange={handleChange}
        aria-label="Story workspace tabs"
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
          label="Brief"
          value="brief"
          id="tab-brief"
          aria-controls="tabpanel-brief"
        />

        <Tab
          label="Draft"
          value="draft"
          id="tab-draft"
          aria-controls="tabpanel-draft"
          disabled={draftDisabled}
          title={draftDisabled ? "Generate the story first" : undefined}
          sx={
            draftDisabled
              ? {
                  opacity: 0.4,
                }
              : {}
          }
        />

        <Tab
          label="History"
          value="history"
          id="tab-history"
          aria-controls="tabpanel-history"
        />
      </Tabs>
    </Box>
  );
}
