import { useState, useEffect } from "react";
import { Box, Typography, Button, CircularProgress, Tabs, Tab, Chip } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { useLangNavigate } from "../i18n/navigation";
import { useTranslation } from "../i18n/useTranslation";
import { useLanguage } from "../i18n/context/useLanguage";
import { useMyPreviews } from "../hooks/useMyPreviews";
import {
  addToCart,
  getPreviewPersonalization,
  getPurchasedStories,
  type PurchasedStoryItem,
} from "../api/caregiverApi";
import type { PurchaseFormat, ShippingDetails } from "../types/commerce";
import { getStoryPersonalizationStorageKey } from "../utils/storyPersonalization";
import { getPreviewCartState } from "../utils/previewCartState";
import { getPreviewSubtitleKey } from "../utils/previewSubtitle";
import {
  fetchPurchaseOptions,
  getPrintOrderStatusLabelKey,
  getPurchaseTypeLabelKey,
  type PurchaseOptionData,
} from "../utils/purchaseOptions";
import { useAuth } from "../contexts/AuthContext";
import { listFavorites, type FavoriteStory } from "../api/favorites";
import StoryGridCard from "../components/StoryGridCard";
import { storyCatalogGridLooseSx } from "../components/catalog/catalogStyles";
import AutoAwesomeOutlined from "@mui/icons-material/AutoAwesomeOutlined";
import BookOutlined from "@mui/icons-material/BookOutlined";
import FavoriteBorderOutlined from "@mui/icons-material/FavoriteBorderOutlined";
import PurchaseFormatDialog from "../components/commerce/PurchaseFormatDialog";

type TabId = "purchased" | "previews" | "favorites";

