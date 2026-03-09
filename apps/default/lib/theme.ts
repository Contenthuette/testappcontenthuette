import { StyleSheet } from "react-native";

export const colors = {
  black: "#000000",
  white: "#FFFFFF",
  gray50: "#FAFAFA",
  gray100: "#F5F5F5",
  gray200: "#E5E5E5",
  gray300: "#D4D4D4",
  gray400: "#A3A3A3",
  gray500: "#737373",
  gray600: "#525252",
  gray700: "#404040",
  gray800: "#262626",
  gray900: "#171717",
  danger: "#DC2626",
  success: "#16A34A",
  overlay: "rgba(0,0,0,0.5)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

export const typography = StyleSheet.create({
  largeTitle: { fontSize: 34, fontWeight: "700" as const, letterSpacing: 0.37, color: colors.black },
  title1: { fontSize: 28, fontWeight: "700" as const, letterSpacing: 0.36, color: colors.black },
  title2: { fontSize: 22, fontWeight: "700" as const, letterSpacing: 0.35, color: colors.black },
  title3: { fontSize: 20, fontWeight: "600" as const, letterSpacing: 0.38, color: colors.black },
  headline: { fontSize: 17, fontWeight: "600" as const, letterSpacing: -0.41, color: colors.black },
  body: { fontSize: 17, fontWeight: "400" as const, letterSpacing: -0.41, color: colors.black },
  callout: { fontSize: 16, fontWeight: "400" as const, letterSpacing: -0.32, color: colors.black },
  subheadline: { fontSize: 15, fontWeight: "400" as const, letterSpacing: -0.24, color: colors.gray500 },
  footnote: { fontSize: 13, fontWeight: "400" as const, letterSpacing: -0.08, color: colors.gray500 },
  caption1: { fontSize: 12, fontWeight: "400" as const, color: colors.gray500 },
  caption2: { fontSize: 11, fontWeight: "400" as const, letterSpacing: 0.07, color: colors.gray400 },
});

export const shadows = {
  sm: { boxShadow: "0px 1px 2px rgba(0,0,0,0.05)" },
  md: { boxShadow: "0px 2px 8px rgba(0,0,0,0.08)" },
  lg: { boxShadow: "0px 4px 16px rgba(0,0,0,0.1)" },
} as const;
