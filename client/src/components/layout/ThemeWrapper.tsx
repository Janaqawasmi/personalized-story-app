import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { useLanguage } from "../../i18n/context/useLanguage";
import { createAppTheme } from "../../theme";
import { ReactNode } from "react";

interface ThemeWrapperProps {
  children: ReactNode;
}

export default function ThemeWrapper({ children }: ThemeWrapperProps) {
  const { direction } = useLanguage();
  const theme = createAppTheme(direction);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