function PurchasedStoryCard({
  story,
  t,
  onRead,
}: {
  story: PurchasedStoryItem;
  t: (k: string, vars?: Record<string, string | number>) => string;
  onRead: () => void;
}) {
  const isPrintPurchase = story.purchaseFormat === "print";
  const isAccessible = story.isAccessible && story.generationStatus === "completed";
  const isGenerating = story.generationStatus === "in_progress" || story.generationStatus === "pending";
  const isPartiallyFailed = story.generationStatus === "partially_failed";
  const isFailed = story.generationStatus === "failed";

  let statusChipLabel = "";
  let statusChipColor: "success" | "warning" | "error" | "default" = "default";
  if (isPrintPurchase) {
    statusChipLabel = t(getPrintOrderStatusLabelKey(story.printOrderStatus).key);
    statusChipColor =
      story.printOrderStatus === "completed"
        ? "success"
        : story.printOrderStatus === "cancelled"
          ? "error"
          : "default";
  } else if (isAccessible) {
    statusChipLabel = t("pages.myStories.purchased.readingLabel") || "Ready";
    statusChipColor = "success";
  } else if (isGenerating) {
    statusChipLabel = t("pages.myStories.purchased.generatingLabel") || "Generating…";
    statusChipColor = "default";
  } else if (isPartiallyFailed) {
    statusChipLabel = "⚠ Partial failure";
    statusChipColor = "warning";
  } else if (isFailed) {
    statusChipLabel = "✗ Failed";
    statusChipColor = "error";
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        p: 2,
        background: "#fff",
        borderRadius: "16px",
        border: "1px solid #ede5df",
        boxShadow: "0 2px 12px rgba(28,17,24,0.05)",
        opacity: isAccessible ? 1 : 0.85,
      }}
    >
      {/* Cover thumbnail */}
      <Box
        sx={{
          width: 54,
          height: 70,
          borderRadius: "10px",
          background: story.coverImageUrl
            ? `url(${story.coverImageUrl}) center/cover no-repeat`
            : "linear-gradient(145deg, #3d1a2a 0%, #2a1435 40%, #16093a 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        {!story.coverImageUrl && "📖"}
      </Box>

      {/* Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#3C1C28", mb: 0.5 }} noWrap>
          {story.templateTitle || "Personalized Story"}
        </Typography>
        <Typography sx={{ fontSize: 12, color: "#9a8a92", mb: 1 }}>
          {(() => {
            const subtitle = getPreviewSubtitleKey(story.childFirstName);
            return t(subtitle.key, subtitle.params);
          })()}
        </Typography>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          <Chip
            label={t(
              getPurchaseTypeLabelKey(story.purchaseFormat, story.itemType, story.childFirstName)
                .key,
            )}
            size="small"
            variant="outlined"
            sx={{ fontSize: 10, height: 20 }}
          />
          {statusChipLabel && (
            <Chip
              label={statusChipLabel}
              size="small"
              color={statusChipColor}
              sx={{ fontSize: 10, height: 20 }}
            />
          )}
          {isGenerating && (
            <CircularProgress size={12} sx={{ color: "#824D5C" }} />
          )}
          {isPrintPurchase && isGenerating && (
            <Typography sx={{ fontSize: 10, color: "#9a8a92" }}>
              {t("pages.myStories.purchased.printGeneratingNote")}
            </Typography>
          )}
          {(isPartiallyFailed || isFailed) && (
            <Typography sx={{ fontSize: 10, color: "#9a8a92" }}>
              {t(`pages.myStories.purchased.${isPartiallyFailed ? "partiallyFailedLabel" : "failedLabel"}`)}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Action */}
      <Box sx={{ flexShrink: 0 }}>
        {!isPrintPurchase && isAccessible ? (
          <Button
            size="small"
            variant="contained"
            onClick={onRead}
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
            {t("pages.myStories.purchased.readCta") || "Read"}
          </Button>
        ) : (isPartiallyFailed || isFailed) ? (
          <Button
            size="small"
            variant="outlined"
            href="mailto:support@dammah.app"
            sx={{
              borderColor: "#824D5C",
              color: "#824D5C",
              "&:hover": { borderColor: "#6f404d", backgroundColor: "rgba(130,77,92,0.06)" },
              textTransform: "none",
              borderRadius: "10px",
              fontSize: 12,
              px: 2,
              py: 0.75,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {t("pages.myStories.purchased.contactSupport") || "Contact support"}
          </Button>
        ) : null}
      </Box>
    </Box>
  );
}

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
  const { previews, loading: previewsLoading, error: previewsError } = useMyPreviews();
  const [navigatingPreviewId, setNavigatingPreviewId] = useState<string | null>(null);
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);
  const [purchasedStories, setPurchasedStories] = useState<PurchasedStoryItem[]>([]);
  const [purchasedLoading, setPurchasedLoading] = useState(false);
  const [purchasedError, setPurchasedError] = useState<string | null>(null);
  const [formatDialogOpen, setFormatDialogOpen] = useState(false);
  const [formatOptionsLoading, setFormatOptionsLoading] = useState(false);
  const [formatOptions, setFormatOptions] = useState<PurchaseOptionData | null>(null);
  const [pendingCartPreview, setPendingCartPreview] = useState<{ previewId: string; templateId: string } | null>(null);
  const [addingToCartFormat, setAddingToCartFormat] = useState<PurchaseFormat | null>(null);
  const { currentUser } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteStory[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== "purchased" || !currentUser) return;
    let cancelled = false;
    setPurchasedLoading(true);
    setPurchasedError(null);
    getPurchasedStories()
      .then((items) => {
        if (!cancelled) setPurchasedStories(items);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg =
            err && typeof err === "object" && "message" in err
              ? String((err as { message?: string }).message)
              : "Failed to load purchased stories";
          setPurchasedError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setPurchasedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, currentUser]);

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

  // Adds a "ready" preview to the cart. Does NOT mark it as purchased —
  // that only happens after checkout + payment (see checkout.router.ts /
  // processPaymentEvent). The preview stays in "My previews" with an
  // "In cart" label until the caregiver actually pays.
  const handleOpenFormatDialog = async (previewId: string, templateId: string) => {
    setAddingToCartId(previewId);
    setPendingCartPreview({ previewId, templateId });
    setFormatDialogOpen(true);
    setFormatOptionsLoading(true);

    try {
      setFormatOptions(await fetchPurchaseOptions(templateId));
    } catch (err) {
      console.warn("Failed to load purchase options:", err);
      setFormatOptions({
        currency: "ILS",
        digitalPrice: 29.99,
        printPrice: undefined,
        printAvailable: false,
      });
    } finally {
      setFormatOptionsLoading(false);
      setAddingToCartId(null);
    }
  };

  const handleAddToCart = async (purchaseFormat: PurchaseFormat, shippingDetails?: ShippingDetails) => {
    if (!pendingCartPreview) return;

    setAddingToCartFormat(purchaseFormat);
    try {
      await addToCart(pendingCartPreview.previewId, purchaseFormat, shippingDetails);
      navigate("/cart");
    } catch (err) {
      console.warn("Add to cart failed:", err);
      setAddingToCartFormat(null);
    }
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
            label={t("pages.myStories.tabs.previews")}
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
          <Box>
            {purchasedLoading && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress sx={{ color: "#824D5C" }} />
              </Box>
            )}

            {purchasedError && !purchasedLoading && (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography sx={{ fontSize: 14, color: "error.main" }}>{purchasedError}</Typography>
              </Box>
            )}

            {!purchasedLoading && !purchasedError && purchasedStories.length === 0 && (
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

            {!purchasedLoading && !purchasedError && purchasedStories.length > 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {purchasedStories.map((story) => (
                  <PurchasedStoryCard
                    key={story.storyId}
                    story={story}
                    t={t}
                    onRead={() =>
                      navigate(
                        `/stories/${story.templateId}/read?personalizedStoryId=${encodeURIComponent(story.storyId)}`,
                      )
                    }
                  />
                ))}
              </Box>
            )}
          </Box>
        )}

        {activeTab === "previews" && (
          <Box>
            {previewsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress sx={{ color: "#824D5C" }} />
              </Box>
            ) : previewsError ? (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography sx={{ fontSize: 14, color: "error.main" }}>{previewsError}</Typography>
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
                {previews.map((preview) => {
                  const cartState = getPreviewCartState(preview.status);
                  return (
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
                        {(() => {
                          const subtitle = getPreviewSubtitleKey(preview.childFirstName);
                          return t(subtitle.key, subtitle.params);
                        })()}
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
                        {cartState === "in_cart" && (
                          <Box
                            sx={{
                              fontSize: 10,
                              px: "8px",
                              py: "2px",
                              borderRadius: "999px",
                              background: "#FCEFD9",
                              color: "#8A5A00",
                              border: "0.5px solid #E3B658",
                              fontWeight: 500,
                            }}
                          >
                            {t("pages.myStories.previews.inCartLabel")}
                          </Box>
                        )}
                        {cartState === "checkout_pending" && (
                          <Box
                            sx={{
                              fontSize: 10,
                              px: "8px",
                              py: "2px",
                              borderRadius: "999px",
                              background: "#EDE5F5",
                              color: "#5A3B8A",
                              border: "0.5px solid #B398D9",
                              fontWeight: 500,
                            }}
                          >
                            {t("pages.myStories.previews.checkoutPendingLabel")}
                          </Box>
                        )}
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
                      {cartState === "in_cart" ? (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => navigate("/cart")}
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
                          {t("pages.myStories.previews.viewCartCta")}
                        </Button>
                      ) : cartState === "checkout_pending" ? (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled
                          sx={{
                            borderColor: "#ddd4ca",
                            color: "#9a8a92",
                            textTransform: "none",
                            borderRadius: "10px",
                            fontSize: 12,
                            px: 2,
                            py: 0.75,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t("pages.myStories.previews.checkoutPendingCta")}
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={addingToCartId === preview.previewId}
                          onClick={() => handleOpenFormatDialog(preview.previewId, preview.templateId)}
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
                          {addingToCartId === preview.previewId
                            ? t("pages.myStories.previews.addingToCart")
                            : t("pages.myStories.previews.addToCartCta")}
                        </Button>
                      )}
                    </Box>
                  </Box>
                  );
                })}
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

      <PurchaseFormatDialog
        open={formatDialogOpen}
        onClose={() => !addingToCartFormat && setFormatDialogOpen(false)}
        onSelect={handleAddToCart}
        currency={formatOptions?.currency ?? "ILS"}
        digitalPrice={formatOptions?.digitalPrice}
        printPrice={formatOptions?.printPrice}
        printAvailable={formatOptions?.printAvailable === true}
        loadingFormat={addingToCartFormat}
        loadingOptions={formatOptionsLoading}
      />
    </Box>
  );
}
