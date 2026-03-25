import {
  Box,
  Typography,
  Container,
  Button,
  Chip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  useMediaQuery,
  IconButton,
} from "@mui/material";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../firebase";
import { useLangNavigate } from "../i18n/navigation";
import { useTranslation } from "../i18n/useTranslation";
import { useLanguage } from "../i18n/context/useLanguage";
import { resolveLocalizedField } from "../api/stories";
import type { Story } from "../api/stories";
import StoryGridCard from "../components/StoryGridCard";

// MUI icons
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import FaceIcon from "@mui/icons-material/Face";
import TranslateIcon from "@mui/icons-material/Translate";
import PsychologyIcon from "@mui/icons-material/Psychology";
import PreviewIcon from "@mui/icons-material/Preview";
import LocalPrintshopOutlinedIcon from "@mui/icons-material/LocalPrintshopOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VerifiedIcon from "@mui/icons-material/Verified";
import GroupsIcon from "@mui/icons-material/Groups";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

// ─── Types ───────────────────────────────────────────────────────────
interface StoryDetail {
  id: string;
  title: string;
  shortDescription?: string;
  coverImage?: string;
  ageGroup?: string;
  topicKey?: string;
  primaryTopic?: string;
  specificSituation?: string;
  displayTopic?: string;
  language?: string;
  previewPageCount?: number;
  totalPageCount?: number;
  pages?: Array<{
    pageNumber: number;
    imagePromptTemplate?: string;
    emotionalTone?: string;
  }>;
  previewImages?: string[];
}

// ─── Age formatting helper ───────────────────────────────────────────
function formatAge(ageGroup?: string): string {
  if (!ageGroup) return "";
  const cleaned = ageGroup.replace(/_/g, "–").replace(/-/g, "–");
  return cleaned;
}

