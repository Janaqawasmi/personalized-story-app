import React from "react";
import { Link, useLocation } from "react-router-dom";
import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";

const SpecialistNav: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: "/specialist/create-brief", label: "Create Story Brief" },
    { path: "/specialist/generate-draft", label: "Generate Draft" },
    { path: "/specialist/drafts", label: "Review Drafts" },
  ];

  return (
    <AppBar position="static" sx={{ mb: 3 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 4 }}>
          Specialist Portal
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              component={Link}
              to={item.path}
              color="inherit"
              variant={location.pathname === item.path ? "outlined" : "text"}
              sx={{
                borderColor: location.pathname === item.path ? "white" : "transparent",
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default SpecialistNav;

