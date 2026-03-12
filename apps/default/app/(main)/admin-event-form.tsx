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

export default function AdminEventForm() {
  const params = useLocalSearchParams<{ eventId?: string }>();
  const isEdit = !!params.eventId;
  const eventId = params.eventId as Id<"events"> | undefined;

  const eventDetail = useQuery(
    api.admin.getEventDetail,
    eventId ? { eventId } : "skip",
  );

  const createEvent = useMutation(api.admin.createEvent);
  const updateEvent = useMutation(api.admin.updateEvent);
  const genUrl = useMutation(api.admin.generateUploadUrl);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [totalTickets, setTotalTickets] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [thumbUri, setThumbUri] = useState<string | null>(null);
  const [thumbStorageId, setThumbStorageId] = useState<Id<"_storage"> | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeded, setSeeded] = useState(false);

  /* Pre-fill when editing */
  useEffect(() => {
    if (isEdit && eventDetail && !seeded) {
      setName(eventDetail.name);
      setDescription(eventDetail.description ?? "");
      setVenue(eventDetail.venue);
      setCity(eventDetail.city);
      setDate(eventDetail.date);
      setStartTime(eventDetail.startTime);
      // Calculate end time from startTime + durationMinutes
      const [h, m] = eventDetail.startTime.split(":").map(Number);
      const totalMin = h * 60 + m + eventDetail.durationMinutes;
      const endH = Math.floor(totalMin / 60) % 24;
      const endM = totalMin % 60;
      setEndTime(`${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`);
      setTotalTickets(String(eventDetail.totalTickets));
      setTicketPrice(String(eventDetail.ticketPrice));
      if (eventDetail.thumbnailUrl) setThumbUri(eventDetail.thumbnailUrl);
      setSeeded(true);
    }
  }, [isEdit, eventDetail, seeded]);

  /* Pick thumbnail */
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

  /* Submit */
  const handleSave = async () => {
    if (!name.trim() || !venue.trim() || !city.trim() || !date.trim() || !startTime.trim()) return;
    // Calculate durationMinutes from startTime and endTime
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) diff += 24 * 60; // crosses midnight
    const durationMinutes = diff || 120;
    setSaving(true);
    try {
      if (isEdit && eventId) {
        await updateEvent({
          eventId,
          name: name.trim(),
          description: description.trim() || undefined,
          venue: venue.trim(),
          city: city.trim(),
          date: date.trim(),
          startTime: startTime.trim(),
          durationMinutes,
          totalTickets: parseInt(totalTickets, 10) || 0,
          ticketPrice: parseFloat(ticketPrice) || 0,
          ...(thumbStorageId ? { thumbnailStorageId: thumbStorageId } : {}),
        });
      } else {
        await createEvent({
          name: name.trim(),
          description: description.trim() || undefined,
          venue: venue.trim(),
          city: city.trim(),
          date: date.trim(),
          startTime: startTime.trim(),
          durationMinutes,
          totalTickets: parseInt(totalTickets, 10) || 0,
          ticketPrice: parseFloat(ticketPrice) || 0,
          currency: "EUR",
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

  if (isEdit && !eventDetail) {
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <SymbolView name="xmark" size={16} tintColor={colors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEdit ? "Event bearbeiten" : "Neues Event"}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !name.trim()}
            style={[styles.saveBtn, (!name.trim() || saving) && styles.saveBtnDisabled]}
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

          <Field label="Eventname *" value={name} onChangeText={setName} placeholder="z.B. Z Summer Party" />
          <Field label="Beschreibung" value={description} onChangeText={setDescription} placeholder="Was erwartet die Gäste?" multiline />
          <Field label="Veranstaltungsort *" value={venue} onChangeText={setVenue} placeholder="z.B. Kulturhaus Rostock" />
          <Field label="Stadt *" value={city} onChangeText={setCity} placeholder="z.B. Rostock" />
          <Field label="Datum *" value={date} onChangeText={setDate} placeholder="TT.MM.JJJJ" />
          <Field label="Startzeit *" value={startTime} onChangeText={setStartTime} placeholder="HH:MM" />
          <Field label="Endzeit" value={endTime} onChangeText={setEndTime} placeholder="HH:MM" />
          <Field label="Ticketanzahl" value={totalTickets} onChangeText={setTotalTickets} placeholder="100" keyboardType="number-pad" />
          <Field label="Ticketpreis (EUR)" value={ticketPrice} onChangeText={setTicketPrice} placeholder="15.00" keyboardType="decimal-pad" />

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─── field ───────────────────────────────────────────────────── */
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
});
