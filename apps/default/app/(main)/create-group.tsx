import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { SymbolView } from "expo-symbols";

export default function CreateGroupScreen() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [city, setCity] = useState("");
  const [visibility, setVisibility] = useState<"public" | "invite_only">("public");
  const [loading, setLoading] = useState(false);
  const createGroup = useMutation(api.groups.create);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const groupId = await createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        topic: topic.trim() || undefined,
        city: city.trim() || undefined,
        visibility,
      });
      router.replace({ pathname: "/(main)/group-detail", params: { id: groupId } });
    } catch (e) {
      // handle
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <SymbolView name="xmark" size={22} tintColor={colors.black} />
          </TouchableOpacity>
          <Text style={styles.title}>Neue Gruppe</Text>
          <View style={{ width: 22 }} />
        </View>

        <Input label="Gruppenname" placeholder="z.B. Schwerin Startups" value={name} onChangeText={setName} />
        <Input label="Thema" placeholder="z.B. Technologie" value={topic} onChangeText={setTopic} />
        <Input label="Stadt" placeholder="z.B. Schwerin" value={city} onChangeText={setCity} />
        <Input label="Beschreibung" placeholder="Worum geht es?" value={description}
          onChangeText={setDescription} multiline numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: "top" }} />

        <Text style={styles.label}>Sichtbarkeit</Text>
        <View style={styles.visRow}>
          {(["public", "invite_only"] as const).map(v => (
            <TouchableOpacity
              key={v}
              style={[styles.visOption, visibility === v && styles.visOptionSelected]}
              onPress={() => setVisibility(v)}
            >
              <SymbolView name={v === "public" ? "globe" : "lock"} size={18}
                tintColor={visibility === v ? colors.white : colors.gray600} />
              <Text style={[styles.visText, visibility === v && styles.visTextSelected]}>
                {v === "public" ? "Öffentlich" : "Nur auf Einladung"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button title="Gruppe erstellen" onPress={handleCreate} loading={loading} fullWidth size="lg" style={{ marginTop: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  scroll: { paddingHorizontal: spacing.xxl, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.xl },
  title: { fontSize: 18, fontWeight: "600", color: colors.black },
  label: { fontSize: 14, fontWeight: "500", color: colors.gray700, marginBottom: spacing.sm },
  visRow: { flexDirection: "row", gap: spacing.md },
  visOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  visOptionSelected: { backgroundColor: colors.black, borderColor: colors.black },
  visText: { fontSize: 14, color: colors.gray700 },
  visTextSelected: { color: colors.white, fontWeight: "600" },
});
