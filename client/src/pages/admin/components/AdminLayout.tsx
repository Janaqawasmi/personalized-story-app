import { useEffect, useState } from "react";
import { Outlet, useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Box,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Badge,
  Avatar,
} from "@mui/material";
import {
  DashboardOutlined,
  BarChartOutlined,
  PeopleOutlined,
  PsychologyOutlined,
  AutoStoriesOutlined,
  ShieldOutlined,
  SmartToyOutlined,
  AttachMoneyOutlined,
  MonitorHeartOutlined,
  NotificationsOutlined,
} from "@mui/icons-material";
import {
  collection,
  getCountFromServer,
  query,
  where,
  type Query,
  type CollectionReference,
} from "firebase/firestore";
import { COLORS } from "../../../theme";
import { useTranslation } from "../../../i18n/useTranslation";
import { useLanguage } from "../../../i18n/context/useLanguage";
import { useAuth } from "../../../contexts/AuthContext";
import { db } from "../../../firebase";

const SIDEBAR_WIDTH = 228;

interface NavItem {
  key: string;
  labelKey: string;
  icon: React.ReactNode;
  path: string;
}

const NAV_SECTIONS: { titleKey: string; items: NavItem[] }[] = [
  {
    titleKey: "admin.nav.sectionOverview",
    items: [
      {
        key: "overview",
        labelKey: "admin.nav.dashboard",
        icon: <DashboardOutlined />,
        path: "overview",
      },
      {
        key: "analytics",
        labelKey: "admin.nav.analytics",
        icon: <BarChartOutlined />,
        path: "analytics",
      },
    ],
  },
  {
    titleKey: "admin.nav.sectionPeople",
    items: [
      {
        key: "users",
        labelKey: "admin.nav.users",
        icon: <PeopleOutlined />,
        path: "users",
      },
      {
        key: "psychologists",
        labelKey: "admin.nav.psychologists",
        icon: <PsychologyOutlined />,
        path: "psychologists",
      },
    ],
  },
  {
    titleKey: "admin.nav.sectionContent",
    items: [
      {
        key: "stories",
        labelKey: "admin.nav.stories",
        icon: <AutoStoriesOutlined />,
        path: "stories",
      },
      {
        key: "moderation",
        labelKey: "admin.nav.moderation",
        icon: <ShieldOutlined />,
        path: "moderation",
      },
      {
        key: "ai",
        labelKey: "admin.nav.ai",
        icon: <SmartToyOutlined />,
        path: "ai",
      },
    ],
  },
  {
    titleKey: "admin.nav.sectionBusiness",
    items: [
      {
        key: "revenue",
        labelKey: "admin.nav.revenue",
        icon: <AttachMoneyOutlined />,
        path: "revenue",
      },
      {
        key: "system",
        labelKey: "admin.nav.system",
        icon: <MonitorHeartOutlined />,
        path: "system",
      },
    ],
  },
];

async function tryCount(q: Query | CollectionReference): Promise<number> {
  try {
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch {
    return 0;
  }
}

function initialsFromUser(displayName: string | null, email: string | null): string {
  const s = (displayName || email || "?").trim();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0] + parts[1]![0]).toUpperCase();
  }
  return s.slice(0, 2).toUpperCase();
}

