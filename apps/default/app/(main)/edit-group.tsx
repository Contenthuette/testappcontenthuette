import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { SymbolView } from "@/components/Icon";
import { Image } from "expo-image";
import { safeBack } from "@/lib/navigation";
import { COUNTIES } from "@/lib/constants";
import * as ImagePicker from "expo-image-picker";

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useQuery(api.groups.getById, id ? { groupId: id as Id<"groups"> } : "skip");
  const membership = useQuery(api.groups.getMyMembership, id ? { groupId: id as Id<"groups"> } : "skip");
  const updateGroup = useMutation(api.groups.update);
  const generateUploadUrl = useMutation(api.groups.generateUploadUrl);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [visibility, setVisibility] = useState<"public" | "invite_only">("public");
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [newThumbnailStorageId, setNewThumbnailStorageId] = useState<Id<"_storage"> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (group) {
      setName(group.name ?? "");
      setDescription(group.description ?? "");
      setTopic(group.topic ?? "");
      setCity(group.city ?? "");
      setCounty(group.county ?? "");
      setVisibility(group.visibility);
      setThumbnailUri(group.thumbnailUrl ?? null);
    }
  }, [group?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isAdmin = membership?.role === "admin";

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      setThumbnailUri(asset.uri);
      setUploading(true);

      // Upload to Convex storage
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": asset.mimeType ?? "image/jpeg" },
        body: blob,
      });
      const { storageId } = await uploadResult.json();
      setNewThumbnailStorageId(storageId as Id<"_storage">);
      setUploading(false);
    } catch {
      setUploading(false);
      setError("Bild konnte nicht hochgeladen werden.");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Bitte gib einen Gruppennamen ein.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await updateGroup({
        groupId: id as Id<"groups">,
        name: name.trim(),
        description: description.trim() || undefined,
        topic: topic.trim() || undefined,
        city: city.trim() || undefined,
        county: county || undefined,
        visibility,
        ...(newThumbnailStorageId ? { thumbnailStorageId: newThumbnailStorageId } : {}),
      });
      setSaved(true);
      if (Platform.OS !== "web") {
        const Haptics = require("expo-haptics");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setTimeout(() => safeBack("edit-group"), 600);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Änderungen konnten nicht gespeichert werden.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!group || membership === undefined) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerWrap}><ActivityIndicator color={colors.gray300} /></View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeBack("edit-group")} hitSlop={12}>
            <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
          </TouchableOpacity>
          <Text style={styles.title}>Gruppe bearbeiten</Text>
          <View style={{ width: 20 }} />
        </View>
        <View style={styles.centerWrap}>
          <SymbolView name="lock" size={32} tintColor={colors.gray300} />
          <Text style={styles.noAccess}>Nur Gruppenadmins können diese Gruppe bearbeiten.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeBack("edit-group")} hitSlop={12}>
            <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
          </TouchableOpacity>
          <Text style={styles.title}>Gruppe bearbeiten</Text>
          <View style={{ width: 20 }} />
        </View>

        {/* Success */}
        {saved && (
          <View style={styles.successBar}>
            <SymbolView name="checkmark.circle.fill" size={18} tintColor={colors.success} />
            <Text style={styles.successText}>Änderungen gespeichert!</Text>
          </View>
        )}

        {/* Thumbnail */}
        <TouchableOpacity style={styles.thumbUpload} onPress={handlePickImage} activeOpacity={0.7}>
          {thumbnailUri ? (
            <Image source={{ uri: thumbnailUri }} style={styles.thumbImage} contentFit="cover" transition={200} />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <SymbolView name="camera.fill" size={24} tintColor={colors.gray400} />
              <Text style={styles.thumbText}>Gruppenbild hinzufügen</Text>
            </View>
          )}
          <View style={styles.thumbOverlay}>
            <View style={styles.thumbEditBadge}>
              {uploading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <SymbolView name="camera.fill" size={16} tintColor={colors.white} />
              )}
            </View>
          </View>
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Input label="Gruppenname" placeholder="z.B. Schwerin Startups" value={name} onChangeText={(t) => { setName(t); setSaved(false); }} />
        <Input label="Thema" placeholder="z.B. Technologie, Freizeit, Musik" value={topic} onChangeText={(t) => { setTopic(t); setSaved(false); }} />
        <Input label="Stadt" placeholder="z.B. Schwerin" value={city} onChangeText={(t) => { setCity(t); setSaved(false); }} />

        {/* County selector */}
        <Text style={styles.label}>Landkreis</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {COUNTIES.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, county === c && styles.chipActive]}
              onPress={() => { setCounty(county === c ? "" : c); setSaved(false); }}
            >
              <Text style={[styles.chipText, county === c && styles.chipTextActive]}>
                {c.replace(/ \(.*\)/, "")}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Input
          label="Beschreibung"
          placeholder="Worum geht es in deiner Gruppe?"
          value={description}
          onChangeText={(t) => { setDescription(t); setSaved(false); }}
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: "top" }}
        />

        {/* Visibility */}
        <Text style={styles.label}>Sichtbarkeit</Text>
        <View style={styles.visRow}>
          {(["public", "invite_only"] as const).map(v => (
            <TouchableOpacity
              key={v}
              style={[styles.visCard, visibility === v && styles.visCardActive]}
              onPress={() => { setVisibility(v); setSaved(false); }}
              activeOpacity={0.7}
            >
              <SymbolView
                name={v === "public" ? "globe" : "lock.fill"}
                size={20}
                tintColor={visibility === v ? colors.white : colors.gray500}
              />
              <Text style={[styles.visLabel, visibility === v && styles.visLabelActive]}>
                {v === "public" ? "Öffentlich" : "Einladung"}
              </Text>
              <Text style={[styles.visDesc, visibility === v && styles.visDescActive]}>
                {v === "public" ? "Jeder kann beitreten" : "Nur auf Einladung"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title="Änderungen speichern"
          onPress={handleSave}
          loading={loading}
          fullWidth
          size="lg"
          disabled={!name.trim() || uploading}
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xxl },
  noAccess: { fontSize: 15, color: colors.gray400, textAlign: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.lg,
  },
  title: { fontSize: 17, fontWeight: "600", color: colors.black },

  successBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: "#F0FDF4",
    borderRadius: radius.sm,
    marginBottom: spacing.lg,
  },
  successText: { fontSize: 14, fontWeight: "500", color: colors.success },

  thumbUpload: {
    height: 180,
    borderRadius: radius.md,
    backgroundColor: colors.gray100,
    marginBottom: spacing.xl,
    borderCurve: "continuous",
    overflow: "hidden",
    position: "relative",
  },
  thumbImage: { width: "100%", height: "100%" },
  thumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  thumbText: { fontSize: 14, color: colors.gray400 },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    padding: spacing.md,
  },
  thumbEditBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },

  error: {
    fontSize: 14,
    color: colors.danger,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: "#FEF2F2",
    borderRadius: radius.sm,
    overflow: "hidden",
  },

  label: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.gray700,
    marginBottom: spacing.sm,
  },
  chipScroll: { marginBottom: spacing.lg },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.black },
  chipText: { fontSize: 13, color: colors.gray600 },
  chipTextActive: { color: colors.white, fontWeight: "600" },

  visRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  visCard: {
    flex: 1,
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.gray100,
    gap: spacing.xs,
    borderCurve: "continuous",
  },
  visCardActive: { backgroundColor: colors.black },
  visLabel: { fontSize: 14, fontWeight: "600", color: colors.gray700, marginTop: 4 },
  visLabelActive: { color: colors.white },
  visDesc: { fontSize: 12, color: colors.gray400, textAlign: "center" },
  visDescActive: { color: "rgba(255,255,255,0.6)" },
});
