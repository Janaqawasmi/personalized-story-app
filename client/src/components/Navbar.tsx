import { AppBar, Toolbar, Typography, Box, Button } from "@mui/material";

export default function Navbar() {
  return (
    <AppBar position="static" color="transparent" elevation={0}>
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Typography variant="h6">QOSATI</Typography>
        <Box>
          <Button>Browse</Button>
          <Button>How it works</Button>
          <Button>About</Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
