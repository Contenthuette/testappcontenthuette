import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";

const logoSource = require("../../../assets/images/z-lgo-1xaccc.png");

interface ZLogoProps {
  size?: number;
  color?: string;
  withBackground?: boolean;
}

export function ZLogo({ size = 32, withBackground = false }: ZLogoProps) {
  if (withBackground) {
    return (
      <View
        style={[
          styles.bgContainer,
          {
            width: size,
            height: size,
            borderRadius: size * 0.28,
          },
        ]}
      >
        <Image
          source={logoSource}
          style={{ width: size * 0.7, height: size * 0.7 }}
          contentFit="contain"
        />
      </View>
    );
  }
  return (
    <Image
      source={logoSource}
      style={{ width: size, height: size }}
      contentFit="contain"
    />
  );
}

const styles = StyleSheet.create({
  bgContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
});
