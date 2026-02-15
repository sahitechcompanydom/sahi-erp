"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

const DEFAULT_THEME = "signature";

export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider defaultTheme={defaultTheme} {...props}>
      {children}
    </NextThemesProvider>
  );
}
