import { StyleSheet } from "react-native";

export const colors = {
  black: "#000000",
  white: "#FFFFFF",
  gray50: "#FAFAFA",
  gray100: "#F4F4F5",
  gray200: "#E4E4E7",
  gray300: "#D4D4D8",
  gray400: "#A1A1AA",
  gray500: "#71717A",
  gray600: "#52525B",
  gray700: "#3F3F46",
  gray800: "#27272A",
  gray900: "#18181B",
  danger: "#EF4444",
  success: "#22C55E",
  overlay: "rgba(0,0,0,0.4)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  full: 9999,
} as const;

export const typography = StyleSheet.create({
  largeTitle: { fontSize: 34, fontWeight: "700" as const, letterSpacing: 0.37, color: colors.black },
  title1: { fontSize: 28, fontWeight: "700" as const, letterSpacing: 0.36, color: colors.black },
  title2: { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.26, color: colors.black },
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
  sm: { boxShadow: "0px 1px 3px rgba(0,0,0,0.06)" },
  md: { boxShadow: "0px 4px 12px rgba(0,0,0,0.08)" },
  lg: { boxShadow: "0px 8px 24px rgba(0,0,0,0.12)" },
} as const;

export const theme = {
  bg: colors.white,
  card: colors.gray50,
  border: colors.gray200,
  text: colors.black,
  textSecondary: colors.gray500,
  textTertiary: colors.gray400,
  danger: colors.danger,
  success: colors.success,
  overlay: colors.overlay,
} as const;
