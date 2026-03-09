import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Image } from "expo-image";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius, shadows } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Icon } from "@/components/Icon";
import { COUNTIES } from "@/lib/constants";
import { pickImage, type MediaResult } from "@/lib/media-picker";

export default function CreateGroupScreen() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [visibility, setVisibility] = useState<"public" | "invite_only">("public");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Thumbnail
  const [thumbLocal, setThumbLocal] = useState<MediaResult | null>(null);

  const createGroup = useMutation(api.groups.create);
  const generateUploadUrl = useMutation(api.groups.generateUploadUrl);

  const handlePickThumb = async () => {
    try {
      const result = await pickImage({ aspect: [1, 1] });
      if (result) setThumbLocal(result);
    } catch (e) {
      if (Platform.OS !== "web") {
        Alert.alert("Fehler", "Bild konnte nicht ausgewählt werden.");
      }
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Bitte gib einen Gruppennamen ein.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      let thumbnailStorageId: string | undefined;

      // Upload thumbnail if selected
      if (thumbLocal) {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(thumbLocal.uri);
        const blob = await response.blob();
        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": thumbLocal.mimeType || "image/jpeg" },
          body: blob,
        });
        if (!uploadResult.ok) throw new Error("Thumbnail-Upload fehlgeschlagen");
        const json = await uploadResult.json();
        thumbnailStorageId = json.storageId;
      }

      const groupId = await createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        topic: topic.trim() || undefined,
        city: city.trim() || undefined,
        county: county || undefined,
        visibility,
        thumbnailStorageId: thumbnailStorageId as Parameters<typeof createGroup>[0]["thumbnailStorageId"],
      });
      router.replace({ pathname: "/(main)/group-detail", params: { id: groupId } });
    } catch (e) {
      if (Platform.OS !== "web") {
        Alert.alert("Fehler", "Gruppe konnte nicht erstellt werden.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeBack("create-group")} hitSlop={12}>
            <Icon name="xmark" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Neue Gruppe</Text>
          <View style={{ width: 20 }} />
        </View>

        {/* Thumbnail picker */}
        <TouchableOpacity
          style={styles.thumbUpload}
          activeOpacity={0.7}
          onPress={handlePickThumb}
        >
          {thumbLocal ? (
            <View style={styles.thumbPreviewWrap}>
              <Image
                source={{ uri: thumbLocal.uri }}
                style={styles.thumbPreview}
                contentFit="cover"
              />
              <View style={styles.thumbChangeBadge}>
                <Icon name="camera.fill" size={14} color="#fff" />
              </View>
            </View>
          ) : (
            <>
              <Icon name="camera.fill" size={24} color={colors.textTertiary} />
              <Text style={styles.thumbText}>Gruppenbild hinzufügen</Text>
            </>
          )}
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Input label="Gruppenname" placeholder="z.B. Schwerin Startups" value={name} onChangeText={setName} />
        <Input label="Thema" placeholder="z.B. Technologie, Freizeit, Musik" value={topic} onChangeText={setTopic} />
        <Input label="Stadt" placeholder="z.B. Schwerin" value={city} onChangeText={setCity} />

        {/* County selector */}
        <Text style={styles.label}>Landkreis</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {COUNTIES.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, county === c && styles.chipActive]}
              onPress={() => setCounty(county === c ? "" : c)}
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
          onChangeText={setDescription}
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
              onPress={() => setVisibility(v)}
              activeOpacity={0.7}
            >
              <Icon
                name={v === "public" ? "globe" : "lock.fill"}
                size={20}
                color={visibility === v ? "#fff" : colors.textSecondary}
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
          title="Gruppe erstellen"
          onPress={handleCreate}
          loading={loading}
          fullWidth
          size="lg"
          disabled={!name.trim()}
          style={{ marginTop: spacing.xxl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.lg,
  },
  title: { fontSize: 17, fontWeight: "600", color: colors.textPrimary },

  thumbUpload: {
    height: 140,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.xl,
    borderCurve: "continuous",
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    overflow: "hidden",
  },
  thumbText: { fontSize: 14, color: colors.textTertiary },
  thumbPreviewWrap: {
    width: "100%",
    height: "100%",
  },
  thumbPreview: {
    width: "100%",
    height: "100%",
  },
  thumbChangeBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  error: {
    fontSize: 14,
    color: "#ef4444",
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    overflow: "hidden",
  },

  label: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  chipScroll: { marginBottom: spacing.lg },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.textPrimary },
  chipText: { fontSize: 13, color: colors.textSecondary },
  chipTextActive: { color: "#fff", fontWeight: "600" },

  visRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  visCard: {
    flex: 1,
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.surface,
    gap: spacing.xs,
    borderCurve: "continuous",
  },
  visCardActive: { backgroundColor: colors.textPrimary },
  visLabel: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginTop: 4 },
  visLabelActive: { color: "#fff" },
  visDesc: { fontSize: 12, color: colors.textTertiary, textAlign: "center" },
  visDescActive: { color: "rgba(255,255,255,0.6)" },
});
