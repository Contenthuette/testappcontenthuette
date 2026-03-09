import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { SymbolView } from "@/components/Icon";

export default function AnnouncementsScreen() {
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const createAnnouncement = useMutation(api.admin.createAnnouncement);

  const handleCreate = async () => {
    if (!caption.trim()) return;
    setLoading(true);
    try {
      await createAnnouncement({ caption: caption.trim() });
      setCaption("");
    } catch (e) {
      // handle
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack("announcements")} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Z Announcement</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.desc}>
          Erstelle eine offizielle Ank\u00fcndigung, die oben im Feed aller Nutzer angezeigt wird.
        </Text>

        <Input label="Nachricht" placeholder="Offizielle Ank\u00fcndigung..." value={caption}
          onChangeText={setCaption} multiline numberOfLines={4}
          style={{ minHeight: 100, textAlignVertical: "top" }} />

        <Button title="Ver\u00f6ffentlichen" onPress={handleCreate} loading={loading} fullWidth disabled={!caption.trim()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  backBtn: { padding: spacing.xs },
  title: { fontSize: 22, fontWeight: "700", color: colors.black },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  desc: { fontSize: 15, color: colors.gray500, lineHeight: 22, marginBottom: spacing.xxl, marginTop: spacing.md },
});
