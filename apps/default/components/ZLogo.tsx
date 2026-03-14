import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { colors } from "@/lib/theme";

const Z_LOGO = require("../../../assets/images/z-lgo-1xaccc.png");

interface ZLogoProps {
  size?: number;
}

/**
 * Bulletproof Z logo – always renders a visible black "Z" text.
 * Attempts to overlay the uploaded image; if it fails or is invisible
 * the text fallback guarantees the logo is always shown.
 */
export function ZLogo({ size = 32 }: ZLogoProps) {
  const [imgOk, setImgOk] = useState(true);
  const fontSize = size * 0.58;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size * 0.28 }]}>
      {/* Always-visible text fallback */}
      <Text
        style={[
          styles.fallbackText,
          { fontSize, lineHeight: size, borderRadius: size * 0.28 },
        ]}
        allowFontScaling={false}
      >
        Z
      </Text>

      {/* Image overlay – hidden on error */}
      {imgOk && (
        <Image
          source={Z_LOGO}
          style={[StyleSheet.absoluteFill, { borderRadius: size * 0.28 }]}
          contentFit="contain"
          priority="high"
          cachePolicy="memory-disk"
          tintColor={colors.black}
          transition={0}
          onError={() => setImgOk(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fallbackText: {
    fontWeight: "900",
    color: colors.black,
    textAlign: "center",
    letterSpacing: -1,
  },
});
