import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { SymbolView } from "@/components/Icon";
import { theme } from "@/lib/theme";

interface EventCardProps {
  name: string;
  city: string;
  date: string;
  startTime: string;
  totalTickets: number;
  soldTickets: number;
  thumbnailUrl?: string;
  onPress: () => void;
}

export function EventCard({ name, city, date, startTime, totalTickets, soldTickets, thumbnailUrl, onPress }: EventCardProps) {
  const available = totalTickets - soldTickets;
  const isSoldOut = available <= 0;
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      <View style={s.thumbWrap}>
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={s.thumb} contentFit="cover" />
        ) : (
          <View style={s.thumbPlaceholder}>
            <SymbolView name="sparkles" size={28} tintColor={theme.textSecondary} />
          </View>
        )}
        {isSoldOut && (
          <View style={s.soldOutBadge}>
            <Text style={s.soldOutText}>SOLD OUT</Text>
          </View>
        )}
      </View>
      <View style={s.info}>
        <Text style={s.name} numberOfLines={2}>{name}</Text>
        <View style={s.detailRow}>
          <SymbolView name="mappin" size={12} tintColor={theme.textSecondary} />
          <Text style={s.detail}>{city}</Text>
        </View>
        <View style={s.detailRow}>
          <SymbolView name="calendar" size={12} tintColor={theme.textSecondary} />
          <Text style={s.detail}>{date} - {startTime}</Text>
        </View>
        <Text style={[s.tickets, isSoldOut && s.ticketsSoldOut]}>
          {isSoldOut ? "Sold Out" : `${available} tickets left`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: theme.card, borderRadius: 16, overflow: "hidden", marginBottom: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
  thumbWrap: { height: 160, position: "relative" },
  thumb: { width: "100%", height: "100%" },
  thumbPlaceholder: { width: "100%", height: "100%", backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" },
  soldOutBadge: { position: "absolute", top: 12, right: 12, backgroundColor: "#000", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  soldOutText: { fontSize: 11, fontWeight: "700", color: "#fff", letterSpacing: 0.5 },
  info: { padding: 14 },
  name: { fontSize: 17, fontWeight: "600", color: theme.text, marginBottom: 6 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  detail: { fontSize: 13, color: theme.textSecondary },
  tickets: { fontSize: 13, fontWeight: "600", color: theme.text, marginTop: 6 },
  ticketsSoldOut: { color: theme.textSecondary },
});
