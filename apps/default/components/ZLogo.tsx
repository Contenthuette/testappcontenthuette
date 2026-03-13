import React from "react";
import { View, StyleSheet, Image } from "react-native";

const Z_LOGO = require("../../../assets/images/z-lgo-1xaccc.png");

interface ZLogoProps {
  size?: number;
}

export function ZLogo({ size = 32 }: ZLogoProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Image
        source={Z_LOGO}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
  },
});
