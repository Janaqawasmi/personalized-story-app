import {
  AppBar,
  Box,
  IconButton,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { MegaMenu } from "../MegaMenu/MegaMenu";
import { MegaSelection } from "../MegaMenu/types";

type NavbarProps = {
  currentSelection: MegaSelection;
  onApplyFilters: (sel: MegaSelection) => void;
};

export default function Navbar({
  currentSelection,
  onApplyFilters,
}: NavbarProps) {
  const navigate = useNavigate();
  const [megaOpen, setMegaOpen] = useState(false);
  const theme = useTheme();

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          px: 4,
        }}
      >
        <Box
          sx={{
            height: 64,
            display: "flex",
            alignItems: "center",
            direction: "rtl", // RTL direction for Hebrew/Arabic
          }}
        >
          {/* 1️⃣ RIGHT SECTION — Text Navigation Links */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              flex: 1,
              justifyContent: "flex-start", // RTL: flex-start = right side
            }}
          >
            {/* Mega menu trigger */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.95rem",
                gap: 0.5,
              }}
              onClick={() => setMegaOpen((p) => !p)}
            >
              עיון בסיפורים
              <KeyboardArrowDownIcon fontSize="small" />
            </Box>
          </Box>

          {/* 2️⃣ CENTER SECTION — Logo */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: "1.2rem",
                cursor: "pointer",
              }}
              onClick={() => navigate("/")}
            >
              QOSATI
            </Typography>
          </Box>

          {/* 3️⃣ LEFT SECTION — Utility Icons */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flex: 1,
              justifyContent: "flex-end", // RTL: flex-end = left side
            }}
          >
            <IconButton onClick={() => navigate("/search")}>
              <SearchOutlinedIcon />
            </IconButton>

            <IconButton onClick={() => navigate("/login")}>
              <PersonOutlineOutlinedIcon />
            </IconButton>

            <IconButton onClick={() => navigate("/cart")}>
              <ShoppingBagOutlinedIcon />
            </IconButton>

            <IconButton>
              <LanguageOutlinedIcon />
            </IconButton>
          </Box>
        </Box>
      </AppBar>

      {/* Mega Menu */}
      <MegaMenu
        isOpen={megaOpen}
        onClose={() => setMegaOpen(false)}
        onApply={(sel) => {
          onApplyFilters(sel);
          setMegaOpen(false);
        }}
        value={currentSelection}
      />
    </>
  );
}
