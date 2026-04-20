// client/src/specialist/components/WorkspaceTabs.tsx
//
// Tab bar for the Story Workspace: Brief / Draft / History.
// Implements the WAI-ARIA tabs pattern via MUI Tabs (role="tablist", aria-selected, etc.).
// Draft tab is disabled with a tooltip when agent1Result === null.

import React from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";

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

        {/*
          Wrap the disabled Draft tab in a <span> so the Tooltip can fire
          on hover even when the Tab itself has pointer-events: none.
          MUI Tabs uses CSS flexbox for layout so the span wrapper doesn't
          break tab counting or active-tab tracking.
        */}
        <Tooltip
          title={draftDisabled ? "Generate the story first" : ""}
          placement="top"
          disableHoverListener={!draftDisabled}
          disableFocusListener={!draftDisabled}
        >
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              // Tooltip requires its direct child to accept ref + event handlers;
              // the inner Tab has pointer-events:none when disabled, so we keep
              // pointer-events on the span so the tooltip can fire.
              pointerEvents: "auto",
            }}
          >
            <Tab
              label="Draft"
              value="draft"
              id="tab-draft"
              aria-controls="tabpanel-draft"
              disabled={draftDisabled}
              sx={
                draftDisabled
                  ? {
                      pointerEvents: "none",
                      opacity: 0.4,
                    }
                  : {}
              }
            />
          </Box>
        </Tooltip>

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
