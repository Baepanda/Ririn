// Design tokens for Golden — light theme only, white with premium gold accents.
// Keys match the "color" block of /app/design_guidelines.json.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#FAFAFA",
  onSurface: "#1A1A1A",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#1A1A1A",
  surfaceTertiary: "#F2F2F7",
  onSurfaceTertiary: "#1A1A1A",
  surfaceInverse: "#1A1A1A",
  onSurfaceInverse: "#FFFFFF",
  muted: "#8E8E93",

  brand: "#D4AF37",
  onBrand: "#FFFFFF",
  brandPrimary: "#C5A028",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#E5C85C",
  onBrandSecondary: "#1A1A1A",
  brandTertiary: "#F9F3D9",
  onBrandTertiary: "#C5A028",

  success: "#34C759",
  onSuccess: "#FFFFFF",
  warning: "#FF9500",
  onWarning: "#FFFFFF",
  error: "#FF3B30",
  onError: "#FFFFFF",
  info: "#8E8E93",
  onInfo: "#FFFFFF",

  border: "#E5E5EA",
  borderStrong: "#C7C7CC",
  divider: "#E5E5EA",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme);
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
