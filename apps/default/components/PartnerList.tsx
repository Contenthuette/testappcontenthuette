import React from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Linking, Platform,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { EmptyState } from "@/components/EmptyState";
import { SymbolView } from "@/components/Icon";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import type { Id } from "@/convex/_generated/dataModel";

interface PartnerItem {
  _id: Id<"partners">;
  businessName: string;
  shortText: string;
  thumbnailUrl?: string;
  website?: string;
  city?: string;
  isActive: boolean;
  createdAt: number;
}

export function PartnerList() {
  const { isAuthenticated } = useConvexAuth();
  const partners = useQuery(api.partners.list, isAuthenticated ? {} : "skip");

  const handleWebsite = (url: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url.startsWith("http") ? url : `https://${url}`);
  };

  const renderPartner = ({ item }: { item: PartnerItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: "/(main)/partner-detail", params: { id: item._id } })}
      activeOpacity={0.65}
    >
      <View style={styles.cardImageWrap}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={styles.cardImage} contentFit="cover" transition={200} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <SymbolView name="building.2" size={32} tintColor={colors.gray300} />
          </View>
        )}
        <View style={styles.partnerBadge}>
          <Text style={styles.partnerBadgeZ}>Z</Text>
          <Text style={styles.partnerBadgeText}>PARTNER</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>{item.businessName}</Text>
        <Text style={styles.cardText} numberOfLines={2}>{item.shortText}</Text>
        {item.city && (
          <View style={styles.infoRow}>
            <SymbolView name="mappin" size={13} tintColor={colors.gray400} />
            <Text style={styles.infoText}>{item.city}</Text>
          </View>
        )}
        {item.website && (
          <TouchableOpacity
            style={styles.websiteBtn}
            onPress={(e) => {
              e.stopPropagation();
              handleWebsite(item.website!);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.websiteBtnText}>Webseite besuchen</Text>
            <Text style={styles.websiteArrow}>↗</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  if (partners === undefined) {
    return <View style={styles.loadingWrap}><ActivityIndicator color={colors.gray300} /></View>;
  }

  return (
    <FlatList
      data={partners}
      renderItem={renderPartner}
      keyExtractor={item => item._id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <EmptyState
          icon="building.2"
          title="Keine Partner"
          subtitle="Z Partner aus MV erscheinen hier bald."
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
  loadingWrap: { paddingVertical: 60, alignItems: "center" },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    overflow: "hidden",
    borderCurve: "continuous",
  },
  cardImageWrap: { height: 180, backgroundColor: colors.gray100, position: "relative" },
  cardImage: { width: "100%", height: "100%" },
  cardImagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  partnerBadge: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.black,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  partnerBadgeZ: { fontSize: 12, fontWeight: "900", color: colors.white, letterSpacing: -0.5 },
  partnerBadgeText: { fontSize: 11, fontWeight: "700", color: colors.white, letterSpacing: 0.5 },
  cardBody: { padding: spacing.lg },
  cardName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.black,
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
  cardText: {
    fontSize: 14,
    color: colors.gray500,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  infoText: { fontSize: 14, color: colors.gray500, letterSpacing: -0.1, flex: 1 },
  websiteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.black,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    borderCurve: "continuous",
  },
  websiteBtnText: { fontSize: 13, fontWeight: "600", color: colors.white },
  websiteArrow: { fontSize: 13, color: colors.white, marginLeft: 2 },
});