export default function AdminLayout() {
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { direction } = useLanguage();
  const t = useTranslation();
  const { currentUser } = useAuth();
  const [pendingBadges, setPendingBadges] = useState<{ moderation?: number; psychologists?: number }>(
    {}
  );

  const isRTL = direction === "rtl";

  const currentPage = location.pathname.split("/").pop() ?? "overview";

  useEffect(() => {
    let cancelled = false;

    async function loadBadges() {
      const [mod, psych] = await Promise.all([
        tryCount(
          query(
            collection(db, "story_templates"),
            where("status", "==", "pending_review")
          )
        ),
        tryCount(
          query(collection(db, "psychologists"), where("status", "==", "pending"))
        ),
      ]);
      if (!cancelled) {
        setPendingBadges({ moderation: mod, psychologists: psych });
      }
    }

    loadBadges();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleNav = (path: string) => {
    navigate(`/${lang}/admin/${path}`);
  };

  const overviewDate = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const pageSubtitle =
    currentPage === "overview"
      ? t("admin.pages.overview.subtitle", { date: overviewDate })
      : t(`admin.pages.${currentPage}.subtitle`);

  const adminInitials = initialsFromUser(
    currentUser?.displayName ?? null,
    currentUser?.email ?? null
  );

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        direction: isRTL ? "rtl" : "ltr",
      }}
    >
      <Box
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          bgcolor: "#F7F4F1",
          borderRight: isRTL ? "none" : `0.5px solid ${COLORS.border}`,
          borderLeft: isRTL ? `0.5px solid ${COLORS.border}` : "none",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: "20px", pb: "16px", borderBottom: `0.5px solid ${COLORS.border}` }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "9px",
                bgcolor: COLORS.secondary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              د
            </Box>
            <Box>
              <Typography
                sx={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  lineHeight: 1.2,
                }}
              >
                DAMMAH
              </Typography>
              <Typography sx={{ fontSize: 11, color: COLORS.textSecondary }}>
                {t("admin.layout.panelSubtitle")}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", py: 1 }}>
          {NAV_SECTIONS.map((section) => (
            <Box key={section.titleKey}>
              <Typography
                sx={{
                  px: 2.5,
                  pt: 1.5,
                  pb: 0.5,
                  fontSize: 10,
                  fontWeight: 500,
                  color: COLORS.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {t(section.titleKey)}
              </Typography>
              {section.items.map((item) => {
                const isActive = currentPage === item.key;
                const badge =
                  item.key === "moderation"
                    ? pendingBadges.moderation
                    : item.key === "psychologists"
                      ? pendingBadges.psychologists
                      : undefined;
                return (
                  <ListItemButton
                    key={item.key}
                    onClick={() => handleNav(item.path)}
                    sx={{
                      mx: 1,
                      px: 1.5,
                      py: "7px",
                      borderRadius: "8px",
                      mb: "2px",
                      bgcolor: isActive ? `${COLORS.secondary}15` : "transparent",
                      borderInlineStart:
                        isActive ? `2px solid ${COLORS.secondary}` : "2px solid transparent",
                      color: isActive ? COLORS.secondary : COLORS.textSecondary,
                      "&:hover": {
                        bgcolor: isActive ? `${COLORS.secondary}15` : `${COLORS.border}50`,
                      },
                      transition: "all 0.15s",
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 32,
                        color: "inherit",
                        "& .MuiSvgIcon-root": { fontSize: 18 },
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={t(item.labelKey)}
                      primaryTypographyProps={{
                        fontSize: 13,
                        fontWeight: isActive ? 600 : 400,
                        color: "inherit",
                      }}
                    />
                    {badge !== undefined && badge > 0 && (
                      <Box
                        sx={{
                          bgcolor: "#E53935",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 600,
                          borderRadius: "10px",
                          px: "6px",
                          py: "1px",
                          minWidth: 18,
                          textAlign: "center",
                        }}
                      >
                        {badge}
                      </Box>
                    )}
                  </ListItemButton>
                );
              })}
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            p: 2,
            borderTop: `0.5px solid ${COLORS.border}`,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Avatar sx={{ width: 30, height: 30, bgcolor: COLORS.secondary, fontSize: 12 }}>
            {adminInitials}
          </Avatar>
          <Box sx={{ flex: 1, overflow: "hidden" }}>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 500,
                color: COLORS.textPrimary,
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
              }}
            >
              {currentUser?.displayName || t("admin.layout.siteAdmin")}
            </Typography>
            <Typography sx={{ fontSize: 10, color: COLORS.textSecondary }}>
              {currentUser?.email ?? "admin"}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Box
          sx={{
            px: 3,
            py: 1.5,
            bgcolor: "#fff",
            borderBottom: `0.5px solid ${COLORS.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: COLORS.textPrimary }}>
              {t(`admin.pages.${currentPage}.title`, {})}
            </Typography>
            <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>{pageSubtitle}</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Badge badgeContent={3} color="error" sx={{ cursor: "pointer" }}>
              <NotificationsOutlined sx={{ fontSize: 22, color: COLORS.textSecondary }} />
            </Badge>
            <Avatar sx={{ width: 32, height: 32, bgcolor: COLORS.secondary, fontSize: 12 }}>
              {adminInitials}
            </Avatar>
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", bgcolor: COLORS.background }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
