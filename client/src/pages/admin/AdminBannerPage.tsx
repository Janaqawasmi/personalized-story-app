import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Switch,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tabs,
  Tab,
} from "@mui/material";
import { AddOutlined, EditOutlined, DeleteOutlined, CloseOutlined } from "@mui/icons-material";
import { COLORS } from "../../theme";
import { useTranslation } from "../../i18n/useTranslation";
import {
  listAdminBanners,
  createAdminBanner,
  updateAdminBanner,
  deleteAdminBanner,
  type AdminBanner,
  type BannerFormInput,
  type BannerLocalizedString,
} from "../../api/adminBanners";

const EMPTY_LOCALIZED: BannerLocalizedString = { en: "", he: "", ar: "" };

const EMPTY_FORM: BannerFormInput = {
  image: null,
  title: { ...EMPTY_LOCALIZED },
  description: { ...EMPTY_LOCALIZED },
  buttonText: { ...EMPTY_LOCALIZED },
  buttonLink: "",
  isActive: true,
  sortOrder: 0,
};

const LANGS = ["en", "he", "ar"] as const;

export default function AdminBannerPage() {
  const t = useTranslation();
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BannerFormInput>(EMPTY_FORM);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [langTab, setLangTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    listAdminBanners()
      .then(setBanners)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load banners"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setLangTab(0);
    setFormError(null);
  };

  const openEdit = (banner: AdminBanner) => {
    setEditingId(banner.id);
    setForm({
      image: null,
      title: { en: banner.title.en ?? "", he: banner.title.he ?? "", ar: banner.title.ar ?? "" },
      description: {
        en: banner.description.en ?? "",
        he: banner.description.he ?? "",
        ar: banner.description.ar ?? "",
      },
      buttonText: {
        en: banner.buttonText.en ?? "",
        he: banner.buttonText.he ?? "",
        ar: banner.buttonText.ar ?? "",
      },
      buttonLink: banner.buttonLink,
      isActive: banner.isActive,
      sortOrder: banner.sortOrder,
    });
    setImagePreview(banner.imageUrl);
    setLangTab(0);
    setFormError(null);
  };

  const [dialogOpen, setDialogOpen] = useState(false);

  const handleImageChange = (file: File | null) => {
    setForm((prev) => ({ ...prev, image: file }));
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setFormError(null);
    if (!editingId && !form.image) {
      setFormError(t("admin.banner.imageRequired"));
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateAdminBanner(editingId, form);
      } else {
        await createAdminBanner(form);
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save banner");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (banner: AdminBanner) => {
    setBanners((prev) => prev.map((b) => (b.id === banner.id ? { ...b, isActive: !b.isActive } : b)));
    try {
      await updateAdminBanner(banner.id, {
        image: null,
        title: banner.title,
        description: banner.description,
        buttonText: banner.buttonText,
        buttonLink: banner.buttonLink,
        isActive: !banner.isActive,
        sortOrder: banner.sortOrder,
      });
    } catch {
      load();
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteAdminBanner(deleteTargetId);
      setDeleteTargetId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete banner");
      setDeleteTargetId(null);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>
          {t("admin.banner.title")}
        </Typography>
        <Button
          startIcon={<AddOutlined />}
          onClick={() => {
            openCreate();
            setDialogOpen(true);
          }}
          variant="contained"
          sx={{ textTransform: "none", bgcolor: COLORS.secondary, "&:hover": { bgcolor: COLORS.secondary } }}
        >
          {t("admin.banner.addNew")}
        </Button>
      </Box>

      {error && <Typography sx={{ fontSize: 12, color: "error.main", mb: 2 }}>{error}</Typography>}
      {loading && <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>{t("admin.common.loading")}</Typography>}

      {!loading && banners.length === 0 && (
        <Paper elevation={0} sx={{ p: 4, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff", textAlign: "center" }}>
          <Typography sx={{ fontSize: 24, mb: 1 }}>🖼️</Typography>
          <Typography sx={{ fontSize: 13, color: COLORS.textSecondary }}>{t("admin.banner.empty")}</Typography>
        </Paper>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {banners.map((banner) => (
          <Paper
            key={banner.id}
            elevation={0}
            sx={{ p: 2, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff", display: "flex", gap: 2, alignItems: "center" }}
          >
            <Box
              sx={{
                width: 96,
                height: 56,
                borderRadius: "8px",
                flexShrink: 0,
                backgroundImage: banner.imageUrl ? `url(${banner.imageUrl})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                bgcolor: "#eee",
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {banner.title.en || banner.title.he || banner.title.ar || t("admin.banner.untitled")}
              </Typography>
              <Typography sx={{ fontSize: 11, color: COLORS.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {banner.buttonLink || "—"} · {t("admin.banner.sortOrder")}: {banner.sortOrder}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
              <Switch size="small" checked={banner.isActive} onChange={() => handleToggleActive(banner)} />
              <IconButton
                size="small"
                onClick={() => {
                  openEdit(banner);
                  setDialogOpen(true);
                }}
              >
                <EditOutlined fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => setDeleteTargetId(banner.id)}>
                <DeleteOutlined fontSize="small" sx={{ color: "#A32D2D" }} />
              </IconButton>
            </Box>
          </Paper>
        ))}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 15, fontWeight: 600 }}>
          {editingId ? t("admin.banner.editTitle") : t("admin.banner.createTitle")}
          <IconButton size="small" onClick={() => setDialogOpen(false)}>
            <CloseOutlined fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {formError && <Typography sx={{ fontSize: 12, color: "error.main", mb: 1.5 }}>{formError}</Typography>}

          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 11, color: COLORS.textSecondary, mb: 0.75 }}>{t("admin.banner.image")}</Typography>
            {imagePreview && (
              <Box
                sx={{
                  width: "100%",
                  height: 120,
                  borderRadius: "8px",
                  mb: 1,
                  backgroundImage: `url(${imagePreview})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            )}
            <Button component="label" size="small" sx={{ textTransform: "none" }}>
              {t("admin.banner.chooseImage")}
              <input
                type="file"
                hidden
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
              />
            </Button>
          </Box>

          <Tabs value={langTab} onChange={(_e, v) => setLangTab(v)} sx={{ mb: 1.5, minHeight: 32 }}>
            {LANGS.map((lang) => (
              <Tab key={lang} label={lang.toUpperCase()} sx={{ minHeight: 32, py: 0.5, fontSize: 12 }} />
            ))}
          </Tabs>

          {LANGS.map((lang, idx) => (
            <Box key={lang} sx={{ display: langTab === idx ? "flex" : "none", flexDirection: "column", gap: 1.5, mb: 2 }}>
              <TextField
                size="small"
                label={t("admin.banner.fieldTitle")}
                value={form.title[lang] ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, title: { ...p.title, [lang]: e.target.value } }))}
                fullWidth
              />
              <TextField
                size="small"
                label={t("admin.banner.fieldDescription")}
                value={form.description[lang] ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, description: { ...p.description, [lang]: e.target.value } }))}
                fullWidth
                multiline
                minRows={2}
              />
              <TextField
                size="small"
                label={t("admin.banner.fieldButtonText")}
                value={form.buttonText[lang] ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, buttonText: { ...p.buttonText, [lang]: e.target.value } }))}
                fullWidth
              />
            </Box>
          ))}

          <TextField
            size="small"
            label={t("admin.banner.fieldButtonLink")}
            value={form.buttonLink}
            onChange={(e) => setForm((p) => ({ ...p, buttonLink: e.target.value }))}
            fullWidth
            sx={{ mb: 1.5 }}
            placeholder="/books"
          />

          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <TextField
              size="small"
              type="number"
              label={t("admin.banner.fieldSortOrder")}
              value={form.sortOrder}
              onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) || 0 }))}
              sx={{ width: 140 }}
            />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Switch
                checked={form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              />
              <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>{t("admin.banner.fieldActive")}</Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>
            {t("admin.banner.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving} variant="contained" sx={{ textTransform: "none" }}>
            {saving ? t("admin.common.loading") : t("admin.banner.save")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTargetId} onClose={() => setDeleteTargetId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>{t("admin.banner.deleteTitle")}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: COLORS.textSecondary }}>{t("admin.banner.deleteConfirm")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTargetId(null)} sx={{ textTransform: "none" }}>
            {t("admin.banner.cancel")}
          </Button>
          <Button onClick={handleDelete} variant="contained" color="error" sx={{ textTransform: "none" }}>
            {t("admin.banner.deleteConfirmButton")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
