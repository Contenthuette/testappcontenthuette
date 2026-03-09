import React from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { EmptyState } from "@/components/EmptyState";
import { SymbolView } from "expo-symbols";
import { Image } from "expo-image";

export default function SavedPostsScreen() {
  const saved = useQuery(api.posts.getSavedPosts, {});

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Gespeichert</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={saved}
        keyExtractor={item => item._id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.gridItem}>
            {item.mediaUrl ? (
              <Image source={{ uri: item.mediaUrl }} style={styles.gridImage} contentFit="cover" transition={200} />
            ) : (
              <View style={styles.gridPlaceholder}>
                <Text style={styles.gridText} numberOfLines={3}>{item.caption}</Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          saved === undefined ? (
            <View style={styles.loadingWrap}><ActivityIndicator color={colors.gray300} /></View>
          ) : (
            <EmptyState
              icon="bookmark"
              title="Noch nichts gespeichert"
              subtitle="Speichere Beiträge, um sie hier wiederzufinden."
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "600", color: colors.black },
  grid: { paddingBottom: 40 },
  loadingWrap: { paddingVertical: 60, alignItems: "center" },
  gridItem: { width: "33.33%", aspectRatio: 1, padding: 1 },
  gridImage: { flex: 1, backgroundColor: colors.gray100 },
  gridPlaceholder: {
    flex: 1,
    backgroundColor: colors.gray100,
    padding: spacing.md,
    justifyContent: "center",
  },
  gridText: { fontSize: 12, color: colors.gray500, lineHeight: 16 },
});
