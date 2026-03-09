import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/lib/theme";

interface ZLogoProps {
  size?: number;
  color?: string;
  withBackground?: boolean;
}

export function ZLogo({ size = 32, color = colors.black, withBackground = false }: ZLogoProps) {
  if (withBackground) {
    return (
      <View style={[
        styles.bgContainer,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: color,
        },
      ]}>
        <Text style={[
          styles.text,
          { fontSize: size * 0.52, color: color === colors.black ? colors.white : colors.black },
        ]}>Z</Text>
      </View>
    );
  }
  return (
    <Text style={[styles.text, { fontSize: size * 0.65, color }]}>Z</Text>
  );
}

const styles = StyleSheet.create({
  bgContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "900",
    letterSpacing: -1,
  },
});
