import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  IconButton,
  Badge,
  Menu,
  MenuItem,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/Language";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { MegaMenu } from "./MegaMenu/MegaMenu";
import { MegaSelection } from "./MegaMenu/types";

type Props = {
  currentSelection: MegaSelection;
  onApplyFilters: (s: MegaSelection) => void;
};

export default function Navbar({ currentSelection, onApplyFilters }: Props) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langAnchor, setLangAnchor] = useState<null | HTMLElement>(null);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: "#fff",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between" }}>
        {/* LOGO */}
        <Typography sx={{ fontWeight: 900, fontSize: "1.2rem" }}>
          DAMMAH
        </Typography>

        {/* MAIN NAV */}
        <Typography
          sx={{ cursor: "pointer", fontWeight: 600 }}
          onClick={() => setMenuOpen(true)}
        >
          עיון בסיפורים
        </Typography>

        {/* ICONS */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton>
            <LanguageOutlinedIcon />
          </IconButton>

          <IconButton onClick={() => navigate("/search")}>
            <SearchIcon />
          </IconButton>

          <IconButton onClick={() => navigate("/login")}>
            <AccountCircleOutlinedIcon />
          </IconButton>

          <IconButton onClick={() => navigate("/cart")}>
            <Badge badgeContent={1} color="primary">
              <ShoppingBagOutlinedIcon />
            </Badge>
          </IconButton>
        </Box>
      </Toolbar>

      <MegaMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onApply={onApplyFilters}
        value={currentSelection}
      />
    </AppBar>
  );
}
