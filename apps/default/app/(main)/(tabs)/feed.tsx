import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius, shadows } from "@/lib/theme";
import { ZLogo } from "@/components/ZLogo";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { SymbolView } from "expo-symbols";
import { Image } from "expo-image";

const { width } = Dimensions.get("window");

export default function FeedScreen() {
  const feed = useQuery(api.posts.feed, {});
  const toggleLike = useMutation(api.posts.toggleLike);
  const toggleSave = useMutation(api.posts.toggleSave);

  const renderAnnouncement = (item: NonNullable<typeof feed>[number]) => (
    <View style={styles.announcementCard} key={item._id}>
      <View style={styles.announcementHeader}>
        <View style={styles.announcementBadge}>
          <ZLogo size={18} color={colors.white} />
          <Text style={styles.announcementLabel}>Z Announcement</Text>
        </View>
      </View>
      {item.mediaUrl && (
        <Image source={{ uri: item.mediaUrl }} style={styles.announcementImage} contentFit="cover" />
      )}
      {item.caption && <Text style={styles.announcementText}>{item.caption}</Text>}
    </View>
  );

  const renderPost = ({ item }: { item: NonNullable<typeof feed>[number] }) => {
    if (item.isAnnouncement) return renderAnnouncement(item);
    return (
      <View style={styles.postCard}>
        <TouchableOpacity
          style={styles.postHeader}
          onPress={() => router.push({ pathname: "/(main)/user-profile", params: { id: item.authorId } })}
        >
          <Avatar uri={item.authorAvatarUrl} name={item.authorName} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={styles.postAuthor}>{item.authorName}</Text>
            <Text style={styles.postTime}>{formatTime(item.createdAt)}</Text>
          </View>
        </TouchableOpacity>
        {item.mediaUrl && (
          <Image source={{ uri: item.mediaUrl }} style={styles.postImage} contentFit="cover" />
        )}
        <View style={styles.postActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike({ postId: item._id })}>
            <SymbolView name={item.isLiked ? "heart.fill" : "heart"} size={22} tintColor={item.isLiked ? colors.danger : colors.black} />
            <Text style={styles.actionCount}>{item.likeCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: "/(main)/post-comments", params: { id: item._id } })}>
            <SymbolView name="bubble.right" size={22} tintColor={colors.black} />
            <Text style={styles.actionCount}>{item.commentCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => toggleSave({ postId: item._id })}>
            <SymbolView name={item.isSaved ? "bookmark.fill" : "bookmark"} size={22} tintColor={colors.black} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.actionBtn}>
            <SymbolView name="paperplane" size={22} tintColor={colors.black} />
          </TouchableOpacity>
        </View>
        {item.caption && (
          <View style={styles.captionRow}>
            <Text style={styles.captionAuthor}>{item.authorName} </Text>
            <Text style={styles.captionText}>{item.caption}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <ZLogo size={32} />
        <Text style={styles.headerTitle}>Feed</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => router.push("/(main)/conversations")} style={styles.iconBtn}>
            <SymbolView name="paperplane" size={22} tintColor={colors.black} />
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={feed}
        renderItem={renderPost}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          feed === undefined ? null : (
            <EmptyState icon="photo.on.rectangle" title="Kein Content" subtitle="Sei der Erste, der etwas postet!" />
          )
        }
      />
    </SafeAreaView>
  );
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `vor ${hrs} Std.`;
  const days = Math.floor(hrs / 24);
  return `vor ${days} T.`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.sm },
  headerTitle: { fontSize: 22, fontWeight: "700", color: colors.black, flex: 1 },
  headerIcons: { flexDirection: "row", gap: spacing.xs },
  iconBtn: { padding: spacing.sm },
  list: { paddingBottom: 100 },
  // Announcement
  announcementCard: { marginHorizontal: spacing.xl, marginBottom: spacing.lg, backgroundColor: colors.black, borderRadius: radius.lg, overflow: "hidden", borderCurve: "continuous" },
  announcementHeader: { padding: spacing.md },
  announcementBadge: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  announcementLabel: { fontSize: 14, fontWeight: "700", color: colors.white },
  announcementImage: { width: "100%", height: 200 },
  announcementText: { padding: spacing.md, fontSize: 15, color: colors.white, lineHeight: 22 },
  // Post
  postCard: { marginBottom: spacing.sm },
  postHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.md },
  postAuthor: { fontSize: 15, fontWeight: "600", color: colors.black },
  postTime: { fontSize: 12, color: colors.gray400 },
  postImage: { width, height: width, backgroundColor: colors.gray100 },
  postActions: { flexDirection: "row", paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.lg },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  actionCount: { fontSize: 14, fontWeight: "500", color: colors.black },
  captionRow: { flexDirection: "row", paddingHorizontal: spacing.xl, paddingBottom: spacing.md, flexWrap: "wrap" },
  captionAuthor: { fontSize: 14, fontWeight: "600", color: colors.black },
  captionText: { fontSize: 14, color: colors.gray700, flex: 1 },
});
