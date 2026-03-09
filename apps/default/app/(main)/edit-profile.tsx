import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing } from "@/lib/theme";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Avatar } from "@/components/Avatar";
import { SymbolView } from "expo-symbols";

export default function EditProfileScreen() {
  const me = useQuery(api.users.me);
  const updateProfile = useMutation(api.users.updateProfile);
  const [name, setName] = useState(me?.name ?? "");
  const [bio, setBio] = useState(me?.bio ?? "");
  const [city, setCity] = useState(me?.city ?? "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile({
        name: name.trim() || undefined,
        bio: bio.trim() || undefined,
        city: city.trim() || undefined,
      });
      router.back();
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
          <Text style={styles.title}>Profil bearbeiten</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.avatarSection}>
          <Avatar uri={me?.avatarUrl} name={me?.name} size={80} />
          <TouchableOpacity>
            <Text style={styles.changePhoto}>Foto ändern</Text>
          </TouchableOpacity>
        </View>

        <Input label="Name" value={name} onChangeText={setName} />
        <Input label="Bio" value={bio} onChangeText={setBio} multiline
          style={{ minHeight: 80, textAlignVertical: "top" }} />
        <Input label="Stadt" value={city} onChangeText={setCity} />

        <Button title="Speichern" onPress={handleSave} loading={loading} fullWidth style={{ marginTop: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  scroll: { paddingHorizontal: spacing.xxl, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.xl },
  title: { fontSize: 18, fontWeight: "600", color: colors.black },
  avatarSection: { alignItems: "center", gap: spacing.md, marginBottom: spacing.xxl },
  changePhoto: { fontSize: 15, fontWeight: "600", color: colors.black },
});
