import React, { useCallback, useRef, useMemo, useState, memo } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  useWindowDimensions, ActivityIndicator, Platform,
  ViewToken, Alert, ActionSheetIOS,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { usePaginatedQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { Avatar } from "@/components/Avatar";
import { SymbolView } from "@/components/Icon";
import { Image } from "expo-image";
import { VideoPlayer } from "@/components/VideoPlayer";
import { useIsFocused } from "@react-navigation/native";
import { ShareSheet } from "@/components/ShareSheet";
import { safeBack } from "@/lib/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming,
  withDelay, runOnJS,
} from "react-native-reanimated";

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
  location?: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
  isPinned: boolean;
  isAnnouncement: boolean;
  isOwn: boolean;
  createdAt: number;
}

// ── Helpers ────────────────────────────────────────
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

// ── Loop Post ────────────────────────────────────
interface LoopPostProps {
  item: FeedItem;
  screenWidth: number;
  feedMediaHeight: number;
  isVideoPlaying: boolean;
  onToggleLike: (postId: Id<"posts">) => void;
  onToggleSave: (postId: Id<"posts">) => void;
  onShare: (postId: Id<"posts">) => void;
  onDelete: (postId: Id<"posts">) => void;
}

const LoopPost = memo(function LoopPost({
  item, screenWidth, feedMediaHeight, isVideoPlaying,
  onToggleLike, onToggleSave, onShare, onDelete,
}: LoopPostProps) {
  const [showHeart, setShowHeart] = useState(false);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const lastTapRef = useRef(0);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap!
      if (!item.isLiked) onToggleLike(item._id);
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowHeart(true);
      heartScale.value = withSequence(
        withTiming(1.3, { duration: 200 }),
        withTiming(1, { duration: 100 }),
        withDelay(400, withTiming(0, { duration: 250 }, () => runOnJS(setShowHeart)(false))),
      );
      heartOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(500, withTiming(0, { duration: 250 })),
      );
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [item._id, item.isLiked, onToggleLike, heartScale, heartOpacity]);

  const heartAnim = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  // Announcement
  if (item.isAnnouncement) {
    return (
      <View style={styles.announcementCard}>
        <View style={styles.announcementHeader}>
          <Text style={styles.announcementTitle}>Z Announcement</Text>
        </View>
        {item.mediaUrl && (
          <Image
            source={{ uri: item.mediaUrl }}
            style={{ width: screenWidth, height: 200 }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
          />
        )}
        {item.caption && <Text style={styles.announcementText}>{item.caption}</Text>}
      </View>
    );
  }

  const isVideo = item.type === "video";
  const isOriginal = item.aspectMode === "original";
  const thumbUri = item.thumbnailUrl;

  const renderMedia = () => {
    if (!item.mediaUrl) return null;

    if (isVideo) {
      const crop = getCropTransform(item, screenWidth, feedMediaHeight);
      const mediaAR = item.mediaAspectRatio ?? 9 / 16;
      const nativeHeight = screenWidth / mediaAR;

      if (isOriginal) {
        return (
          <View style={[styles.mediaOriginal, { width: screenWidth, height: feedMediaHeight }]}>
            {isVideoPlaying ? (
              <VideoPlayer uri={item.mediaUrl} height={feedMediaHeight} width={screenWidth} autoPlay loop hideControls isVisible contentFit="contain" posterUri={thumbUri} />
            ) : (
              <View style={{ width: screenWidth, height: feedMediaHeight, justifyContent: "center", alignItems: "center" }}>
                {thumbUri ? (
                  <Image source={{ uri: thumbUri }} style={{ width: screenWidth, height: feedMediaHeight }} contentFit="contain" cachePolicy="memory-disk" transition={0} recyclingKey={item._id + "-lot"} />
                ) : (
                  <View style={{ width: screenWidth, height: feedMediaHeight, backgroundColor: "#111" }} />
                )}
                <View style={styles.playOverlay}>
                  <View style={styles.playCircle}>
                    <SymbolView name="play.fill" size={22} tintColor="#fff" />
                  </View>
                </View>
              </View>
            )}
          </View>
        );
      }

      return (
        <View style={[styles.mediaCropped, { width: screenWidth, height: feedMediaHeight }]}>
          {isVideoPlaying ? (
            <View style={{ transform: [{ translateX: crop.translateX }, { translateY: crop.translateY }, { scale: crop.scale }] }}>
              <VideoPlayer uri={item.mediaUrl} height={nativeHeight} width={screenWidth} autoPlay loop hideControls isVisible posterUri={thumbUri} />
            </View>
          ) : (
            <View>
              {thumbUri ? (
                <Image source={{ uri: thumbUri }} style={{ width: screenWidth, height: feedMediaHeight }} contentFit="cover" contentPosition={getImagePosition(item)} cachePolicy="memory-disk" transition={0} recyclingKey={item._id + "-lct"} />
              ) : (
                <View style={{ width: screenWidth, height: feedMediaHeight, backgroundColor: "#111" }} />
              )}
              <View style={styles.playOverlay}>
                <View style={styles.playCircle}>
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
        <View style={[styles.mediaOriginal, { width: screenWidth, height: feedMediaHeight }]}>
          <Image source={{ uri: item.mediaUrl }} style={{ width: screenWidth, height: feedMediaHeight }} contentFit="contain" cachePolicy="memory-disk" transition={0} recyclingKey={item._id + "-lo"} />
        </View>
      );
    }

    const hasZoom = (item.cropZoom ?? 1) > 1.05;
    if (hasZoom) {
      const crop = getCropTransform(item, screenWidth, feedMediaHeight);
      const mediaAR = item.mediaAspectRatio ?? 3 / 4;
      const photoH = screenWidth / mediaAR;
      return (
        <View style={[styles.mediaCropped, { width: screenWidth, height: feedMediaHeight }]}>
          <View style={{ width: screenWidth, height: photoH, transform: [{ translateX: crop.translateX }, { translateY: crop.translateY }, { scale: crop.scale }] }}>
            <Image source={{ uri: item.mediaUrl }} style={{ width: screenWidth, height: photoH }} contentFit="cover" cachePolicy="memory-disk" transition={0} recyclingKey={item._id + "-lz"} />
          </View>
        </View>
      );
    }

    return (
      <Image source={{ uri: item.mediaUrl }} style={[styles.postImage, { width: screenWidth, height: feedMediaHeight }]} contentFit="cover" contentPosition={getImagePosition(item)} cachePolicy="memory-disk" transition={0} recyclingKey={item._id + "-lc"} />
    );
  };

  return (
    <View style={styles.postCard}>
      {/* Author row */}
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
        <TouchableOpacity
          hitSlop={12}
          onPress={() => {
            if (!item.isOwn) return;
            if (Platform.OS === "ios") {
              ActionSheetIOS.showActionSheetWithOptions(
                { options: ["Abbrechen", "Beitrag l\u00f6schen"], destructiveButtonIndex: 1, cancelButtonIndex: 0 },
                (idx) => { if (idx === 1) onDelete(item._id); },
              );
            } else {
              Alert.alert("Beitrag l\u00f6schen?", "Unwiderruflich.", [
                { text: "Abbrechen", style: "cancel" },
                { text: "L\u00f6schen", style: "destructive", onPress: () => onDelete(item._id) },
              ]);
            }
          }}
        >
          <SymbolView name="ellipsis" size={18} tintColor={colors.black} />
        </TouchableOpacity>
      </TouchableOpacity>

      {item.location && (
        <View style={styles.locationBadge}>
          <SymbolView name="mappin" size={12} tintColor={colors.gray500} />
          <Text style={styles.locationText}>{item.location}</Text>
        </View>
      )}

      {/* Media with double-tap */}
      <TouchableOpacity activeOpacity={1} onPress={handleDoubleTap}>
        {renderMedia()}
        {showHeart && (
          <Animated.View style={[styles.heartOverlay, heartAnim]} pointerEvents="none">
            <SymbolView name="heart.fill" size={80} tintColor="#fff" />
          </Animated.View>
        )}
      </TouchableOpacity>

      {/* Actions */}
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

// ── Feed Loop Screen ───────────────────────────────
export default function FeedLoopScreen() {
  const { startIndex: startIndexStr } = useLocalSearchParams<{ startIndex: string }>();
  const startIdx = parseInt(startIndexStr ?? "0", 10);
  const { width: screenWidth } = useWindowDimensions();
  const { isAuthenticated } = useConvexAuth();
  const isFocused = useIsFocused();
  const {
    results: feed,
    status: feedStatus,
    loadMore,
  } = usePaginatedQuery(api.posts.feed, isAuthenticated ? {} : "skip", {
    initialNumItems: Math.max(30, startIdx + 10),
  });

  const feedMediaHeight = screenWidth / FEED_ASPECT_RATIO;

  const toggleLike = useMutation(api.posts.toggleLike);
  const toggleSave = useMutation(api.posts.toggleSave);
  const deletePost = useMutation(api.posts.deletePost);
  const [visibleVideoId, setVisibleVideoId] = useState<string | null>(null);
  const [sharePostId, setSharePostId] = useState<Id<"posts"> | null>(null);
  const didScrollRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);

  const handleToggleLike = useCallback((postId: Id<"posts">) => { toggleLike({ postId }); }, [toggleLike]);
  const handleToggleSave = useCallback((postId: Id<"posts">) => { toggleSave({ postId }); }, [toggleSave]);
  const handleShare = useCallback((postId: Id<"posts">) => { setSharePostId(postId); }, []);
  const handleDelete = useCallback(async (postId: Id<"posts">) => {
    try {
      await deletePost({ postId });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Fehler", "Beitrag konnte nicht gel\u00f6scht werden.");
    }
  }, [deletePost]);

  // Viewability tracking for video autoplay
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

  const ESTIMATED_ITEM_HEIGHT = 56 + feedMediaHeight + 48 + 60 + 16;
  const getItemLayout = useCallback((_data: unknown, index: number) => ({
    length: ESTIMATED_ITEM_HEIGHT,
    offset: ESTIMATED_ITEM_HEIGHT * index,
    index,
  }), [ESTIMATED_ITEM_HEIGHT]);

  const keyExtractor = useCallback((item: FeedItem) => item._id, []);

  const renderItem = useCallback(({ item }: { item: FeedItem }) => (
    <LoopPost
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

  // Scroll to the tapped post after first load
  const onContentSizeChange = useCallback(() => {
    if (!didScrollRef.current && feed && feed.length > startIdx && flatListRef.current) {
      didScrollRef.current = true;
      // Small delay so layout is ready
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: startIdx, animated: false });
      }, 50);
    }
  }, [feed, startIdx]);

  const listFooter = useMemo(() => {
    if (feedStatus === "LoadingMore") {
      return <View style={styles.loadingWrap}><ActivityIndicator color={colors.gray300} /></View>;
    }
    return <View style={{ height: 80 }} />;
  }, [feedStatus]);

  if (!feed || feed.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loopHeader}>
          <TouchableOpacity onPress={() => safeBack("feed-loop")} style={styles.backBtn}>
            <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
          </TouchableOpacity>
          <Text style={styles.loopTitle}>Beitr\u00e4ge</Text>
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.gray300} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.loopHeader}>
        <TouchableOpacity onPress={() => safeBack("feed-loop")} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.loopTitle}>Beitr\u00e4ge</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={feed}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        contentContainerStyle={styles.loopList}
        showsVerticalScrollIndicator={false}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        onContentSizeChange={onContentSizeChange}
        onScrollToIndexFailed={(info) => {
          // Fallback: scroll to estimated offset
          flatListRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: false,
          });
        }}
        onEndReached={() => {
          if (feedStatus === "CanLoadMore") loadMore(10);
        }}
        onEndReachedThreshold={0.6}
        removeClippedSubviews
        maxToRenderPerBatch={4}
        windowSize={5}
        initialNumToRender={3}
        ListFooterComponent={listFooter}
      />

      <ShareSheet visible={sharePostId !== null} postId={sharePostId} onClose={() => setSharePostId(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  loadingWrap: { paddingVertical: 60, alignItems: "center" },

  /* Loop header */
  loopHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray100,
  },
  backBtn: { padding: spacing.xs },
  loopTitle: { fontSize: 17, fontWeight: "600", color: colors.black },
  loopList: { paddingBottom: 120 },

  /* Post card */
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
  mediaOriginal: {
    backgroundColor: colors.gray100,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaCropped: {
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

  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  playCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },

  heartOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },

  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.xl,
    paddingBottom: 6,
  },
  locationText: { fontSize: 12, color: colors.gray500 },

  announcementCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    backgroundColor: colors.black,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderCurve: "continuous",
  },
  announcementHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  announcementTitle: { fontSize: 15, fontWeight: "700", color: colors.white },
  announcementText: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: 15,
    color: colors.white,
    lineHeight: 22,
  },
});
