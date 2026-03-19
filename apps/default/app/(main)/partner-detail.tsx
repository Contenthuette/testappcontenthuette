import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { SymbolView } from "@/components/Icon";
import { Image } from "expo-image";

export default function PartnerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const partner = useQuery(api.partners.getById, id ? { partnerId: id as Id<"partners"> } : "skip");

  if (!partner) {
    return <SafeAreaView style={styles.safe}><View style={styles.loading}><ActivityIndicator color={colors.gray400} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageHeader}>
          {partner.thumbnailUrl ? (
            <Image source={{ uri: partner.thumbnailUrl }} style={styles.headerImage} contentFit="cover" />
          ) : (
            <View style={styles.headerPlaceholder}>
              <SymbolView name="building.2" size={40} tintColor={colors.gray300} />
            </View>
          )}
          <TouchableOpacity style={styles.backBtn} onPress={() => safeBack("partner-detail")}>
            <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.partnerBadge}>
            <Text style={styles.badgeText}>PARTNER</Text>
          </View>
          <Text style={styles.partnerName}>{partner.businessName}</Text>
          <Text style={styles.partnerDesc}>{partner.description}</Text>

          <View style={styles.ctaSection}>
            {partner.website && (
              <TouchableOpacity style={styles.ctaBtn} onPress={() => Linking.openURL(partner.website!)}>
                <SymbolView name="globe" size={20} tintColor={colors.black} />
                <Text style={styles.ctaText}>Website</Text>
              </TouchableOpacity>
            )}
            {partner.phone && (
              <TouchableOpacity style={styles.ctaBtn} onPress={() => Linking.openURL(`tel:${partner.phone}`)}>
                <SymbolView name="phone" size={20} tintColor={colors.black} />
                <Text style={styles.ctaText}>Anrufen</Text>
              </TouchableOpacity>
            )}
            {partner.address && (
              <TouchableOpacity style={styles.ctaBtn} onPress={() => Linking.openURL(`maps:?q=${partner.address}`)}>
                <SymbolView name="map" size={20} tintColor={colors.black} />
                <Text style={styles.ctaText}>Route</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  imageHeader: { height: 260, backgroundColor: colors.gray100, position: "relative" },
  headerImage: { width: "100%", height: "100%" },
  headerPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  backBtn: {
    position: "absolute", top: spacing.md, left: spacing.md,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center",
  },
  content: { padding: spacing.xl },
  partnerBadge: { backgroundColor: colors.black, alignSelf: "flex-start", paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.sm, marginBottom: spacing.md },
  badgeText: { fontSize: 11, fontWeight: "700", color: colors.white, letterSpacing: 1 },
  partnerName: { fontSize: 26, fontWeight: "700", color: colors.black, marginBottom: spacing.md },
  partnerDesc: { fontSize: 15, color: colors.gray700, lineHeight: 22 },
  ctaSection: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.xxl },
  ctaBtn: {
    flex: 1, minWidth: 100,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gray200,
  },
  ctaText: { fontSize: 14, fontWeight: "500", color: colors.black },
});
