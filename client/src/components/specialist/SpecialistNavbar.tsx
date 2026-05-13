import { useState } from "react";
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import { NavLink, useNavigate, useParams, useLocation } from "react-router-dom";

import dammahLogo from "../../assets/brand/dammah-logo.png";
import { COLORS } from "../../theme";
import { Z_INDEX_NAVBAR } from "../../constants/zIndex";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../i18n/context/useLanguage";
import { useTranslation } from "../../i18n/useTranslation";
import { useSpecialistUi } from "../../i18n/specialistUi";

const SANS =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";

/**
 * Specialist-only top bar: warm editorial chrome, no mega-menu / shop / customer browse.
 * Shown on `/:lang/specialist/*` instead of the storefront {@link components/layout/Navbar}.
 */
export default function SpecialistNavbar() {
  const theme = useTheme();
  const { lang } = useParams<{ lang: string }>();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, isRTL } = useLanguage();
  const t = useTranslation();
  const ui = useSpecialistUi();
  const { currentUser, logout, loading: authLoading } = useAuth();

  const [langMenuAnchor, setLangMenuAnchor] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const prefix = lang || language;
  const base = `/${prefix}`;
  const specialistStoriesPath = `${base}/specialist/stories`;

  const handleLangMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setLangMenuAnchor(event.currentTarget);
  };
  const handleLangMenuClose = () => setLangMenuAnchor(null);

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };
  const handleUserMenuClose = () => setUserMenuAnchor(null);

  const handleLanguageChange = (newLang: "he" | "en" | "ar") => {
    if (newLang === language) {
      handleLangMenuClose();
      return;
    }
    const newPath = pathname.replace(`/${lang || language}`, `/${newLang}`);
    setLanguage(newLang);
    navigate(newPath);
    handleLangMenuClose();
  };

  const handleLogout = async () => {
    try {
      await logout();
      handleUserMenuClose();
    } catch (err) {
      console.error("[SpecialistNavbar] logout failed:", err);
    }
  };

  const navButtonSx = {
    display: "inline-flex",
    alignItems: "center",
    px: 1.5,
    py: 0.75,
    borderRadius: "8px",
    fontSize: "0.875rem",
    fontWeight: 600,
    fontFamily: SANS,
    textDecoration: "none",
    color: COLORS.textSecondary,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    transition: "background 0.15s ease, color 0.15s ease",
  };

  return (
      <AppBar
        component="nav"
        aria-label={ui.specialistTopNavAriaLabel}
        position="fixed"
        elevation={0}
        sx={{
          backgroundColor: COLORS.cream,
          color: theme.palette.text.primary,
          borderBottom: `1px solid ${COLORS.border}`,
          px: { xs: 2, md: 3 },
          height: { xs: 56, md: 60 },
          zIndex: Z_INDEX_NAVBAR,
        }}
      >
        <Toolbar
          disableGutters
          sx={{
            minHeight: { xs: 56, md: 60 },
            justifyContent: "space-between",
            gap: 2,
            width: "100%",
          }}
        >
          {/* Start: logo + desk label + primary nav */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 1, sm: 2 },
              minWidth: 0,
              flex: 1,
            }}
          >
            <Box
              component="img"
              src={dammahLogo}
              alt="DAMMAH"
              onClick={() => navigate(specialistStoriesPath)}
              sx={{
                height: 32,
                width: "auto",
                objectFit: "contain",
                cursor: "pointer",
                display: "block",
                flexShrink: 0,
              }}
            />
            <Typography
              variant="body2"
              sx={{
                display: { xs: "none", md: "block" },
                color: COLORS.textMuted,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontSize: "0.7rem",
                whiteSpace: "nowrap",
                fontFamily: SANS,
              }}
            >
              {ui.workspaceTitle}
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                ml: { xs: 0, sm: 1 },
                minWidth: 0,
              }}
            >
              <NavLink
                to={specialistStoriesPath}
                end={false}
                style={({ isActive }) => ({
                  ...navButtonSx,
                  color: isActive ? COLORS.primary : COLORS.textSecondary,
                  background: isActive ? COLORS.primarySoft : "transparent",
                })}
              >
                {ui.navMyStories}
              </NavLink>
              <Button
                component={NavLink}
                to={base}
                variant="text"
                color="inherit"
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: COLORS.textSecondary,
                  display: { xs: "none", sm: "inline-flex" },
                }}
              >
                {ui.navVisitSite}
              </Button>
            </Box>
          </Box>

          {/* End: language + account */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              flexShrink: 0,
            }}
          >
            {authLoading ? (
              <CircularProgress size={22} />
            ) : currentUser ? (
              <>
                <Button
                  size="small"
                  variant="text"
                  onClick={handleUserMenuOpen}
                  sx={{
                    textTransform: "none",
                    borderRadius: 2,
                    px: 1,
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    color: theme.palette.text.primary,
                  }}
                >
                  <AccountCircleOutlinedIcon fontSize="small" />
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: "nowrap",
                      fontWeight: 600,
                      maxWidth: { xs: 0, sm: 140 },
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: { xs: "none", sm: "inline" },
                    }}
                  >
                    {currentUser.displayName || currentUser.email}
                  </Typography>
                  <KeyboardArrowDownIcon fontSize="small" />
                </Button>
                <IconButton onClick={handleLangMenuOpen} aria-label="Language">
                  <LanguageOutlinedIcon />
                </IconButton>

                <Menu
                  anchorEl={userMenuAnchor}
                  open={Boolean(userMenuAnchor)}
                  onClose={handleUserMenuClose}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: isRTL ? "left" : "right",
                  }}
                  transformOrigin={{
                    vertical: "top",
                    horizontal: isRTL ? "left" : "right",
                  }}
                >
                  <MenuItem
                    onClick={() => {
                      navigate(base);
                      handleUserMenuClose();
                    }}
                  >
                    {ui.navVisitSite}
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      navigate(`${base}/admin/overview`);
                      handleUserMenuClose();
                    }}
                  >
                    {t("navbar.userMenu.adminPanel")}
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>{t("navbar.userMenu.logout")}</MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => navigate(`${base}/login`, { state: { mode: "login" } })}
                  sx={{ textTransform: "none" }}
                >
                  {t("login.title")}
                </Button>
                <IconButton onClick={handleLangMenuOpen} aria-label="language">
                  <LanguageOutlinedIcon />
                </IconButton>
              </>
            )}

            <Menu
              anchorEl={langMenuAnchor}
              open={Boolean(langMenuAnchor)}
              onClose={handleLangMenuClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: isRTL ? "left" : "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: isRTL ? "left" : "right",
              }}
            >
              <MenuItem
                onClick={() => handleLanguageChange("he")}
                selected={language === "he"}
              >
                {t("navbar.hebrew")}
              </MenuItem>
              <MenuItem
                onClick={() => handleLanguageChange("en")}
                selected={language === "en"}
              >
                {t("navbar.english")}
              </MenuItem>
              <MenuItem
                onClick={() => handleLanguageChange("ar")}
                selected={language === "ar"}
              >
                {t("navbar.arabic")}
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
  );
}
