import React from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";

import type { PostValidationFlag } from "../../../types/agent1Result";
import ManuscriptBody from "./ManuscriptBody";
import { DRAFT_B, FONTS, MANUSCRIPT_MAX_WIDTH } from "./tokens";

export interface ManuscriptEditorMeta {
  ageRange: string;
  storyTypeLabel: string | null;
  copingToolLabel: string | null;
}

export interface ManuscriptEditorProps {
  title: string;
  body: string;
  onTitleChange: (t: string) => void;
  onBodyChange: (b: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  readOnly: boolean;
  storyFont: "serif" | "sans";
  meta: ManuscriptEditorMeta;
  versionNumber: number;
  flags: PostValidationFlag[];
  dismissedFlags: Set<number>;
  hoveredFlagIndex: number | null;
  onFlagMarkerClick: (flagIndex: number) => void;
  onParagraphHover: (index: number | null) => void;
  mode: "read" | "edit";
}

function MetaSeparator() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 3,
        height: 3,
        borderRadius: "50%",
        background: DRAFT_B.inkMuted,
        margin: "0 8px",
        verticalAlign: "middle",
      }}
    />
  );
}

export default function ManuscriptEditor({
  title,
  body,
  onTitleChange,
  onBodyChange,
  textareaRef,
  readOnly,
  storyFont,
  meta,
  versionNumber,
  flags,
  dismissedFlags,
  hoveredFlagIndex,
  onFlagMarkerClick,
  onParagraphHover,
  mode,
}: ManuscriptEditorProps) {
  const segments: string[] = [];
  if (meta.ageRange) segments.push(`AGES ${meta.ageRange}`);
  if (meta.storyTypeLabel) segments.push(meta.storyTypeLabel.toUpperCase());
  if (meta.copingToolLabel) segments.push(meta.copingToolLabel.toUpperCase());

  return (
    <Box
      sx={{
        maxWidth: MANUSCRIPT_MAX_WIDTH,
        mx: "auto",
        pb: "140px",
      }}
    >
      <Box
        sx={{
          background: DRAFT_B.manuscript,
          border: `1px solid ${DRAFT_B.border}`,
          borderRadius: "2px",
          boxShadow:
            "0 1px 2px rgba(60,50,40,0.05), 0 20px 60px rgba(60,50,40,0.08)",
          padding: "56px 72px 48px",
          position: "relative",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: "-14px",
            left: "40px",
            background: DRAFT_B.rose,
            color: "#fff",
            fontSize: "10px",
            textTransform: "uppercase",
            fontWeight: 700,
            letterSpacing: "1.2px",
            padding: "3px 10px",
            borderRadius: "3px",
          }}
        >
          MANUSCRIPT · v{versionNumber}
        </Box>

        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          readOnly={readOnly}
          style={{
            width: "100%",
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: storyFont === "serif" ? FONTS.serif : FONTS.sans,
            fontStyle: storyFont === "serif" ? "italic" : "normal",
            fontSize: "34px",
            fontWeight: 500,
            letterSpacing: "-0.6px",
            textAlign: "center",
            color: DRAFT_B.ink,
            marginBottom: "8px",
          }}
        />

        {segments.length > 0 ? (
          <Box
            sx={{
              fontSize: "11px",
              textTransform: "uppercase",
              fontWeight: 600,
              letterSpacing: "0.6px",
              color: DRAFT_B.inkMuted,
              textAlign: "center",
              marginBottom: "32px",
            }}
          >
            {segments.map((s, i) => (
              <React.Fragment key={i}>
                {i > 0 ? <MetaSeparator /> : null}
                {s}
              </React.Fragment>
            ))}
          </Box>
        ) : null}

        {mode === "read" ? (
          <ManuscriptBody
            body={body}
            storyFont={storyFont}
            flags={flags}
            dismissedFlags={dismissedFlags}
            hoveredFlagIndex={hoveredFlagIndex}
            onFlagMarkerClick={onFlagMarkerClick}
            onParagraphHover={onParagraphHover}
          />
        ) : (
          <TextField
            multiline
            fullWidth
            minRows={18}
            inputRef={textareaRef}
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            variant="standard"
            InputProps={{
              readOnly,
              disableUnderline: true,
            }}
            sx={{
              "& .MuiInputBase-root": { padding: 0 },
              "& .MuiInputBase-input": {
                fontFamily: storyFont === "serif" ? FONTS.serif : FONTS.sans,
                fontSize: "16.5px",
                lineHeight: "1.85",
                color: DRAFT_B.ink,
                padding: 0,
              },
            }}
          />
        )}
      </Box>
    </Box>
  );
}
