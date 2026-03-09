import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { theme } from "@/lib/theme";

interface GroupCardProps {
  name: string;
  location?: string;
  topic?: string;
  memberCount: number;
  thumbnailUrl?: string;
  isMember?: boolean;
  onPress: () => void;
  onJoin?: () => void;
}

export function GroupCard({ name, location, topic, memberCount, thumbnailUrl, isMember, onPress, onJoin }: GroupCardProps) {
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      <View style={s.thumbWrap}>
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={s.thumb} contentFit="cover" />
        ) : (
          <View style={s.thumbPlaceholder}>
            <SymbolView name="person.3.fill" size={28} tintColor={theme.textSecondary} />
          </View>
        )}
      </View>
      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>{name}</Text>
        {location ? <Text style={s.location}>{location}</Text> : null}
        {topic ? <Text style={s.topic}>{topic}</Text> : null}
        <Text style={s.members}>{memberCount} member{memberCount !== 1 ? "s" : ""}</Text>
      </View>
      {onJoin && !isMember && (
        <TouchableOpacity style={s.joinBtn} onPress={onJoin}>
          <Text style={s.joinText}>Join</Text>
        </TouchableOpacity>
      )}
      {isMember && (
        <View style={s.joinedBadge}>
          <SymbolView name="checkmark" size={12} tintColor={theme.textSecondary} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", padding: 14, backgroundColor: theme.card, borderRadius: 14, marginBottom: 10, gap: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
  thumbWrap: { width: 56, height: 56, borderRadius: 14, overflow: "hidden" },
  thumb: { width: 56, height: 56 },
  thumbPlaceholder: { width: 56, height: 56, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", color: theme.text },
  location: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  topic: { fontSize: 12, color: theme.textSecondary, marginTop: 1, fontStyle: "italic" },
  members: { fontSize: 12, color: theme.textSecondary, marginTop: 3 },
  joinBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.text },
  joinText: { fontSize: 13, fontWeight: "600", color: theme.bg },
  joinedBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" },
});
