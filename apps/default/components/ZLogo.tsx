import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/lib/theme";

interface ZLogoProps {
  size?: number;
  color?: string;
}

export function ZLogo({ size = 32, color = colors.black }: ZLogoProps) {
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size * 0.25 }]}>
      <Text style={[styles.text, { fontSize: size * 0.6, color }]}>Z</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "900",
    letterSpacing: -1,
  },
});
