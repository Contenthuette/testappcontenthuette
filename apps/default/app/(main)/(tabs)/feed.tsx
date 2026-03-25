import React, { useState, useCallback, useRef, useMemo, memo } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  useWindowDimensions, ActivityIndicator, ViewToken,
  Alert, Platform, ActionSheetIOS,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { usePaginatedQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { ZLogo } from "@/components/ZLogo";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { SymbolView } from "@/components/Icon";
import { Image } from "expo-image";
import { VideoPlayer } from "@/components/VideoPlayer";
import { useIsFocused } from "@react-navigation/native";
import { ShareSheet } from "@/components/ShareSheet";
import { useThumbnailRepair } from "@/lib/useThumbnailRepair";
import { PartnerList } from "@/components/PartnerList";
import type { Id } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";

const Z_LOGO_WHITE = require("../../../assets/images/z-logo-white.png");

const FEED_ASPECT_RATIO = 3 / 4;

interface FeedItem {
  _id: Id<"posts">;
  authorId: Id<"users">;
  authorName: string;
  authorAvatarUrl?: string;
  type: "photo" | "video";
  caption?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  aspectMode?: "original" | "cropped";
  cropOffsetY?: number;
  cropOffsetX?: number;
  cropZoom?: number;
  mediaAspectRatio?: number;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
  isPinned: boolean;
  isAnnouncement: boolean;
  isOwn: boolean;
  createdAt: number;
}

type FeedTab = "feed" | "partners";

// ── Helpers (module-level, zero cost) ─────────────
function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `vor ${hrs} Std.`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `vor ${days} T.`;
  return new Date(ts).toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}

function getCropTransform(item: FeedItem, screenWidth: number, mediaHeight: number) {
  const zoom = item.cropZoom ?? 1;
  const mediaAR = item.mediaAspectRatio ?? 9 / 16;
  const scaledW = screenWidth * zoom;
  const scaledH = (screenWidth / mediaAR) * zoom;
  const overflowX = Math.max(0, scaledW - screenWidth);
  const overflowY = Math.max(0, scaledH - mediaHeight);
  const tX = (0.5 - (item.cropOffsetX ?? 0.5)) * overflowX;
  const tY = (0.5 - (item.cropOffsetY ?? 0.5)) * overflowY;
  return { translateX: tX, translateY: tY, scale: zoom };
}

function getImagePosition(item: FeedItem) {
  const yOffset = item.cropOffsetY ?? 0.5;
  const xOffset = item.cropOffsetX ?? 0.5;
  return { top: `${yOffset * 100}%` as const, left: `${xOffset * 100}%` as const };
}

// ── Memoized Post Component ───────────────────────
interface FeedPostProps {
  item: FeedItem;
  screenWidth: number;
  feedMediaHeight: number;
  isVideoPlaying: boolean;
  onToggleLike: (postId: Id<"posts">) => void;
  onToggleSave: (postId: Id<"posts">) => void;
  onShare: (postId: Id<"posts">) => void;
  onDelete: (postId: Id<"posts">) => void;
}

