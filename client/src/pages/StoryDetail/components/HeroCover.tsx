import { useState, useMemo, useEffect } from "react";
import { Box, Typography, GlobalStyles } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ShieldIcon from "@mui/icons-material/Shield";
import { useTranslation } from "../../../i18n/useTranslation";
import { COLORS } from "../../../theme";
import { SDGradients, SDRadii, SDShadows } from "../StoryDetail.styles";

interface HeroCoverProps {
  coverUrl: string;
  title: string;
  reducedMotion: boolean;
}

export default function HeroCover({ coverUrl, title, reducedMotion }: HeroCoverProps) {
  const t = useTranslation();
  const [broken, setBroken] = useState(false);
  const showImg = Boolean(coverUrl) && !broken;

  const stars = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      top: `${8 + ((i * 17) % 75)}%`,
      insetInlineStart: `${5 + ((i * 23) % 85)}%`,
      size: 2 + (i % 3),
      delay: `${(i % 5) * 0.35}s`,
      duration: `${2 + (i % 3)}s`,
    }));
  }, []);

  useEffect(() => {
    setBroken(false);
  }, [coverUrl]);

  return (
    <>
      {!reducedMotion && (
        <GlobalStyles
          styles={{
            "@keyframes starTwinkle": {
              "0%": { opacity: 0.2 },
              "100%": { opacity: 1 },
            },
          }}
        />
      )}
      <Box sx={{ position: "relative", width: "100%" }}>
        <Box
          sx={{
            position: "relative",
            aspectRatio: "3 / 4",
            borderRadius: SDRadii.cover,
            overflow: "hidden",
            background: showImg ? alpha(COLORS.textPrimary, 0.93) : SDGradients.coverBg,
            boxShadow: showImg ? SDShadows.cover : "none",
          }}
        >
          {showImg ? (
            <Box
              component="img"
              src={coverUrl}
              alt={title}
              sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={() => setBroken(true)}
            />
          ) : (
            <Box
              sx={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {!reducedMotion &&
                stars.map((s) => (
                  <Box
                    key={s.id}
                    sx={{
                      position: "absolute",
                      top: s.top,
                      insetInlineStart: s.insetInlineStart,
                      width: s.size,
                      height: s.size,
                      borderRadius: "50%",
                      bgcolor: alpha(COLORS.surface, 0.9),
                      animation: reducedMotion ? "none" : `starTwinkle ${s.duration} ease-in-out infinite alternate`,
                      animationDelay: s.delay,
                      pointerEvents: "none",
                    }}
                  />
                ))}
              <Typography component="span" sx={{ fontSize: "4.5rem", lineHeight: 1, zIndex: 1 }} aria-hidden>
                🦁
              </Typography>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            position: "absolute",
            bottom: "-12px",
            insetInlineEnd: "16px",
            backgroundColor: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: SDRadii.trustBadge,
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: SDShadows.trustBadge,
            zIndex: 2,
          }}
        >
          <ShieldIcon sx={{ fontSize: 14, color: COLORS.success }} />
          <Typography sx={{ fontSize: "12px", fontWeight: 700, color: COLORS.success }}>
            {t("storyDetail.therapistApproved")}
          </Typography>
        </Box>
      </Box>
    </>
  );
}
