import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { colors } from "@/lib/theme";

const Z_LOGO = require("../../../assets/images/chatgpt-image-17.-jan.-2026-21-56-11-0vbgwf.png");

interface ZLogoProps {
  size?: number;
  tint?: string;
}

/**
 * Z logo — renders the PNG directly (black Z on transparent bg).
 * Falls back to a styled "Z" text if the image ever fails to load.
 *
 * Pass `tint` to recolor the logo (e.g. white on dark backgrounds).
 * The default (no tint) keeps the original black image untouched.
 */
export function ZLogo({ size = 32, tint }: ZLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    return (
      <View
        style={[
          styles.fallbackContainer,
          { width: size, height: size, borderRadius: size * 0.28 },
        ]}
      >
        <Text
          style={[
            styles.fallbackText,
            tint ? { color: tint } : undefined,
            { fontSize: size * 0.55, lineHeight: size },
          ]}
          allowFontScaling={false}
        >
          Z
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={Z_LOGO}
      style={[
        { width: size, height: size },
        tint ? { tintColor: tint } : undefined,
      ]}
      contentFit="contain"
      cachePolicy="memory-disk"
      transition={0}
      onError={() => setImgFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    fontWeight: "900",
    color: colors.black,
    textAlign: "center",
    letterSpacing: -1,
  },
});
