import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";
import { Image } from "expo-image";
import { pickImage, uploadToConvex } from "@/lib/media-picker";
import type { Id } from "@/convex/_generated/dataModel";

export default function AdminPartnerForm() {
  const params = useLocalSearchParams<{ partnerId?: string }>();
  const isEdit = !!params.partnerId;
  const partnerId = params.partnerId as Id<"partners"> | undefined;

  const partnerDetail = useQuery(
    api.admin.getPartnerDetail,
    partnerId ? { partnerId } : "skip",
  );

  const createPartner = useMutation(api.admin.createPartner);
  const updatePartner = useMutation(api.admin.updatePartner);
  const genUrl = useMutation(api.admin.generateUploadUrl);

  const [businessName, setBusinessName] = useState("");
  const [shortText, setShortText] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [thumbUri, setThumbUri] = useState<string | null>(null);
  const [thumbStorageId, setThumbStorageId] = useState<Id<"_storage"> | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (isEdit && partnerDetail && !seeded) {
      setBusinessName(partnerDetail.businessName);
      setShortText(partnerDetail.shortText);
      setDescription(partnerDetail.description ?? "");
      setWebsite(partnerDetail.website ?? "");
      setPhone(partnerDetail.phone ?? "");
      setAddress(partnerDetail.address ?? "");
      setCity(partnerDetail.city ?? "");
      setIsActive(partnerDetail.isActive);
      if (partnerDetail.thumbnailUrl) setThumbUri(partnerDetail.thumbnailUrl);
      setSeeded(true);
    }
  }, [isEdit, partnerDetail, seeded]);

  const handlePickThumb = async () => {
    const result = await pickImage({ mediaType: "images", quality: 0.8 });
    if (!result) return;
    setThumbUri(result.uri);
    try {
      const url = await genUrl();
      const id = await uploadToConvex(url, result.uri, result.mimeType);
      setThumbStorageId(id as Id<"_storage">);
    } catch {
      /* keep local preview */
    }
  };

  const handleSave = async () => {
    if (!businessName.trim() || !shortText.trim()) return;
    setSaving(true);
    try {
      if (isEdit && partnerId) {
        await updatePartner({
          partnerId,
          businessName: businessName.trim(),
          shortText: shortText.trim(),
          description: description.trim() || undefined,
          website: website.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          isActive,
          ...(thumbStorageId ? { thumbnailStorageId: thumbStorageId } : {}),
        });
      } else {
        await createPartner({
          businessName: businessName.trim(),
          shortText: shortText.trim(),
          description: description.trim() || undefined,
          website: website.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          ...(thumbStorageId ? { thumbnailStorageId: thumbStorageId } : {}),
        });
      }
      router.back();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && !partnerDetail) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.black} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <SymbolView name="xmark" size={16} tintColor={colors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEdit ? "Partner bearbeiten" : "Neuer Partner"}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !businessName.trim() || !shortText.trim()}
            style={[styles.saveBtn, (!businessName.trim() || !shortText.trim() || saving) && styles.saveBtnDisabled]}
            activeOpacity={0.7}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>Speichern</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Thumbnail */}
          <TouchableOpacity onPress={handlePickThumb} style={styles.thumbPicker} activeOpacity={0.7}>
            {thumbUri ? (
              <Image source={{ uri: thumbUri }} style={styles.thumbImage} contentFit="cover" />
            ) : (
              <View style={styles.thumbPlaceholder}>
                <SymbolView name="photo" size={28} tintColor={colors.gray300} />
                <Text style={styles.thumbText}>Thumbnail wählen</Text>
              </View>
            )}
          </TouchableOpacity>

          <Field label="Firmenname *" value={businessName} onChangeText={setBusinessName} placeholder="z.B. Rostocker Brauerei" />
          <Field label="Kurztext *" value={shortText} onChangeText={setShortText} placeholder="Kurze Beschreibung (1-2 Sätze)" />
          <Field label="Beschreibung" value={description} onChangeText={setDescription} placeholder="Ausführliche Beschreibung" multiline />
          <Field label="Website" value={website} onChangeText={setWebsite} placeholder="https://www.beispiel.de" />
          <Field label="Telefon" value={phone} onChangeText={setPhone} placeholder="+49 381 ..." keyboardType="default" />
          <Field label="Adresse" value={address} onChangeText={setAddress} placeholder="Musterstraße 1, 18055 Rostock" />
          <Field label="Stadt" value={city} onChangeText={setCity} placeholder="z.B. Rostock" />

          {isEdit && (
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Aktiv (sichtbar in App)</Text>
              <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: colors.black }} />
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad" | "decimal-pad";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.gray300}
        multiline={multiline}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.gray50 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.black },
  saveBtn: {
    backgroundColor: colors.black,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderCurve: "continuous",
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 14, fontWeight: "600", color: colors.white },

  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },

  thumbPicker: {
    height: 180,
    borderRadius: radius.md,
    overflow: "hidden",
    marginBottom: spacing.xl,
    borderCurve: "continuous",
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
  },
  thumbImage: { width: "100%", height: "100%" },
  thumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  thumbText: { fontSize: 13, color: colors.gray400 },

  field: { marginBottom: spacing.lg },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray600,
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.black,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    marginBottom: spacing.lg,
  },
  switchLabel: { fontSize: 15, fontWeight: "500", color: colors.black },
});
