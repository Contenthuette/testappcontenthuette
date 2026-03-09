import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { theme } from "@/lib/theme";

interface PartnerCardProps {
  businessName: string;
  shortText: string;
  thumbnailUrl?: string;
  onPress: () => void;
}

export function PartnerCard({ businessName, shortText, thumbnailUrl, onPress }: PartnerCardProps) {
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      <View style={s.thumbWrap}>
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={s.thumb} contentFit="cover" />
        ) : (
          <View style={s.thumbPlaceholder}>
            <SymbolView name="building.2.fill" size={24} tintColor={theme.textSecondary} />
          </View>
        )}
      </View>
      <Text style={s.name} numberOfLines={1}>{businessName}</Text>
      <Text style={s.text} numberOfLines={2}>{shortText}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: { flex: 1, backgroundColor: theme.card, borderRadius: 14, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
  thumbWrap: { height: 100 },
  thumb: { width: "100%", height: "100%" },
  thumbPlaceholder: { width: "100%", height: "100%", backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 14, fontWeight: "600", color: theme.text, paddingHorizontal: 10, paddingTop: 10 },
  text: { fontSize: 12, color: theme.textSecondary, paddingHorizontal: 10, paddingTop: 4, paddingBottom: 10 },
});