// ─── Component ───────────────────────────────────────────────────────
export default function StoryDetailPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useLangNavigate();
  const t = useTranslation();
  const { language, direction, isRTL } = useLanguage();

  const [story, setStory] = useState<StoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Related stories
  const [relatedStories, setRelatedStories] = useState<Story[]>([]);

  // ── Brand colors ───────────────────────────────────────────────────
  const brandPrimary = "#824D5C";
  const brandPrimaryHover = "#6f404d";
  const brandBg = "#FAF7F5";
  const brandSurface = "#FFFFFF";

  // ── Load story ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!storyId) {
      navigate("/books");
      return;
    }

    let cancelled = false;

    const fetchStory = async () => {
      try {
        setLoading(true);
        setError(null);

        const storyRef = doc(db, "story_templates", storyId);
        const storySnap = await getDoc(storyRef);

        if (!storySnap.exists()) {
          if (!cancelled) setError("not_found");
          return;
        }

        const data = storySnap.data();

        if (!cancelled) {
          setStory({
            id: storySnap.id,
            title: resolveLocalizedField(data.title) || data.title || "",
            shortDescription: resolveLocalizedField(data.shortDescription),
            coverImage: data.coverImage || data.coverImageUrl,
            ageGroup:
              data.ageGroup ||
              data.targetAgeGroup ||
              data.generationConfig?.targetAgeGroup,
            topicKey: data.topicKey || data.primaryTopic,
            primaryTopic: data.primaryTopic,
            specificSituation: data.specificSituation,
            displayTopic: resolveLocalizedField(data.displayTopic),
            language: data.language || data.generationConfig?.language,
            previewPageCount: data.previewPageCount,
            totalPageCount: data.totalPageCount,
            pages: data.pages,
            previewImages: data.previewImages,
          });
        }
      } catch (err) {
        console.error("Error fetching story detail:", err);
        if (!cancelled) setError("load_error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStory();
    return () => { cancelled = true; };
  }, [storyId]);

  // ── Load related stories ───────────────────────────────────────────
  useEffect(() => {
    if (!story) return;

    let cancelled = false;

    const fetchRelated = async () => {
      try {
        // Try to find stories with same topic
        const topicField = story.primaryTopic || story.topicKey;
        let relatedDocs: Story[] = [];

        if (topicField) {
          const q1 = query(
            collection(db, "story_templates"),
            where("status", "==", "approved"),
            where("primaryTopic", "==", topicField),
            limit(6)
          );
          const snap1 = await getDocs(q1);
          relatedDocs = snap1.docs
            .filter((d) => d.id !== storyId)
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                title: resolveLocalizedField(data.title) || data.title || "",
                shortDescription: resolveLocalizedField(data.shortDescription),
                coverImage: data.coverImage || data.coverImageUrl,
                targetAgeGroup:
                  data.targetAgeGroup ||
                  data.ageGroup ||
                  data.generationConfig?.targetAgeGroup,
                topicKey: data.topicKey || data.primaryTopic,
              };
            });
        }

        // If not enough, supplement with same age group
        if (relatedDocs.length < 3 && story.ageGroup) {
          const q2 = query(
            collection(db, "story_templates"),
            where("status", "==", "approved"),
            limit(8)
          );
          const snap2 = await getDocs(q2);
          const existingIds = new Set(relatedDocs.map((s) => s.id));
          existingIds.add(storyId || "");

          snap2.docs.forEach((d) => {
            if (existingIds.has(d.id) || relatedDocs.length >= 3) return;
            const data = d.data();
            relatedDocs.push({
              id: d.id,
              title: resolveLocalizedField(data.title) || data.title || "",
              shortDescription: resolveLocalizedField(data.shortDescription),
              coverImage: data.coverImage || data.coverImageUrl,
              targetAgeGroup:
                data.targetAgeGroup ||
                data.ageGroup ||
                data.generationConfig?.targetAgeGroup,
              topicKey: data.topicKey || data.primaryTopic,
            });
          });
        }

        if (!cancelled) {
          setRelatedStories(relatedDocs.slice(0, 3));
        }
      } catch (err) {
        console.error("Error fetching related stories:", err);
      }
    };

    fetchRelated();
    return () => { cancelled = true; };
  }, [story, storyId]);

  // ── Gallery images ─────────────────────────────────────────────────
  const galleryImages = useMemo(() => {
    const images: { src: string; label: string }[] = [];

    if (story?.coverImage) {
      images.push({
        src: story.coverImage,
        label: language === "he" ? "כריכה" : language === "ar" ? "الغلاف" : "Cover",
      });
    }

    // Add preview images if available
    if (story?.previewImages && story.previewImages.length > 0) {
      story.previewImages.forEach((img, i) => {
        images.push({
          src: img,
          label:
            language === "he"
              ? `עמוד ${i + 1}`
              : language === "ar"
              ? `صفحة ${i + 1}`
              : `Page ${i + 1}`,
        });
      });
    }

    // If no images at all, add a placeholder
    if (images.length === 0) {
      images.push({
        src: "/book-placeholder.jpg",
        label: language === "he" ? "כריכה" : language === "ar" ? "الغلاف" : "Cover",
      });
    }

    return images;
  }, [story, language]);

  // ── Derived content ────────────────────────────────────────────────
  const topicLabel =
    story?.displayTopic || story?.specificSituation || story?.topicKey || story?.primaryTopic || "";

  const emotionalSubtitle = topicLabel
    ? t("storyDetail.emotionalSubtitleTemplate", { topic: topicLabel })
    : t("storyDetail.emotionalSubtitleDefault");

  const description =
    story?.shortDescription ||
    (topicLabel && story?.ageGroup
      ? t("storyDetail.descriptionTemplate", {
          age: formatAge(story.ageGroup),
          topic: topicLabel,
        })
      : t("storyDetail.descriptionDefault"));

  // ── Loading / Error states ─────────────────────────────────────────
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 12, textAlign: "center" }}>
        <CircularProgress sx={{ color: brandPrimary }} />
        <Typography sx={{ mt: 2, color: "text.secondary" }}>
          {t("storyDetail.loading")}
        </Typography>
      </Container>
    );
  }

  if (error || !story) {
    return (
      <Container maxWidth="md" sx={{ py: 12, textAlign: "center" }}>
        <AutoStoriesOutlinedIcon
          sx={{ fontSize: 64, color: "text.disabled", mb: 2 }}
        />
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          {t("storyDetail.notFound")}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {t("storyDetail.notFoundMessage")}
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate("/books")}
          sx={{
            backgroundColor: brandPrimary,
            "&:hover": { backgroundColor: brandPrimaryHover },
            borderRadius: 3,
            px: 4,
            py: 1.2,
          }}
        >
          {t("storyDetail.backToCatalog")}
        </Button>
      </Container>
    );
  }

  // ── Main render ────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        backgroundColor: brandBg,
        minHeight: "100vh",
        direction,
        pb: 8,
      }}
    >
      {/* ─── Breadcrumb / back ─────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ pt: 3, pb: 1 }}>
        <Button
          startIcon={
            <ArrowBackIcon sx={{ transform: isRTL ? "rotate(180deg)" : "none" }} />
          }
          onClick={() => navigate("/books")}
          sx={{
            color: "text.secondary",
            textTransform: "none",
            fontWeight: 500,
            fontSize: "0.9rem",
            "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" },
          }}
        >
          {t("storyDetail.backToCatalog")}
        </Button>
      </Container>

      {/* ─── Hero Section: Gallery + Info ─────────────────────────── */}
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: { xs: 4, md: 6 },
            alignItems: "flex-start",
          }}
        >
          {/* ═══════ LEFT: Gallery ═══════════════════════════════════ */}
          <Box
            sx={{
              flex: isMobile ? "none" : "0 0 55%",
              width: isMobile ? "100%" : "55%",
            }}
          >
            {/* Gallery label */}
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mb: 1.5,
                fontWeight: 600,
                color: "text.secondary",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                fontSize: "0.75rem",
              }}
            >
              {t("storyDetail.galleryLabel")}
            </Typography>

            {/* Main image */}
            <Box
              sx={{
                width: "100%",
                aspectRatio: "4 / 3",
                borderRadius: 4,
                overflow: "hidden",
                backgroundColor: theme.palette.grey[100],
                boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
                mb: 2,
                position: "relative",
              }}
            >
              <Box
                component="img"
                src={galleryImages[activeImageIndex]?.src || "/book-placeholder.jpg"}
                alt={story.title}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  e.currentTarget.src = "/book-placeholder.jpg";
                }}
              />
            </Box>

            {/* Thumbnails */}
            {galleryImages.length > 1 && (
              <Box
                sx={{
                  display: "flex",
                  gap: 1.5,
                  overflowX: "auto",
                  pb: 1,
                }}
              >
                {galleryImages.map((img, idx) => (
                  <Box
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    sx={{
                      width: 72,
                      height: 54,
                      borderRadius: 2,
                      overflow: "hidden",
                      flexShrink: 0,
                      cursor: "pointer",
                      border:
                        idx === activeImageIndex
                          ? `3px solid ${brandPrimary}`
                          : "3px solid transparent",
                      opacity: idx === activeImageIndex ? 1 : 0.6,
                      transition: "all 0.2s ease",
                      "&:hover": {
                        opacity: 1,
                        transform: "scale(1.05)",
                      },
                    }}
                  >
                    <Box
                      component="img"
                      src={img.src}
                      alt={img.label}
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        e.currentTarget.src = "/book-placeholder.jpg";
                      }}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* ═══════ RIGHT: Story Info + CTA ═════════════════════════ */}
          <Box
            sx={{
              flex: isMobile ? "none" : "1 1 45%",
              width: isMobile ? "100%" : "45%",
            }}
          >
            {/* 1. Title */}
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                mb: 1,
                fontSize: { xs: "1.75rem", md: "2.25rem" },
                lineHeight: 1.3,
              }}
            >
              {story.title}
            </Typography>

            {/* 2. Emotional subtitle */}
            <Typography
              sx={{
                color: "text.secondary",
                fontSize: "1rem",
                lineHeight: 1.7,
                mb: 2.5,
              }}
            >
              {emotionalSubtitle}
            </Typography>

            {/* 3. Badges / Chips */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3 }}>
              {story.ageGroup && (
                <Chip
                  label={t("storyDetail.badges.age", { age: formatAge(story.ageGroup) })}
                  size="small"
                  sx={{
                    backgroundColor: "rgba(130,77,92,0.08)",
                    color: brandPrimary,
                    fontWeight: 600,
                    borderRadius: 2,
                  }}
                />
              )}
              {topicLabel && (
                <Chip
                  label={topicLabel}
                  size="small"
                  sx={{
                    backgroundColor: "rgba(97,120,145,0.10)",
                    color: "#617891",
                    fontWeight: 600,
                    borderRadius: 2,
                  }}
                />
              )}
              <Chip
                label={t("storyDetail.badges.personalized")}
                size="small"
                sx={{
                  backgroundColor: "rgba(76,175,80,0.08)",
                  color: "#388E3C",
                  fontWeight: 600,
                  borderRadius: 2,
                }}
              />
              <Chip
                label={t("storyDetail.badges.previewFirst")}
                size="small"
                sx={{
                  backgroundColor: "rgba(255,152,0,0.08)",
                  color: "#E65100",
                  fontWeight: 600,
                  borderRadius: 2,
                }}
              />
              <Chip
                label={t("storyDetail.badges.therapeutic")}
                size="small"
                sx={{
                  backgroundColor: "rgba(156,39,176,0.08)",
                  color: "#7B1FA2",
                  fontWeight: 600,
                  borderRadius: 2,
                }}
              />
            </Box>

            {/* 4. Short description */}
            <Typography
              sx={{
                color: "text.secondary",
                lineHeight: 1.8,
                mb: 3,
                fontSize: "0.95rem",
              }}
            >
              {description}
            </Typography>

            {/* 5. Features list */}
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, mb: 1.5, color: "text.primary" }}
              >
                {t("storyDetail.features.title")}
              </Typography>
              {[
                { icon: <FaceIcon sx={{ fontSize: 20 }} />, text: t("storyDetail.features.personalizedName") },
                { icon: <AutoStoriesOutlinedIcon sx={{ fontSize: 20 }} />, text: t("storyDetail.features.childImage") },
                { icon: <TranslateIcon sx={{ fontSize: 20 }} />, text: t("storyDetail.features.languages") },
                { icon: <PsychologyIcon sx={{ fontSize: 20 }} />, text: t("storyDetail.features.therapeutic") },
                { icon: <PreviewIcon sx={{ fontSize: 20 }} />, text: t("storyDetail.features.preview") },
                { icon: <LocalPrintshopOutlinedIcon sx={{ fontSize: 20 }} />, text: t("storyDetail.features.digitalPrint") },
              ].map((feat, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    py: 0.8,
                  }}
                >
                  <Box sx={{ color: brandPrimary, display: "flex" }}>{feat.icon}</Box>
                  <Typography sx={{ fontSize: "0.9rem", color: "text.secondary" }}>
                    {feat.text}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* 6. Main CTA Button */}
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={() => navigate(`/stories/${story.id}/personalize`)}
              sx={{
                backgroundColor: brandPrimary,
                "&:hover": {
                  backgroundColor: brandPrimaryHover,
                  transform: "translateY(-1px)",
                  boxShadow: "0 6px 24px rgba(130,77,92,0.35)",
                },
                borderRadius: 3,
                py: 1.8,
                fontSize: "1.05rem",
                fontWeight: 700,
                textTransform: "none",
                boxShadow: "0 4px 16px rgba(130,77,92,0.25)",
                transition: "all 0.25s ease",
                mb: 2,
              }}
            >
              {t("storyDetail.personalizeButton")}
            </Button>

            {/* 7. Secondary actions */}
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<FavoriteBorderIcon />}
                sx={{
                  flex: 1,
                  borderColor: theme.palette.divider,
                  color: "text.secondary",
                  textTransform: "none",
                  borderRadius: 2.5,
                  fontWeight: 500,
                  fontSize: "0.85rem",
                  "&:hover": {
                    borderColor: brandPrimary,
                    color: brandPrimary,
                    backgroundColor: "rgba(130,77,92,0.04)",
                  },
                }}
              >
                {t("storyDetail.addToFavorites")}
              </Button>
              <Button
                variant="outlined"
                startIcon={<VisibilityOutlinedIcon />}
                sx={{
                  flex: 1,
                  borderColor: theme.palette.divider,
                  color: "text.secondary",
                  textTransform: "none",
                  borderRadius: 2.5,
                  fontWeight: 500,
                  fontSize: "0.85rem",
                  "&:hover": {
                    borderColor: brandPrimary,
                    color: brandPrimary,
                    backgroundColor: "rgba(130,77,92,0.04)",
                  },
                }}
              >
                {t("storyDetail.previewDigital")}
              </Button>
            </Box>
          </Box>
        </Box>
      </Container>

      {/* ─── Trust Strip ──────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ mt: 8 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr 1fr",
              md: "repeat(4, 1fr)",
            },
            gap: 2.5,
          }}
        >
          {[
            {
              icon: <PsychologyIcon sx={{ fontSize: 28 }} />,
              text: t("storyDetail.trust.professional"),
            },
            {
              icon: <FaceIcon sx={{ fontSize: 28 }} />,
              text: t("storyDetail.trust.personalized"),
            },
            {
              icon: <TranslateIcon sx={{ fontSize: 28 }} />,
              text: t("storyDetail.trust.threeLanguages"),
            },
            {
              icon: <PreviewIcon sx={{ fontSize: 28 }} />,
              text: t("storyDetail.trust.previewFirst"),
            },
          ].map((item, i) => (
            <Box
              key={i}
              sx={{
                backgroundColor: brandSurface,
                borderRadius: 3,
                p: 2.5,
                textAlign: "center",
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                border: `1px solid ${theme.palette.divider}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Box sx={{ color: brandPrimary }}>{item.icon}</Box>
              <Typography
                sx={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "text.secondary",
                  lineHeight: 1.4,
                }}
              >
                {item.text}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>

      {/* ─── Accordion Section ────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ mt: 6 }}>
        <Box sx={{ maxWidth: 800, mx: "auto" }}>
          {[
            {
              title: t("storyDetail.accordion.howPersonalized"),
              content: t("storyDetail.accordion.howPersonalizedContent"),
            },
            {
              title: t("storyDetail.accordion.whatAbout"),
              content: topicLabel
                ? t("storyDetail.accordion.whatAboutTemplate", { topic: topicLabel })
                : t("storyDetail.accordion.whatAboutDefault"),
            },
            {
              title: t("storyDetail.accordion.whoFor"),
              content:
                topicLabel && story.ageGroup
                  ? t("storyDetail.accordion.whoForTemplate", {
                      age: formatAge(story.ageGroup),
                      topic: topicLabel,
                    })
                  : t("storyDetail.accordion.whoForDefault"),
            },
            {
              title: t("storyDetail.accordion.sizeQuality"),
              content: t("storyDetail.accordion.sizeQualityContent"),
            },
          ].map((section, i) => (
            <Accordion
              key={i}
              elevation={0}
              defaultExpanded={i === 0}
              sx={{
                backgroundColor: brandSurface,
                borderRadius: "16px !important",
                mb: 1.5,
                border: `1px solid ${theme.palette.divider}`,
                "&::before": { display: "none" },
                "&.Mui-expanded": { margin: "0 0 12px 0" },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: brandPrimary }} />}
                sx={{
                  px: 3,
                  py: 0.5,
                  "& .MuiAccordionSummary-content": { my: 1.5 },
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
                  {section.title}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, pb: 3, pt: 0 }}>
                <Typography
                  sx={{ color: "text.secondary", lineHeight: 1.8, fontSize: "0.9rem" }}
                >
                  {section.content}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Container>

      {/* ─── Related Stories ──────────────────────────────────────── */}
      {relatedStories.length > 0 && (
        <Container maxWidth="lg" sx={{ mt: 8 }}>
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, mb: 3, textAlign: "center" }}
          >
            {t("storyDetail.related.title")}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                md: "repeat(3, 1fr)",
              },
              gap: 4,
            }}
          >
            {relatedStories.map((rs) => (
              <StoryGridCard
                key={rs.id}
                title={rs.title}
                description={rs.shortDescription}
                imageUrl={rs.coverImage}
                onClick={() => {
                  navigate(`/stories/${rs.id}`);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            ))}
          </Box>
        </Container>
      )}
    </Box>
  );
}
