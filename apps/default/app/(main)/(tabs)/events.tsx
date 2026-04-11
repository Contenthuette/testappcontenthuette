import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { usePaginatedQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { EmptyState } from "@/components/EmptyState";
import { SymbolView } from "@/components/Icon";
import { ZLogo } from "@/components/ZLogo";
import { Image } from "expo-image";
import { RedactedBar } from "@/components/RedactedBar";

type TabKey = "official" | "member";

function calcEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const totalMin = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

export default function EventsScreen() {
  const { isAuthenticated } = useConvexAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("official");

  // Z Events (official)
  const {
    results: officialEvents,
    status: officialStatus,
    loadMore: loadMoreOfficial,
  } = usePaginatedQuery(
    api.events.list,
    isAuthenticated ? {} : "skip",
    { initialNumItems: 12 },
  );

  // Member Events
  const {
    results: memberEvents,
    status: memberStatus,
    loadMore: loadMoreMember,
  } = usePaginatedQuery(
    api.memberEvents.list,
    isAuthenticated ? {} : "skip",
    { initialNumItems: 12 },
  );

  const renderOfficialEvent = ({ item }: { item: NonNullable<typeof officialEvents>[number] }) => {
    const isHidden = item.isInfoHidden === true;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.navigate({
            pathname: "/(main)/event-detail",
            params: { id: item._id },
          })
        }
        activeOpacity={0.65}
      >
        <View style={styles.cardImageWrap}>
          {item.thumbnailUrl ? (
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={styles.cardImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <SymbolView name="sparkles" size={32} tintColor={colors.gray300} />
            </View>
          )}
          {!isHidden && (
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>€{item.ticketPrice.toFixed(0)}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.infoRow}>
            <SymbolView name="mappin" size={13} tintColor={colors.gray400} />
            {isHidden ? (
              <View style={styles.redactedInline}>
                <RedactedBar width={70} height={12} />
                <RedactedBar width={50} height={12} />
              </View>
            ) : (
              <Text style={styles.infoText}>
                {item.venue}, {item.city}
              </Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <SymbolView name="calendar" size={13} tintColor={colors.gray400} />
            {isHidden ? (
              <RedactedBar width={140} height={12} />
            ) : (
              <Text style={styles.infoText}>
                {item.date} · {item.startTime} -{" "}
                {calcEndTime(item.startTime, item.durationMinutes)} Uhr
              </Text>
            )}
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.ticketCount}>
              {item.totalTickets} Ticket{item.totalTickets !== 1 ? "s" : ""}{" "}
              verfügbar
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMemberEvent = ({
    item,
  }: {
    item: NonNullable<typeof memberEvents>[number];
  }) => {
    const isFull =
      !!item.maxAttendees && item.attendeeCount >= item.maxAttendees;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.navigate({
            pathname: "/(main)/member-event-detail",
            params: { id: item._id },
          })
        }
        activeOpacity={0.65}
      >
        <View style={styles.cardImageWrap}>
          {item.thumbnailUrl ? (
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={styles.cardImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <SymbolView name="party.popper" size={32} tintColor={colors.gray300} />
            </View>
          )}
          <View style={styles.freeBadge}>
            <Text style={styles.freeText}>Kostenlos</Text>
          </View>
          {item.isAttending && (
            <View style={styles.attendingBadge}>
              <SymbolView name="checkmark" size={10} tintColor={colors.white} />
              <Text style={styles.attendingText}>Dabei</Text>
            </View>
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.infoRow}>
            <SymbolView name="mappin" size={13} tintColor={colors.gray400} />
            <Text style={styles.infoText}>
              {item.venue}, {item.city}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <SymbolView name="calendar" size={13} tintColor={colors.gray400} />
            <Text style={styles.infoText}>
              {item.date} · {item.startTime} –{" "}
              {calcEndTime(item.startTime, item.durationMinutes)} Uhr
            </Text>
          </View>
          <View style={styles.cardFooter}>
            <View style={styles.attendeeInfo}>
              <SymbolView name="person.2" size={13} tintColor={colors.black} />
              <Text style={styles.attendeeCount}>
                {item.attendeeCount}
                {item.maxAttendees ? ` / ${item.maxAttendees}` : ""}
                {" "}Teilnehmer
              </Text>
            </View>
            {isFull && (
              <View style={styles.fullBadge}>
                <Text style={styles.fullText}>Voll</Text>
              </View>
            )}
            {item.status === "canceled" && (
              <View style={styles.canceledBadge}>
                <Text style={styles.canceledBadgeText}>Abgesagt</Text>
              </View>
            )}
          </View>
          <View style={styles.creatorRow}>
            {item.creatorAvatarUrl ? (
              <Image
                source={{ uri: item.creatorAvatarUrl }}
                style={styles.creatorAvatar}
              />
            ) : (
              <View
                style={[
                  styles.creatorAvatar,
                  styles.creatorAvatarPlaceholder,
                ]}
              >
                <SymbolView
                  name="person.fill"
                  size={10}
                  tintColor={colors.gray400}
                />
              </View>
            )}
            <Text style={styles.creatorName}>von {item.creatorName}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const events = activeTab === "official" ? officialEvents : memberEvents;
  const status = activeTab === "official" ? officialStatus : memberStatus;
  const loadMore =
    activeTab === "official" ? loadMoreOfficial : loadMoreMember;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <ZLogo size={47} />
        <Text style={styles.headerTitle}>Events</Text>
        <View style={{ flex: 1 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "official" && styles.tabActive]}
          onPress={() => setActiveTab("official")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "official" && styles.tabTextActive,
            ]}
          >
            Z Events
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "member" && styles.tabActive]}
          onPress={() => setActiveTab("member")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "member" && styles.tabTextActive,
            ]}
          >
            Member Events
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={events}
        renderItem={
          activeTab === "official"
            ? (renderOfficialEvent as FlatList["props"]["renderItem"])
            : (renderMemberEvent as FlatList["props"]["renderItem"])
        }
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (status === "CanLoadMore") loadMore(12);
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          status === "LoadingMore" ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.gray300} />
            </View>
          ) : status === "CanLoadMore" ? (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={() => loadMore(12)}
            >
              <Text style={styles.loadMoreText}>Mehr laden</Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          status === "LoadingFirstPage" ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.gray300} />
            </View>
          ) : activeTab === "official" ? (
            <EmptyState
              icon="sparkles"
              title="Keine Events gerade"
              subtitle="Neue Events in Schwerin, Rostock und ganz MV erscheinen hier."
            />
          ) : (
            <EmptyState
              icon="party.popper"
              title="Keine Member Events"
              subtitle="Erstelle dein eigenes kostenloses Event und lade die Community ein!"
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.black,
    letterSpacing: -0.5,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
  },
  tabActive: {
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
  list: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
  loadingWrap: { paddingVertical: 60, alignItems: "center" },
  loadMoreBtn: {
    alignSelf: "center",
    marginBottom: spacing.lg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.black,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    overflow: "hidden",
    borderCurve: "continuous",
  },
  cardImageWrap: {
    height: 180,
    backgroundColor: colors.gray100,
    position: "relative",
  },
  cardImage: { width: "100%", height: "100%" },
  cardImagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  priceBadge: {
    position: "absolute",
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  priceText: { fontSize: 16, fontWeight: "800", color: colors.white },
  freeBadge: {
    position: "absolute",
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  freeText: { fontSize: 13, fontWeight: "700", color: colors.white },
  attendingBadge: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(22,163,74,0.85)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  attendingText: { fontSize: 11, fontWeight: "700", color: colors.white },
  cardBody: { padding: spacing.lg },
  cardName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.black,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: colors.gray500,
    letterSpacing: -0.1,
    flex: 1,
  },
  redactedInline: {
    flexDirection: "row",
    gap: 6,
    flex: 1,
    alignItems: "center",
  },
  cardFooter: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  ticketCount: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.black,
  },
  attendeeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  attendeeCount: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.black,
  },
  fullBadge: {
    backgroundColor: "rgba(220,38,38,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  fullText: { fontSize: 11, fontWeight: "700", color: "#dc2626" },
  canceledBadge: {
    backgroundColor: "rgba(220,38,38,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  canceledBadgeText: { fontSize: 11, fontWeight: "700", color: "#dc2626" },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
  },
  creatorAvatar: { width: 20, height: 20, borderRadius: 10 },
  creatorAvatarPlaceholder: {
    backgroundColor: colors.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  creatorName: {
    fontSize: 12,
    color: colors.gray400,
    fontWeight: "500",
  },
});
