import {
  Box,
  colors,
  Container,
  createTheme,
  ThemeOptions,
} from "@mui/material";
import { PropsWithChildren } from "react";
import { ThemeProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";

const themeOptions: ThemeOptions = {
  palette: {
    mode: "dark",
    primary: {
      main: "#890089",
    },
  },
  components: {
    MuiTextField: {
      defaultProps: {
        size: "small",
      },
    },
    MuiButton: {
      defaultProps: {
        variant: "contained",
      },
    },
  },
  typography: {
    subtitle2: {
      fontSize: "0.8rem",
      color: colors.grey[500],
    },
  },
};

export const theme = createTheme(themeOptions);

export const Wrapper = ({ children }: PropsWithChildren) => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container>{children}</Container>
    </ThemeProvider>
  );
};
