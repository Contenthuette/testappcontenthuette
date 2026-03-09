import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Platform, Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Image } from "expo-image";
import { SymbolView } from "@/components/Icon";
import { safeBack } from "@/lib/navigation";
import { colors, spacing, radius } from "@/lib/theme";
import { COUNTIES } from "@/lib/constants";

const TOPICS = [
  "Sport & Fitness", "Kunst & Kultur", "Musik", "Natur & Outdoor",
  "Technologie", "Gaming", "Essen & Trinken", "Bildung",
  "Soziales", "Business", "Reisen", "Sonstiges",
];

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useQuery(api.groups.getById, id ? { groupId: id as Id<"groups"> } : "skip");
  const updateGroup = useMutation(api.groups.update);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  const [topic, setTopic] = useState("");
  const [visibility, setVisibility] = useState<"public" | "invite_only">("public");
  const [saving, setSaving] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const [showCounties, setShowCounties] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    if (group) {
      setName(group.name || "");
      setDescription(group.description || "");
      setCounty(group.county || "");
      setCity(group.city || "");
      setTopic(group.topic || "");
      setVisibility(group.visibility === "invite_only" ? "invite_only" : "public");
    }
  }, [group?._id]);

  const handleSave = useCallback(async () => {
    if (!id || !name.trim()) {
      if (Platform.OS !== "web") {
        Alert.alert("Fehler", "Gruppenname darf nicht leer sein.");
      }
      return;
    }
    setSaving(true);
    try {
      await updateGroup({
        groupId: id as Id<"groups">,
        name: name.trim(),
        description: description.trim() || undefined,
        county: county || undefined,
        city: city.trim() || undefined,
        topic: topic || undefined,
        visibility,
      });
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Speichern fehlgeschlagen";
      if (Platform.OS !== "web") {
        Alert.alert("Fehler", msg);
      }
    } finally {
      setSaving(false);
    }
  }, [id, name, description, county, city, topic, visibility, updateGroup]);

  if (!group) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.gray400} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack()} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={22} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gruppe bearbeiten</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>Speichern</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Success Banner */}
      {successMsg && (
        <View style={styles.successBanner}>
          <SymbolView name="checkmark.circle.fill" size={18} tintColor={colors.white} />
          <Text style={styles.successText}>Gruppe erfolgreich aktualisiert</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Thumbnail Preview */}
        <View style={styles.thumbnailSection}>
          <View style={styles.thumbnailContainer}>
            {group.thumbnailUrl ? (
              <Image source={{ uri: group.thumbnailUrl }} style={styles.thumbnail} />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <SymbolView name="camera" size={32} tintColor={colors.gray400} />
              </View>
            )}
          </View>
          <Text style={styles.thumbnailHint}>Thumbnail wird beim Erstellen festgelegt</Text>
        </View>

        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Gruppenname</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="Name der Gruppe"
            placeholderTextColor={colors.gray400}
            maxLength={60}
          />
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Beschreibung</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Beschreibe deine Gruppe..."
            placeholderTextColor={colors.gray400}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        {/* County */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Landkreis</Text>
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={() => setShowCounties(!showCounties)}
          >
            <Text style={[styles.selectBtnText, !county && { color: colors.gray400 }]}>
              {county || "Landkreis w\u00e4hlen"}
            </Text>
            <SymbolView
              name={showCounties ? "chevron.up" : "chevron.down"}
              size={16}
              tintColor={colors.gray400}
            />
          </TouchableOpacity>
          {showCounties && (
            <View style={styles.chipGrid}>
              {COUNTIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.chip,
                    county === c && styles.chipActive,
                  ]}
                  onPress={() => {
                    setCounty(c);
                    setShowCounties(false);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      county === c && styles.chipTextActive,
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* City */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Stadt / Ort</Text>
          <TextInput
            style={styles.textInput}
            value={city}
            onChangeText={setCity}
            placeholder="z.B. Rostock, Schwerin..."
            placeholderTextColor={colors.gray400}
            maxLength={100}
          />
        </View>

        {/* Topic */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Thema</Text>
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={() => setShowTopics(!showTopics)}
          >
            <Text style={[styles.selectBtnText, !topic && { color: colors.gray400 }]}>
              {topic || "Thema w\u00e4hlen"}
            </Text>
            <SymbolView
              name={showTopics ? "chevron.up" : "chevron.down"}
              size={16}
              tintColor={colors.gray400}
            />
          </TouchableOpacity>
          {showTopics && (
            <View style={styles.chipGrid}>
              {TOPICS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.chip,
                    topic === t && styles.chipActive,
                  ]}
                  onPress={() => {
                    setTopic(t);
                    setShowTopics(false);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      topic === t && styles.chipTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Visibility */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Sichtbarkeit</Text>
          <View style={styles.visibilityRow}>
            <TouchableOpacity
              style={[
                styles.visibilityOption,
                visibility === "public" && styles.visibilityOptionActive,
              ]}
              onPress={() => setVisibility("public")}
            >
              <SymbolView
                name="globe"
                size={20}
                tintColor={visibility === "public" ? colors.white : colors.black}
              />
              <Text
                style={[
                  styles.visibilityText,
                  visibility === "public" && styles.visibilityTextActive,
                ]}
              >
                \u00d6ffentlich
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.visibilityOption,
                visibility === "invite_only" && styles.visibilityOptionActive,
              ]}
              onPress={() => setVisibility("invite_only")}
            >
              <SymbolView
                name="lock"
                size={20}
                tintColor={visibility === "invite_only" ? colors.white : colors.black}
              />
              <Text
                style={[
                  styles.visibilityText,
                  visibility === "invite_only" && styles.visibilityTextActive,
                ]}
              >
                Nur auf Einladung
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.white },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.gray200,
    backgroundColor: colors.white,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: colors.gray100, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.black },
  saveBtn: {
    backgroundColor: colors.black, paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: radius.full, minWidth: 90, alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: colors.white, fontSize: 15, fontWeight: "600" },
  successBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: colors.success, paddingVertical: 10, gap: spacing.sm,
  },
  successText: { color: colors.white, fontSize: 14, fontWeight: "600" },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.xl },
  thumbnailSection: { alignItems: "center", marginBottom: spacing.xxl },
  thumbnailContainer: {
    width: 100, height: 100, borderRadius: 50, overflow: "hidden",
    backgroundColor: colors.gray100, borderWidth: 2, borderColor: colors.gray200,
  },
  thumbnail: { width: "100%", height: "100%" },
  thumbnailPlaceholder: {
    width: "100%", height: "100%", alignItems: "center", justifyContent: "center",
    backgroundColor: colors.gray100,
  },
  thumbnailHint: { marginTop: spacing.sm, fontSize: 12, color: colors.gray400 },
  fieldGroup: { marginBottom: spacing.xl },
  fieldLabel: {
    fontSize: 13, fontWeight: "600", color: colors.gray500,
    marginBottom: spacing.sm, textTransform: "uppercase", letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: colors.gray50, borderRadius: radius.md, paddingHorizontal: spacing.lg,
    paddingVertical: 14, fontSize: 16, color: colors.black,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.gray200,
  },
  textArea: { minHeight: 100, paddingTop: 14 },
  charCount: { fontSize: 12, color: colors.gray400, textAlign: "right", marginTop: spacing.xs },
  selectBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.gray50, borderRadius: radius.md, paddingHorizontal: spacing.lg,
    paddingVertical: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.gray200,
  },
  selectBtnText: { fontSize: 16, color: colors.black },
  chipGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: 10,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: spacing.sm, borderRadius: radius.full,
    backgroundColor: colors.gray50, borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
  },
  chipActive: { backgroundColor: colors.black, borderColor: colors.black },
  chipText: { fontSize: 14, color: colors.black },
  chipTextActive: { color: colors.white },
  visibilityRow: { flexDirection: "row", gap: spacing.md },
  visibilityOption: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, paddingVertical: 14, borderRadius: radius.md,
    backgroundColor: colors.gray50, borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
  },
  visibilityOptionActive: { backgroundColor: colors.black, borderColor: colors.black },
  visibilityText: { fontSize: 15, fontWeight: "500", color: colors.black },
  visibilityTextActive: { color: colors.white },
});
