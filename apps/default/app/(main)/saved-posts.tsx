import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { EmptyState } from "@/components/EmptyState";
import { Avatar } from "@/components/Avatar";
import { SymbolView } from "expo-symbols";
import { Image } from "expo-image";

export default function SavedPostsScreen() {
  const saved = useQuery(api.posts.getSavedPosts, {});

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Gespeichert</Text>
      </View>
      <FlatList
        data={saved}
        keyExtractor={item => item._id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <View style={styles.gridItem}>
            {item.mediaUrl ? (
              <Image source={{ uri: item.mediaUrl }} style={styles.gridImage} contentFit="cover" />
            ) : (
              <View style={styles.gridPlaceholder}>
                <Text style={styles.gridText} numberOfLines={2}>{item.caption}</Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          saved === undefined ? null : (
            <EmptyState icon="bookmark" title="Keine gespeicherten Beitr\u00e4ge" subtitle="Speichere Beitr\u00e4ge, um sie hier zu finden" />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  backBtn: { padding: spacing.xs },
  title: { fontSize: 22, fontWeight: "700", color: colors.black },
  grid: { paddingBottom: 40 },
  gridItem: { width: "33.33%", aspectRatio: 1, padding: 1 },
  gridImage: { flex: 1, backgroundColor: colors.gray100 },
  gridPlaceholder: { flex: 1, backgroundColor: colors.gray100, padding: spacing.sm, justifyContent: "center" },
  gridText: { fontSize: 12, color: colors.gray500 },
});
