import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { SymbolView } from "@/components/Icon";
import { COUNTIES } from "@/lib/constants";

export default function CreateGroupScreen() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [visibility, setVisibility] = useState<"public" | "invite_only">("public");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const createGroup = useMutation(api.groups.create);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Bitte gib einen Gruppennamen ein.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const groupId = await createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        topic: topic.trim() || undefined,
        city: city.trim() || undefined,
        county: county || undefined,
        visibility,
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
            <SymbolView name="xmark" size={20} tintColor={colors.gray500} />
          </TouchableOpacity>
          <Text style={styles.title}>Neue Gruppe</Text>
          <View style={{ width: 20 }} />
        </View>

        {/* Thumbnail placeholder */}
        <TouchableOpacity style={styles.thumbUpload} activeOpacity={0.7}>
          <SymbolView name="camera.fill" size={24} tintColor={colors.gray400} />
          <Text style={styles.thumbText}>Gruppenbild hinzufügen</Text>
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
  safe: { flex: 1, backgroundColor: colors.white },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.lg,
  },
  title: { fontSize: 17, fontWeight: "600", color: colors.black },

  thumbUpload: {
    height: 140,
    borderRadius: radius.md,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.xl,
    borderCurve: "continuous",
  },
  thumbText: { fontSize: 14, color: colors.gray400 },

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
