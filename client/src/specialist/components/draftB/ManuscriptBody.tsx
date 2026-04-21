import React, { useEffect, useMemo, useState } from "react";

import type { PostValidationFlag } from "../../../types/agent1Result";
import { COLORS } from "../../../theme";
import { CHECK_TYPE_LABELS } from "./shared";
import { DRAFT_B, FONTS } from "./tokens";

const PLACEHOLDER_PATTERN = /(\[CHILD_NAME\]|\[HE\/SHE\/THEY\]|\[HIM\/HER\/THEM\]|\[HIS\/HER\/THEIR\])/g;

function buildFlagAnchors(
  body: string,
  flags: PostValidationFlag[],
): Record<number, number[]> {
  const paragraphs = body.split(/\n\n+/).filter(Boolean);
  const anchors: Record<number, number[]> = {};
  flags.forEach((flag, fi) => {
    const needle = flag.passage.trim().slice(0, 120);
    let foundAt = paragraphs.findIndex((p) => p.includes(needle));
    if (foundAt === -1) {
      console.warn(
        `[DraftTabB] Flag ${fi} passage not found in body — anchoring to paragraph 0`,
      );
      foundAt = 0;
    }
    anchors[foundAt] = [...(anchors[foundAt] ?? []), fi];
  });
  return anchors;
}

function renderWithPlaceholderTokens(text: string): React.ReactNode[] {
  const parts = text.split(PLACEHOLDER_PATTERN);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <span
          key={i}
          style={{
            fontFamily: FONTS.mono,
            fontSize: "0.78em",
            background: DRAFT_B.primarySoft,
            color: "#1a3a5c",
            padding: "1px 6px",
            borderRadius: "3px",
            letterSpacing: "0.3px",
          }}
        >
          {part}
        </span>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export interface ManuscriptBodyProps {
  body: string;
  storyFont: "serif" | "sans";
  flags: PostValidationFlag[];
  dismissedFlags: Set<number>;
  hoveredFlagIndex: number | null;
  onFlagMarkerClick: (flagIndex: number) => void;
  onParagraphHover: (index: number | null) => void;
}

export default function ManuscriptBody({
  body,
  storyFont,
  flags,
  dismissedFlags,
  hoveredFlagIndex,
  onFlagMarkerClick,
  onParagraphHover,
}: ManuscriptBodyProps) {
  const [debouncedBody, setDebouncedBody] = useState(body);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedBody(body), 400);
    return () => window.clearTimeout(t);
  }, [body]);

  const flagAnchors = useMemo(
    () => buildFlagAnchors(debouncedBody, flags),
    [debouncedBody, flags],
  );

  const paragraphs = body.split(/\n\n+/).filter(Boolean);
  const fontFamily = storyFont === "serif" ? FONTS.serif : FONTS.sans;

  return (
    <div>
      {paragraphs.map((para, pi) => {
        const anchorIndices = flagAnchors[pi] ?? [];
        const anchorClassNames =
          anchorIndices.map((fi) => `flag-anchor-${fi}`).join(" ") || undefined;
        const text = para;
        const firstChar = text[0] ?? "";
        const rest = text.slice(1);
        const showDropCap = storyFont === "serif" && pi === 0 && firstChar.length > 0;

        const undismissedHere = anchorIndices.filter((fi) => !dismissedFlags.has(fi));
        const highlighted =
          hoveredFlagIndex !== null &&
          undismissedHere.includes(hoveredFlagIndex);

        return (
          <p
            key={pi}
            className={anchorClassNames}
            style={{
              fontFamily,
              fontSize: "16.5px",
              lineHeight: "1.85",
              textAlign: "justify",
              hyphens: "auto",
              background: highlighted ? "#fdeaea" : "transparent",
              transition: "background 120ms ease",
              padding: highlighted ? "0 4px" : 0,
              marginBottom: "1.1em",
            }}
            onMouseEnter={() => {
              if (undismissedHere.length > 0) {
                onParagraphHover(undismissedHere[0]);
              }
            }}
            onMouseLeave={() => onParagraphHover(null)}
          >
            {showDropCap && (
              <span
                style={{
                  float: "left",
                  fontFamily,
                  fontSize: "62px",
                  lineHeight: "0.85",
                  fontWeight: 600,
                  color: DRAFT_B.rose,
                  paddingRight: "8px",
                  paddingTop: "4px",
                }}
              >
                {firstChar}
              </span>
            )}
            {renderWithPlaceholderTokens(showDropCap ? rest : text)}
            {anchorIndices
              .filter((fi) => !dismissedFlags.has(fi))
              .map((fi) => (
                <button
                  key={fi}
                  type="button"
                  className="flag-marker"
                  onClick={() => onFlagMarkerClick(fi)}
                  aria-label={`Safety finding ${fi + 1}: ${CHECK_TYPE_LABELS[flags[fi].checkType]}`}
                  style={{
                    color: COLORS.error,
                    fontWeight: 700,
                    fontSize: "10px",
                    fontFamily: "Inter, sans-serif",
                    verticalAlign: "super",
                    marginLeft: "2px",
                    cursor: "pointer",
                    userSelect: "none",
                    background: "none",
                    border: "none",
                    padding: 0,
                  }}
                >
                  [{fi + 1}]
                </button>
              ))}
          </p>
        );
      })}
      {paragraphs.length > 1 && (
        <div
          style={{
            textAlign: "center",
            fontSize: "20px",
            letterSpacing: "8px",
            color: DRAFT_B.inkMuted,
            marginTop: "12px",
            marginBottom: "6px",
          }}
        >
          ❦
        </div>
      )}
    </div>
  );
}
