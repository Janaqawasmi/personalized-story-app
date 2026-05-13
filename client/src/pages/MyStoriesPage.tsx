import { useState, useEffect } from "react";
import { Box, Typography, Button, CircularProgress, Tabs, Tab } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { useLangNavigate } from "../i18n/navigation";
import { useTranslation } from "../i18n/useTranslation";
import { useLanguage } from "../i18n/context/useLanguage";
import { useMyPreviews } from "../hooks/useMyPreviews";
import { getPreviewPersonalization } from "../api/caregiverApi";
import { getStoryPersonalizationStorageKey } from "../utils/storyPersonalization";
import { useAuth } from "../contexts/AuthContext";
import { listFavorites, type FavoriteStory } from "../api/favorites";
import StoryGridCard from "../components/StoryGridCard";
import { storyCatalogGridLooseSx } from "../components/catalog/catalogStyles";
import AutoAwesomeOutlined from "@mui/icons-material/AutoAwesomeOutlined";
import BookOutlined from "@mui/icons-material/BookOutlined";
import FavoriteBorderOutlined from "@mui/icons-material/FavoriteBorderOutlined";

type TabId = "purchased" | "previews" | "favorites";

function tabFromSearchParams(searchParams: URLSearchParams): TabId {
  const q = searchParams.get("tab");
  if (q === "previews") return "previews";
  if (q === "favorites") return "favorites";
  return "purchased";
}

