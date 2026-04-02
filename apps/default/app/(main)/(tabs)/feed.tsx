import React, { useCallback, useMemo, useState, memo } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  useWindowDimensions, ActivityIndicator, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { usePaginatedQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { ZLogo } from "@/components/ZLogo";
import { EmptyState } from "@/components/EmptyState";
import { SymbolView } from "@/components/Icon";
import { Image } from "expo-image";
import { useThumbnailRepair } from "@/lib/useThumbnailRepair";
import { PartnerList } from "@/components/PartnerList";
import type { Id } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";

const GRID_GAP = 2;
const NUM_COLUMNS = 3;
const TILE_ASPECT = 3 / 4; // width:height = 3:4, so height = width / (3/4)

type FeedTab = "feed" | "partners";

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

// ── Grid Tile ─────────────────────────────────────
interface TileProps {
  item: FeedItem;
  tileSize: number;
  index: number;
}

const GridTile = memo(function GridTile({ item, tileSize, index }: TileProps) {
  const tileHeight = tileSize / TILE_ASPECT;
  const uri = item.thumbnailUrl ?? item.mediaUrl;
  const isVideo = item.type === "video";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() =>
        router.push({
          pathname: "/(main)/feed-loop",
          params: { startIndex: String(index) },
        })
      }
      style={[
        styles.tile,
        {
          width: tileSize,
          height: tileHeight,
          marginRight: (index + 1) % NUM_COLUMNS === 0 ? 0 : GRID_GAP,
          marginBottom: GRID_GAP,
        },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition={
            item.cropOffsetY !== undefined || item.cropOffsetX !== undefined
              ? {
                  top: `${(item.cropOffsetY ?? 0.5) * 100}%`,
                  left: `${(item.cropOffsetX ?? 0.5) * 100}%`,
                }
              : undefined
          }
          cachePolicy="memory-disk"
          recyclingKey={item._id + "-grid"}
          transition={0}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.gray200 }]} />
      )}

      {isVideo && (
        <View style={styles.videoIndicator}>
          <SymbolView name="play.fill" size={12} tintColor="#fff" />
        </View>
      )}

      {item.isPinned && (
        <View style={styles.pinnedIndicator}>
          <SymbolView name="pin.fill" size={10} tintColor="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
});

// ── Main Feed Screen ──────────────────────────────
export default function FeedScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const { isAuthenticated } = useConvexAuth();
  const [activeTab, setActiveTab] = useState<FeedTab>("feed");
  const {
    results: feed,
    status: feedStatus,
    loadMore,
  } = usePaginatedQuery(api.posts.feed, isAuthenticated ? {} : "skip", {
    initialNumItems: 30,
  });

  useThumbnailRepair(
    feed as Array<{ _id: string; type: "photo" | "video"; mediaUrl?: string; thumbnailUrl?: string }>,
  );

  const tileSize = (screenWidth - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  const keyExtractor = useCallback((item: FeedItem) => item._id, []);

  const renderTile = useCallback(
    ({ item, index }: { item: FeedItem; index: number }) => (
      <GridTile item={item} tileSize={tileSize} index={index} />
    ),
    [tileSize],
  );

  const listEmpty = useMemo(() => {
    if (feedStatus === "LoadingFirstPage") {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.gray300} />
        </View>
      );
    }
    return (
      <EmptyState
        icon="photo.on.rectangle"
        title="Dein Feed ist leer"
        subtitle="Folge Gruppen und Personen, um hier Beiträge zu sehen."
      />
    );
  }, [feedStatus]);

  const listFooter = useMemo(() => {
    if (feedStatus === "LoadingMore") {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.gray300} />
        </View>
      );
    }
    return <View style={{ height: 100 }} />;
  }, [feedStatus]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <ZLogo size={47} />
        <Text style={styles.headerTitle}>Feed</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => router.push("/(main)/conversations")}
          style={styles.iconBtn}
        >
          <SymbolView name="bubble.left.and.bubble.right" size={22} tintColor={colors.black} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/(main)/notifications")}
          style={styles.iconBtn}
        >
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
          <SymbolView
            name="rectangle.grid.3x2"
            size={16}
            tintColor={activeTab === "feed" ? colors.white : colors.gray500}
          />
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
          <SymbolView
            name="handshake"
            size={16}
            tintColor={activeTab === "partners" ? colors.white : colors.gray500}
          />
          <Text style={[styles.tabText, activeTab === "partners" && styles.tabTextActive]}>
            Partner
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "partners" ? (
        <PartnerList />
      ) : (
        <FlatList
          data={feed}
          renderItem={renderTile}
          keyExtractor={keyExtractor}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (feedStatus === "CanLoadMore") loadMore(30);
          }}
          onEndReachedThreshold={0.5}
          removeClippedSubviews
          maxToRenderPerBatch={15}
          windowSize={7}
          initialNumToRender={15}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
        />
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
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.black,
    letterSpacing: -0.5,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

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
  tabBtnActive: { backgroundColor: colors.black },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray500,
    letterSpacing: -0.2,
  },
  tabTextActive: { color: colors.white },

  /* Grid */
  grid: { paddingBottom: 120 },
  loadingWrap: { paddingVertical: 60, alignItems: "center" },

  tile: {
    backgroundColor: colors.gray100,
    overflow: "hidden",
  },
  videoIndicator: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  pinnedIndicator: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
