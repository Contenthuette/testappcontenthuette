import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Avatar } from "@/components/Avatar";
import { SymbolView } from "@/components/Icon";

export default function EditProfileScreen() {
  const me = useQuery(api.users.me);
  const updateProfile = useMutation(api.users.updateProfile);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (me) {
      setName(me.name ?? "");
      setBio(me.bio ?? "");
      setCity(me.city ?? "");
    }
  }, [me?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile({
        name: name.trim() || undefined,
        bio: bio.trim() || undefined,
        city: city.trim() || undefined,
      });
      setSaved(true);
      setTimeout(() => safeBack("edit-profile"), 600);
    } catch (e) {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeBack("edit-profile")} hitSlop={12}>
            <Text style={styles.cancelText}>Abbrechen</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Profil bearbeiten</Text>
          <View style={{ width: 70 }} />
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Avatar uri={me?.avatarUrl} name={me?.name} size={90} />
          <TouchableOpacity style={styles.changePhotoBtn}>
            <Text style={styles.changePhotoText}>Foto ändern</Text>
          </TouchableOpacity>
        </View>

        <Input label="Name" value={name} onChangeText={setName} placeholder="Dein Name" />
        <Input
          label="Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="Erzähle etwas über dich"
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: "top" }}
        />
        <Input label="Stadt" value={city} onChangeText={setCity} placeholder="z.B. Schwerin" />

        <Button
          title={saved ? "✓ Gespeichert" : "Speichern"}
          onPress={handleSave}
          loading={loading}
          fullWidth
          size="lg"
          style={{ marginTop: spacing.xl }}
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
  cancelText: { fontSize: 16, color: colors.gray500 },
  title: { fontSize: 17, fontWeight: "600", color: colors.black },

  avatarSection: {
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xxl,
    marginTop: spacing.md,
  },
  changePhotoBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
  },
  changePhotoText: { fontSize: 14, fontWeight: "600", color: colors.black },
});