export default function MyStoriesPage() {
  const t = useTranslation();
  const navigate = useLangNavigate();
  const { direction } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = tabFromSearchParams(searchParams);
  const { previews, loading: previewsLoading } = useMyPreviews();
  const [navigatingPreviewId, setNavigatingPreviewId] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteStory[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== "favorites" || !currentUser) return;
    let cancelled = false;
    setFavoritesLoading(true);
    setFavoritesError(null);
    listFavorites(currentUser.uid)
      .then((items) => {
        if (!cancelled) setFavorites(items);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg =
            err && typeof err === "object" && "message" in err
              ? String((err as { message?: string }).message)
              : "Failed to load favorites";
          setFavoritesError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setFavoritesLoading(false);
      });
    return () => {
      cancelled = true;
      setFavoritesLoading(false);
    };
  }, [activeTab, currentUser]);

  const setActiveTab = (next: TabId) => {
    setSearchParams(next !== "purchased" ? { tab: next } : {}, { replace: true });
  };

  const handleOpenPreview = async (previewId: string, templateId: string) => {
    setNavigatingPreviewId(previewId);
    try {
      const p = await getPreviewPersonalization(previewId);
      const storageKey = getStoryPersonalizationStorageKey(templateId);
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          status: "completed",
          data: {
            childName: p.childFirstName,
            gender: p.childGender,
            childAgeGroup: p.childAgeGroup,
            photoPreviewUrl: "",
            visualStyle: "watercolor",
          },
          updatedAt: Date.now(),
        })
      );
      localStorage.setItem(`dammah.preview.${templateId}`, previewId);
    } catch {
      // navigate anyway — reader has fallbacks
    } finally {
      setNavigatingPreviewId(null);
    }
    navigate(`/stories/${templateId}/read?previewId=${encodeURIComponent(previewId)}`);
  };

  return (
    <Box
      dir={direction}
      sx={{
        minHeight: "100vh",
        backgroundColor: "#F7F2EC",
        pt: { xs: 9, md: 10 },
        pb: 8,
        px: { xs: 2, md: 4 },
      }}
    >
      <Box sx={{ maxWidth: 760, mx: "auto" }}>
        <Typography
          sx={{
            fontFamily: "'Playfair Display', serif",
            fontSize: { xs: 26, md: 32 },
            fontWeight: 700,
            color: "#3C1C28",
            mb: 0.5,
          }}
        >
          {t("pages.myStories.title")}
        </Typography>
        <Typography sx={{ fontSize: 14, color: "#9a8a92", mb: 3 }}>
          {t("pages.myStories.subtitle")}
        </Typography>

        <Tabs
          value={activeTab}
          onChange={(_, v: TabId) => setActiveTab(v)}
          sx={{
            mb: 3,
            borderBottom: "1px solid #ddd4ca",
            "& .MuiTab-root": {
              textTransform: "none",
              fontSize: 14,
              fontWeight: 400,
              color: "#9a8a92",
              minHeight: 44,
              gap: "6px",
            },
            "& .Mui-selected": { color: "#824D5C", fontWeight: 600 },
            "& .MuiTabs-indicator": { backgroundColor: "#824D5C" },
          }}
        >
          <Tab
            value="purchased"
            label={t("pages.myStories.tabs.purchased")}
            icon={<BookOutlined sx={{ fontSize: 16 }} />}
            iconPosition="start"
          />
          <Tab
            value="previews"
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {t("pages.myStories.tabs.previews")}
                {previews.length > 0 && (
                  <Box
                    sx={{
                      fontSize: 10,
                      fontWeight: 600,
                      px: "7px",
                      py: "1px",
                      borderRadius: "999px",
                      background: "#FBEAF0",
                      color: "#824D5C",
                      border: "0.5px solid #ED93B1",
                      lineHeight: 1.6,
                    }}
                  >
                    {previews.length}
                  </Box>
                )}
              </Box>
            }
            icon={<AutoAwesomeOutlined sx={{ fontSize: 16 }} />}
            iconPosition="start"
          />
          <Tab
            value="favorites"
            label={t("pages.myStories.tabs.favorites")}
            icon={<FavoriteBorderOutlined sx={{ fontSize: 16 }} />}
            iconPosition="start"
          />
        </Tabs>

        {activeTab === "purchased" && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography sx={{ fontSize: 36, mb: 2 }}>📚</Typography>
            <Typography sx={{ fontWeight: 600, mb: 1, color: "#3C1C28" }}>
              {t("pages.myStories.purchased.emptyTitle")}
            </Typography>
            <Typography sx={{ fontSize: 14, color: "#9a8a92", mb: 3 }}>
              {t("pages.myStories.purchased.emptyBody")}
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate("/books")}
              sx={{
                backgroundColor: "#824D5C",
                "&:hover": { backgroundColor: "#6f404d" },
                textTransform: "none",
                borderRadius: "12px",
                px: 3,
              }}
            >
              {t("pages.myStories.purchased.browseCta")}
            </Button>
          </Box>
        )}

        {activeTab === "previews" && (
          <Box>
            {previewsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress sx={{ color: "#824D5C" }} />
              </Box>
            ) : previews.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography sx={{ fontSize: 36, mb: 2 }}>✨</Typography>
                <Typography sx={{ fontWeight: 600, mb: 1, color: "#3C1C28" }}>
                  {t("pages.myStories.previews.emptyTitle")}
                </Typography>
                <Typography sx={{ fontSize: 14, color: "#9a8a92", mb: 3 }}>
                  {t("pages.myStories.previews.emptyBody")}
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => navigate("/books")}
                  sx={{
                    backgroundColor: "#824D5C",
                    "&:hover": { backgroundColor: "#6f404d" },
                    textTransform: "none",
                    borderRadius: "12px",
                    px: 3,
                  }}
                >
                  {t("pages.myStories.previews.browseCta")}
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {previews.map((preview) => (
                  <Box
                    key={preview.previewId}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      p: 2,
                      background: "#fff",
                      borderRadius: "16px",
                      border: "1px solid #ede5df",
                      boxShadow: "0 2px 12px rgba(28,17,24,0.05)",
                    }}
                  >
                    <Box
                      sx={{
                        width: 54,
                        height: 70,
                        borderRadius: "10px",
                        background:
                          "linear-gradient(145deg, #3d1a2a 0%, #2a1435 40%, #16093a 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        flexShrink: 0,
                      }}
                    >
                      🌟
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{ fontSize: 14, fontWeight: 600, color: "#3C1C28", mb: 0.5 }}
                      >
                        {preview.templateTitle || t("pages.myStories.previews.untitledStory")}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: "#9a8a92", mb: 1 }}>
                        {t("pages.myStories.previews.personalizedFor", {
                          name: preview.childFirstName,
                        })}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        <Box
                          sx={{
                            fontSize: 10,
                            px: "8px",
                            py: "2px",
                            borderRadius: "999px",
                            background: "#EAF3DE",
                            color: "#27500A",
                            border: "0.5px solid #97C459",
                            fontWeight: 500,
                          }}
                        >
                          {t("pages.myStories.previews.savedBadge")}
                        </Box>
                        {preview.language && (
                          <Box
                            sx={{
                              fontSize: 10,
                              px: "8px",
                              py: "2px",
                              borderRadius: "999px",
                              border: "0.5px solid #ddd4ca",
                              color: "#9a8a92",
                              fontWeight: 500,
                            }}
                          >
                            {preview.language.toUpperCase()}
                          </Box>
                        )}
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        alignItems: "flex-end",
                        flexShrink: 0,
                      }}
                    >
                      <Button
                        size="small"
                        variant="contained"
                        disabled={navigatingPreviewId === preview.previewId}
                        onClick={() =>
                          handleOpenPreview(preview.previewId, preview.templateId)
                        }
                        sx={{
                          backgroundColor: "#824D5C",
                          "&:hover": { backgroundColor: "#6f404d" },
                          textTransform: "none",
                          borderRadius: "10px",
                          fontSize: 12,
                          px: 2,
                          py: 0.75,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {navigatingPreviewId === preview.previewId
                          ? t("pages.myStories.previews.opening")
                          : t("pages.myStories.previews.readCta")}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(`/stories/${preview.templateId}/personalize`)}
                        sx={{
                          borderColor: "#824D5C",
                          color: "#824D5C",
                          "&:hover": {
                            borderColor: "#6f404d",
                            backgroundColor: "rgba(130,77,92,0.06)",
                          },
                          textTransform: "none",
                          borderRadius: "10px",
                          fontSize: 12,
                          px: 2,
                          py: 0.75,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t("pages.myStories.previews.buyCta")}
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        {activeTab === "favorites" && (
          <Box>
            {favoritesLoading && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress sx={{ color: "#824D5C" }} />
              </Box>
            )}

            {favoritesError && !favoritesLoading && (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography sx={{ fontSize: 14, color: "error.main" }}>{favoritesError}</Typography>
              </Box>
            )}

            {!favoritesLoading && !favoritesError && favorites.length === 0 && (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography sx={{ fontSize: 36, mb: 2 }}>🤍</Typography>
                <Typography sx={{ fontWeight: 600, mb: 1, color: "#3C1C28" }}>
                  {t("pages.myStories.favorites.emptyTitle")}
                </Typography>
                <Typography sx={{ fontSize: 14, color: "#9a8a92", mb: 3 }}>
                  {t("pages.myStories.favorites.emptyBody")}
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => navigate("/books")}
                  sx={{
                    backgroundColor: "#824D5C",
                    "&:hover": { backgroundColor: "#6f404d" },
                    textTransform: "none",
                    borderRadius: "12px",
                    px: 3,
                  }}
                >
                  {t("pages.myStories.favorites.browseCta")}
                </Button>
              </Box>
            )}

            {!favoritesLoading && !favoritesError && favorites.length > 0 && (
              <Box sx={storyCatalogGridLooseSx}>
                {favorites.map((fav) => (
                  <StoryGridCard
                    key={fav.storyId}
                    story={{
                      id: fav.storyId,
                      title: fav.title || t("pages.favorites.fallbackStoryTitle"),
                      shortDescription:
                        fav.ageGroup || fav.category || fav.topic
                          ? String(fav.ageGroup || fav.category || fav.topic)
                          : undefined,
                      coverImage: fav.coverImage || undefined,
                      ageGroup: fav.ageGroup ?? undefined,
                      topicKey: fav.topic ?? undefined,
                      primaryTopic: fav.category ?? undefined,
                      category: fav.category ?? null,
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
