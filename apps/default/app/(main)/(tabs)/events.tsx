import React from "react";
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

function calcEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const totalMin = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

function formatDateDE(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  return iso;
}

type OfficialEvent = {
  _id: string;
  name: string;
  thumbnailUrl?: string;
  venue: string;
  city: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  totalTickets: number;
  ticketPrice: number;
  status: string;
  isInfoHidden: boolean;
};

type MemberEvent = {
  _id: string;
  name: string;
  thumbnailUrl?: string;
  venue: string;
  city: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  maxAttendees?: number;
  attendeeCount: number;
  status: string;
  isAttending: boolean;
  isCreator: boolean;
  creatorName: string;
  creatorAvatarUrl?: string;
};

type UnifiedItem =
  | { kind: "official"; data: OfficialEvent }
  | { kind: "member"; data: MemberEvent };

export default function EventsScreen() {
  const { isAuthenticated } = useConvexAuth();

  const {
    results: officialEvents,
    status: officialStatus,
    loadMore: loadMoreOfficial,
  } = usePaginatedQuery(
    api.events.list,
    isAuthenticated ? {} : "skip",
    { initialNumItems: 20 },
  );

  const {
    results: memberEvents,
    status: memberStatus,
    loadMore: loadMoreMember,
  } = usePaginatedQuery(
    api.memberEvents.list,
    isAuthenticated ? {} : "skip",
    { initialNumItems: 20 },
  );

  // Z Events always on top, then member events sorted by date
  const unified: UnifiedItem[] = [
    ...(officialEvents ?? []).map(
      (e) => ({ kind: "official" as const, data: e as OfficialEvent }),
    ),
    ...(memberEvents ?? []).map(
      (e) => ({ kind: "member" as const, data: e as MemberEvent }),
    ),
  ];

  const isLoading =
    officialStatus === "LoadingFirstPage" || memberStatus === "LoadingFirstPage";
  const canLoadMore =
    officialStatus === "CanLoadMore" || memberStatus === "CanLoadMore";
  const isLoadingMore =
    officialStatus === "LoadingMore" || memberStatus === "LoadingMore";

  const handleLoadMore = () => {
    if (officialStatus === "CanLoadMore") loadMoreOfficial(20);
    if (memberStatus === "CanLoadMore") loadMoreMember(20);
  };

  const renderItem = ({ item }: { item: UnifiedItem }) => {
    if (item.kind === "official") return renderOfficialEvent(item.data);
    return renderMemberEvent(item.data);
  };

  const renderOfficialEvent = (item: OfficialEvent) => {
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
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>Z EVENT</Text>
          </View>
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
                {formatDateDE(item.date)} · {item.startTime} -{" "}
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

  const renderMemberEvent = (item: MemberEvent) => {
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
              <SymbolView name="calendar.badge.plus" size={32} tintColor={colors.gray300} />
            </View>
          )}
          <View style={[styles.typeBadge, styles.memberBadge]}>
            <Text style={styles.typeBadgeText}>MEMBER EVENT</Text>
          </View>
          {item.isAttending && (
            <View style={styles.attendingBadge}>
              <SymbolView name="checkmark" size={10} tintColor={colors.white} />
              <Text style={styles.attendingText}>Dabei</Text>
            </View>
          )}
          {item.isCreator && item.status !== "canceled" && (
            <TouchableOpacity
              style={styles.editCardBtn}
              onPress={(e) => {
                e.stopPropagation();
                router.navigate({
                  pathname: "/(main)/edit-member-event",
                  params: { id: item._id },
                });
              }}
              activeOpacity={0.7}
              hitSlop={8}
            >
              <SymbolView name="pencil" size={12} tintColor={colors.white} />
            </TouchableOpacity>
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
              {formatDateDE(item.date)} · {item.startTime} –{" "}
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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <ZLogo size={47} />
        <Text style={styles.headerTitle}>Events</Text>
        <View style={{ flex: 1 }} />
      </View>

      <FlatList
        data={unified}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.kind}-${item.data._id}`}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (canLoadMore) handleLoadMore();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.gray300} />
            </View>
          ) : canLoadMore ? (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={handleLoadMore}
            >
              <Text style={styles.loadMoreText}>Mehr laden</Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.gray300} />
            </View>
          ) : (
            <EmptyState
              icon="sparkles"
              title="Keine Events gerade"
              subtitle="Neue Events in Schwerin, Rostock und ganz MV erscheinen hier."
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
  typeBadge: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  memberBadge: {
    backgroundColor: "rgba(60,60,60,0.75)",
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: 0.8,
  },
  attendingBadge: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(22,163,74,0.85)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  attendingText: { fontSize: 11, fontWeight: "700", color: colors.white },
  editCardBtn: {
    position: "absolute",
    bottom: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
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