const FeedPost = memo(function FeedPost({
  item, screenWidth, feedMediaHeight, isVideoPlaying,
  onToggleLike, onToggleSave, onShare, onDelete,
}: FeedPostProps) {
  if (item.isAnnouncement) {
    return (
      <View style={styles.announcementCard}>
        <View style={styles.announcementHeader}>
          <ZLogo size={28} />
          <View style={{ flex: 1 }}>
            <Text style={styles.announcementTitle}>Z Announcement</Text>
            <Text style={styles.announcementSub}>Offiziell</Text>
          </View>
        </View>
        {item.mediaUrl && (
          <Image source={{ uri: item.mediaUrl }} style={styles.announcementImage} contentFit="cover" cachePolicy="memory-disk" transition={0} />
        )}
        {item.caption && <Text style={styles.announcementText}>{item.caption}</Text>}
      </View>
    );
  }

  const isVideo = item.type === "video";
  const isOriginal = item.aspectMode === "original";
  const thumbUri = item.thumbnailUrl;

  // ── Render media ──
  const renderMedia = () => {
    if (!item.mediaUrl) return null;

    if (isVideo) {
      const crop = getCropTransform(item, screenWidth, feedMediaHeight);
      const mediaAR = item.mediaAspectRatio ?? 9 / 16;
      const nativeHeight = screenWidth / mediaAR;

      if (isOriginal) {
        return (
          <View style={[styles.mediaContainerOriginal, { width: screenWidth, height: feedMediaHeight }]}>
            {isVideoPlaying ? (
              <VideoPlayer uri={item.mediaUrl} height={feedMediaHeight} width={screenWidth} autoPlay loop hideControls isVisible contentFit="contain" posterUri={thumbUri} />
            ) : (
              <View style={{ width: screenWidth, height: feedMediaHeight, justifyContent: "center", alignItems: "center" }}>
                {thumbUri ? (
                  <Image source={{ uri: thumbUri }} style={{ width: screenWidth, height: feedMediaHeight }} contentFit="contain" cachePolicy="memory-disk" priority="high" transition={0} recyclingKey={item._id + "-ot"} />
                ) : (
                  <View style={{ width: screenWidth, height: feedMediaHeight, backgroundColor: "#111" }} />
                )}
                <View style={styles.videoPlayOverlay}>
                  <View style={styles.videoPlayCircle}>
                    <SymbolView name="play.fill" size={22} tintColor="#fff" />
                  </View>
                </View>
              </View>
            )}
          </View>
        );
      }

      return (
        <View style={[styles.mediaContainerCropped, { width: screenWidth, height: feedMediaHeight }]}>
          {isVideoPlaying ? (
            <View style={{ transform: [{ translateX: crop.translateX }, { translateY: crop.translateY }, { scale: crop.scale }] }}>
              <VideoPlayer uri={item.mediaUrl} height={nativeHeight} width={screenWidth} autoPlay loop hideControls isVisible posterUri={thumbUri} />
            </View>
          ) : (
            <View>
              {thumbUri ? (
                <Image source={{ uri: thumbUri }} style={{ width: screenWidth, height: feedMediaHeight }} contentFit="cover" contentPosition={getImagePosition(item)} cachePolicy="memory-disk" priority="high" transition={0} recyclingKey={item._id + "-ct"} />
              ) : (
                <View style={{ width: screenWidth, height: feedMediaHeight, backgroundColor: "#111" }} />
              )}
              <View style={styles.videoPlayOverlay}>
                <View style={styles.videoPlayCircle}>
                  <SymbolView name="play.fill" size={22} tintColor="#fff" />
                </View>
              </View>
            </View>
          )}
        </View>
      );
    }

    // Photo
    if (isOriginal) {
      return (
        <View style={[styles.mediaContainerOriginal, { width: screenWidth, height: feedMediaHeight }]}>
          <Image source={{ uri: item.mediaUrl }} style={{ width: screenWidth, height: feedMediaHeight }} contentFit="contain" cachePolicy="memory-disk" priority="high" transition={0} recyclingKey={item._id + "-o"} />
        </View>
      );
    }

    const hasZoom = (item.cropZoom ?? 1) > 1.05;
    if (hasZoom) {
      const crop = getCropTransform(item, screenWidth, feedMediaHeight);
      const mediaAR = item.mediaAspectRatio ?? 3 / 4;
      const photoH = screenWidth / mediaAR;
      return (
        <View style={[styles.mediaContainerCropped, { width: screenWidth, height: feedMediaHeight }]}>
          <View style={{ width: screenWidth, height: photoH, transform: [{ translateX: crop.translateX }, { translateY: crop.translateY }, { scale: crop.scale }] }}>
            <Image source={{ uri: item.mediaUrl }} style={{ width: screenWidth, height: photoH }} contentFit="cover" cachePolicy="memory-disk" priority="high" transition={0} recyclingKey={item._id + "-z"} />
          </View>
        </View>
      );
    }

    return (
      <Image source={{ uri: item.mediaUrl }} style={[styles.postImage, { width: screenWidth, height: feedMediaHeight }]} contentFit="cover" contentPosition={getImagePosition(item)} cachePolicy="memory-disk" priority="high" transition={0} recyclingKey={item._id + "-c"} />
    );
  };

  return (
    <View style={styles.postCard}>
      <TouchableOpacity
        style={styles.postHeader}
        onPress={() => router.push({ pathname: "/(main)/user-profile", params: { id: item.authorId } })}
        activeOpacity={0.7}
      >
        <Avatar uri={item.authorAvatarUrl} name={item.authorName} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={styles.postAuthor}>{item.authorName}</Text>
          <Text style={styles.postTime}>{formatTime(item.createdAt)}</Text>
        </View>
        <TouchableOpacity hitSlop={12} onPress={() => {
          if (!item.isOwn) return;
          if (Platform.OS === "ios") {
            ActionSheetIOS.showActionSheetWithOptions(
              {
                options: ["Abbrechen", "Beitrag l\u00f6schen"],
                destructiveButtonIndex: 1,
                cancelButtonIndex: 0,
              },
              (idx) => { if (idx === 1) onDelete(item._id); },
            );
          } else {
            Alert.alert("Beitrag l\u00f6schen?", "Dieser Beitrag wird unwiderruflich gel\u00f6scht.", [
              { text: "Abbrechen", style: "cancel" },
              { text: "L\u00f6schen", style: "destructive", onPress: () => onDelete(item._id) },
            ]);
          }
        }}>
          <SymbolView name="ellipsis" size={18} tintColor={item.isOwn ? colors.black : colors.gray300} />
        </TouchableOpacity>
      </TouchableOpacity>

      {renderMedia()}

      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onToggleLike(item._id)} hitSlop={8}>
          <SymbolView name={item.isLiked ? "heart.fill" : "heart"} size={24} tintColor={item.isLiked ? colors.danger : colors.black} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: "/(main)/post-comments", params: { id: item._id } })} hitSlop={8}>
          <SymbolView name="bubble.right" size={24} tintColor={colors.black} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} hitSlop={8} onPress={() => onShare(item._id)}>
          <SymbolView name="paperplane.fill" size={24} tintColor={colors.black} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => onToggleSave(item._id)} hitSlop={8}>
          <SymbolView name={item.isSaved ? "bookmark.fill" : "bookmark"} size={24} tintColor={colors.black} />
        </TouchableOpacity>
      </View>

      {item.likeCount > 0 && (
        <Text style={styles.likeCount}>{item.likeCount} {item.likeCount === 1 ? "Like" : "Likes"}</Text>
      )}
      {item.caption ? (
        <Text style={styles.captionRow}>
          <Text style={styles.captionAuthor}>{item.authorName} </Text>
          <Text style={styles.captionText}>{item.caption}</Text>
        </Text>
      ) : null}
      {item.commentCount > 0 && (
        <TouchableOpacity onPress={() => router.push({ pathname: "/(main)/post-comments", params: { id: item._id } })}>
          <Text style={styles.viewComments}>Alle {item.commentCount} Kommentare ansehen</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

// ── Main Feed Screen ────────────────────────────────────────
export default function FeedScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const { isAuthenticated } = useConvexAuth();
  const [activeTab, setActiveTab] = useState<FeedTab>("feed");
  const {
    results: feed,
    status: feedStatus,
    loadMore,
  } = usePaginatedQuery(api.posts.feed, isAuthenticated ? {} : "skip", {
    initialNumItems: 10,
  });
  const isFocused = useIsFocused();
  const [visibleVideoId, setVisibleVideoId] = useState<string | null>(null);
  const [sharePostId, setSharePostId] = useState<Id<"posts"> | null>(null);

  // Background thumbnail repair for videos missing thumbnails
  useThumbnailRepair(
    feed as Array<{ _id: string; type: "photo" | "video"; mediaUrl?: string; thumbnailUrl?: string }>,
  );

  const feedMediaHeight = screenWidth / FEED_ASPECT_RATIO;

  // Estimated item height for getItemLayout (header + media + actions + caption)
  const ESTIMATED_ITEM_HEIGHT = 56 + feedMediaHeight + 48 + 60 + 16;

  const toggleLike = useMutation(api.posts.toggleLike);
  const toggleSave = useMutation(api.posts.toggleSave);

  const deletePost = useMutation(api.posts.deletePost);

  // Stable callbacks that don't depend on feed data
  const handleToggleLike = useCallback((postId: Id<"posts">) => {
    toggleLike({ postId });
  }, [toggleLike]);

  const handleToggleSave = useCallback((postId: Id<"posts">) => {
    toggleSave({ postId });
  }, [toggleSave]);

  const handleShare = useCallback((postId: Id<"posts">) => {
    setSharePostId(postId);
  }, []);

  const handleDelete = useCallback(async (postId: Id<"posts">) => {
    try {
      await deletePost({ postId });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert("Fehler", "Beitrag konnte nicht gel\u00f6scht werden.");
    }
  }, [deletePost]);

  // Viewability: only tracks video ID, doesn't depend on feed
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const visibleVideo = viewableItems.find(
        (v) => v.isViewable && v.item?.type === "video" && v.item?.mediaUrl,
      );
      setVisibleVideoId(visibleVideo ? visibleVideo.item._id : null);
    },
    [],
  );

  // Prefetch upcoming images separately (fire-and-forget, no state)
  const onScrollEndDrag = useCallback(() => {
    if (!feed) return;
    // Prefetch next batch of images
    const start = feed.findIndex((f: FeedItem) => f._id === visibleVideoId) + 1;
    for (let i = start; i < start + 5 && i < feed.length; i++) {
      const uri = feed[i]?.thumbnailUrl ?? feed[i]?.mediaUrl;
      if (uri) Image.prefetch(uri);
    }
  }, [feed, visibleVideoId]);

  const getItemLayout = useCallback((_data: unknown, index: number) => ({
    length: ESTIMATED_ITEM_HEIGHT,
    offset: ESTIMATED_ITEM_HEIGHT * index,
    index,
  }), [ESTIMATED_ITEM_HEIGHT]);

  const keyExtractor = useCallback((item: FeedItem) => item._id, []);

  const renderItem = useCallback(({ item }: { item: FeedItem }) => (
    <FeedPost
      item={item}
      screenWidth={screenWidth}
      feedMediaHeight={feedMediaHeight}
      isVideoPlaying={isFocused && visibleVideoId === item._id}
      onToggleLike={handleToggleLike}
      onToggleSave={handleToggleSave}
      onShare={handleShare}
      onDelete={handleDelete}
    />
  ), [screenWidth, feedMediaHeight, isFocused, visibleVideoId, handleToggleLike, handleToggleSave, handleShare, handleDelete]);

  const listEmpty = useMemo(() => {
    if (feedStatus === "LoadingFirstPage") {
      return <View style={styles.loadingWrap}><ActivityIndicator color={colors.gray300} /></View>;
    }
    return <EmptyState icon="photo.on.rectangle" title="Dein Feed ist leer" subtitle="Folge Gruppen und Personen, um hier Beitraege zu sehen." />;
  }, [feedStatus]);

  const listFooter = useMemo(() => {
    if (feedStatus === "LoadingMore") {
      return <View style={styles.loadingWrap}><ActivityIndicator color={colors.gray300} /></View>;
    }
    if (feedStatus === "CanLoadMore") {
      return (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={() => loadMore(10)} activeOpacity={0.7}>
          <Text style={styles.loadMoreText}>Mehr laden</Text>
        </TouchableOpacity>
      );
    }
    return <View style={styles.footerSpacer} />;
  }, [feedStatus, loadMore]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <ZLogo size={47} />
        <Text style={styles.headerTitle}>Feed</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => router.push("/(main)/conversations")} style={styles.iconBtn}>
          <SymbolView name="bubble.left.and.bubble.right" size={22} tintColor={colors.black} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/(main)/notifications")} style={styles.iconBtn}>
          <SymbolView name="bell" size={22} tintColor={colors.black} />
        </TouchableOpacity>
      </View>

      {/* Tab Toggle */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "feed" && styles.tabBtnActive]}
          onPress={() => {
            if (activeTab !== "feed") {
              if (Platform.OS !== "web") Haptics.selectionAsync();
              setActiveTab("feed");
            }
          }}
          activeOpacity={0.7}
        >
          <SymbolView name="rectangle.stack" size={16} tintColor={activeTab === "feed" ? colors.white : colors.gray500} />
          <Text style={[styles.tabText, activeTab === "feed" && styles.tabTextActive]}>Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "partners" && styles.tabBtnActive]}
          onPress={() => {
            if (activeTab !== "partners") {
              if (Platform.OS !== "web") Haptics.selectionAsync();
              setActiveTab("partners");
            }
          }}
          activeOpacity={0.7}
        >
          <Image
            source={Z_LOGO_WHITE}
            style={[
              { width: 16, height: 16 },
              activeTab !== "partners" ? { tintColor: colors.gray500 } : undefined,
            ]}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={0}
          />
          <Text style={[styles.tabText, activeTab === "partners" && styles.tabTextActive]}>Partner</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "partners" ? (
        <PartnerList />
      ) : (
        <>
          <FlatList
            data={feed}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
            onScrollEndDrag={onScrollEndDrag}
            onEndReached={() => {
              if (feedStatus === "CanLoadMore") loadMore(10);
            }}
            onEndReachedThreshold={0.6}
            removeClippedSubviews
            maxToRenderPerBatch={4}
            windowSize={5}
            initialNumToRender={3}
            updateCellsBatchingPeriod={30}
            ListEmptyComponent={listEmpty}
            ListFooterComponent={listFooter}
          />

          <ShareSheet visible={sharePostId !== null} postId={sharePostId} onClose={() => setSharePostId(null)} />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: 10,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: colors.black, letterSpacing: -0.5 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

  /* Tab Toggle */
  tabRow: {
    flexDirection: "row",
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.gray100,
    borderRadius: radius.full,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: radius.full,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: colors.black,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray500,
    letterSpacing: -0.2,
  },
  tabTextActive: {
    color: colors.white,
  },

  list: { paddingBottom: 120 },
  loadingWrap: { paddingVertical: 60, alignItems: "center" },
  loadMoreBtn: {
    alignSelf: "center",
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
  },
  loadMoreText: { fontSize: 14, fontWeight: "600", color: colors.black },
  footerSpacer: { height: 80 },

  announcementCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    backgroundColor: colors.black,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderCurve: "continuous",
  },
  announcementHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  announcementTitle: { fontSize: 15, fontWeight: "700", color: colors.white },
  announcementSub: { fontSize: 12, color: "rgba(255,255,255,0.5)" },
  announcementImage: { width: "100%", height: 200 },
  announcementText: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: 15,
    color: colors.white,
    lineHeight: 22,
    letterSpacing: -0.1,
  },

  postCard: { marginBottom: spacing.lg },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  postAuthor: { fontSize: 15, fontWeight: "600", color: colors.black, letterSpacing: -0.2 },
  postTime: { fontSize: 12, color: colors.gray400 },

  postImage: { backgroundColor: colors.gray100 },
  mediaContainerOriginal: {
    backgroundColor: colors.gray100,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaContainerCropped: {
    backgroundColor: "#000",
    overflow: "hidden",
  },

  postActions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  actionBtn: { padding: 2 },
  likeCount: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.black,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  captionRow: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    lineHeight: 20,
  },
  captionAuthor: { fontSize: 14, fontWeight: "600", color: colors.black },
  captionText: { fontSize: 14, color: colors.gray700 },
  viewComments: {
    fontSize: 14,
    color: colors.gray400,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlayCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
});
