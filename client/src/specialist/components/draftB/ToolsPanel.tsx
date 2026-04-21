import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FavoriteIcon from "@mui/icons-material/Favorite";

import { COLORS } from "../../../theme";
import { MAX_VERSIONS, PLACEHOLDERS } from "./shared";
import { DRAFT_B, FONTS } from "./tokens";

export interface ToolsPanelProps {
  onInsertPlaceholder: (token: string) => void;
  copingToolLabel: string | null;
  copingToolPlacement: string | null;
  onNavigateToBrief?: () => void;
  ageRange: string;
  storyTypeLabel: string;
  targetRange: readonly [number, number];
  selectedVersionIndex: number;
  readOnly: boolean;
}

export default function ToolsPanel({
  onInsertPlaceholder,
  copingToolLabel,
  copingToolPlacement,
  onNavigateToBrief,
  ageRange,
  storyTypeLabel,
  targetRange,
  selectedVersionIndex,
  readOnly,
}: ToolsPanelProps) {
  return (
    <Box>
      <Box sx={{ mb: "12px" }}>
        <TypographyTitle>Placeholders</TypographyTitle>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {PLACEHOLDERS.map((token) => (
            <button
              key={token}
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && onInsertPlaceholder(token)}
              style={{
                background: DRAFT_B.primarySoft,
                color: "#1a3a5c",
                fontFamily: FONTS.mono,
                fontSize: "11px",
                padding: "6px 10px",
                borderRadius: "6px",
                cursor: readOnly ? "not-allowed" : "pointer",
                border: "none",
                opacity: readOnly ? 0.5 : 1,
              }}
            >
              {token}
            </button>
          ))}
        </Box>
      </Box>

      <Box sx={{ background: DRAFT_B.roseSoft, borderRadius: "8px", p: "12px", mb: "12px" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <FavoriteIcon sx={{ fontSize: 14, color: DRAFT_B.rose }} />
          <Box
            component="span"
            sx={{
              fontSize: "10.5px",
              fontWeight: 700,
              textTransform: "uppercase",
              color: DRAFT_B.rose,
            }}
          >
            COPING TOOL
          </Box>
        </Box>
        {copingToolLabel ? (
          <Box sx={{ fontWeight: 700, fontSize: "13px", color: DRAFT_B.ink, mt: 0.75 }}>{copingToolLabel}</Box>
        ) : null}
        {copingToolPlacement ? (
          <Box sx={{ fontSize: "12px", color: DRAFT_B.inkSoft, mt: copingToolLabel ? 0.5 : 0.75 }}>{copingToolPlacement}</Box>
        ) : null}
        {!copingToolLabel && !copingToolPlacement ? (
          <Box sx={{ fontSize: "12px", color: "text.secondary", mt: 0.75 }}>No coping tool selected.</Box>
        ) : null}
        <Button
          variant="text"
          size="small"
          onClick={() => onNavigateToBrief?.()}
          sx={{
            mt: 1,
            p: 0,
            minWidth: 0,
            fontSize: "12px",
            color: COLORS.primary,
            textDecoration: "underline",
            textTransform: "none",
          }}
        >
          ← Back to brief
        </Button>
      </Box>

      <Box
        sx={{
          background: "white",
          border: `1px solid ${DRAFT_B.border}`,
          borderRadius: "8px",
          p: "12px",
        }}
      >
        <TypographyTitle>Story context</TypographyTitle>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4px 8px",
            fontSize: "11px",
          }}
        >
          <CtxKey>Type</CtxKey>
          <CtxVal>{storyTypeLabel || "—"}</CtxVal>
          <CtxKey>Ages</CtxKey>
          <CtxVal>{ageRange || "—"}</CtxVal>
          <CtxKey>Target</CtxKey>
          <CtxVal>{`${targetRange[0]}–${targetRange[1]} words`}</CtxVal>
          <CtxKey>Revision</CtxKey>
          <CtxVal>{`${selectedVersionIndex + 1} of ${MAX_VERSIONS}`}</CtxVal>
        </Box>
      </Box>
    </Box>
  );
}

function TypographyTitle({ children }: { children: React.ReactNode }) {
  return (
    <Box component="div" sx={{ fontSize: "12px", fontWeight: 700, mb: 1 }}>
      {children}
    </Box>
  );
}

function CtxKey({ children }: { children: React.ReactNode }) {
  return <Box sx={{ color: DRAFT_B.inkMuted }}>{children}</Box>;
}

function CtxVal({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ color: DRAFT_B.inkSoft, fontWeight: 600, textAlign: "right" }}>
      {children}
    </Box>
  );
}
