import React from "react";
import { View, StyleSheet, type DimensionValue } from "react-native";
import { colors } from "@/lib/theme";

interface RedactedBarProps {
  width?: DimensionValue;
  height?: number;
}

export function RedactedBar({ width = "70%", height = 12 }: RedactedBarProps) {
  return (
    <View
      style={[
        styles.bar,
        {
          width,
          height,
          borderRadius: height / 2,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.gray200,
    borderCurve: "continuous",
  },
});
