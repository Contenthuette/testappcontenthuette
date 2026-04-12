import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Image } from "expo-image";
import { SymbolView } from "@/components/Icon";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { pickImage, uploadToConvex } from "@/lib/media-picker";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CITIES, COUNTIES } from "@/lib/constants";

function parseDateDE(input: string): string | null {
  const m = input.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function formatDateDE(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  return iso;
}

function calcEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const totalMin = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

export default function EditMemberEventScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const event = useQuery(
    api.memberEvents.getById,
    id ? { eventId: id as Id<"memberEvents"> } : "skip",
  );
  const updateEvent = useMutation(api.memberEvents.update);
  const generateUploadUrl = useMutation(api.memberEvents.generateUploadUrl);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");

  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [thumbFile, setThumbFile] = useState<{
    uri: string;
    mimeType: string;
  } | null>(null);
  const [removeThumbnail, setRemoveThumbnail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Populate form from existing event
  useEffect(() => {
    if (event && !initialized) {
      setName(event.name);
      setDescription(event.description ?? "");
      setVenue(event.venue);
      setCity(event.city);
      setCounty(event.county ?? "");
      setDate(formatDateDE(event.date));
      setStartTime(event.startTime);
      setEndTime(calcEndTime(event.startTime, event.durationMinutes));
      setMaxAttendees(event.maxAttendees ? String(event.maxAttendees) : "");
      if (event.thumbnailUrl) {
        setThumbPreview(event.thumbnailUrl);
      }
      setInitialized(true);
    }
  }, [event, initialized]);

  const handlePickThumb = async () => {
    const result = await pickImage({
      mediaType: "images",
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (result) {
      setThumbPreview(result.uri);
      setThumbFile({ uri: result.uri, mimeType: result.mimeType });
      setRemoveThumbnail(false);
    }
  };

  const handleRemoveThumb = () => {
    setThumbPreview(null);
    setThumbFile(null);
    setRemoveThumbnail(true);
  };

  const handleSave = async () => {
    if (!id || !event) return;

    if (!name.trim()) {
      Alert.alert("Fehler", "Bitte gib einen Namen ein.");
      return;
    }
    if (!venue.trim()) {
      Alert.alert("Fehler", "Bitte gib einen Ort/Venue ein.");
      return;
    }
    if (!city.trim()) {
      Alert.alert("Fehler", "Bitte wähle eine Stadt.");
      return;
    }
    if (!date.trim() || !parseDateDE(date.trim())) {
      Alert.alert(
        "Fehler",
        "Bitte gib ein Datum im Format TT.MM.JJJJ ein (z.B. 24.04.2026).",
      );
      return;
    }
    if (!startTime.trim() || !/^\d{2}:\d{2}$/.test(startTime)) {
      Alert.alert("Fehler", "Bitte gib eine Startzeit im Format HH:MM ein.");
      return;
    }
    if (!endTime.trim() || !/^\d{2}:\d{2}$/.test(endTime)) {
      Alert.alert("Fehler", "Bitte gib eine Endzeit im Format HH:MM ein.");
      return;
    }

    setSaving(true);
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let thumbnailStorageId: string | undefined;
      if (thumbFile) {
        const uploadUrl = await generateUploadUrl();
        thumbnailStorageId = await uploadToConvex(
          uploadUrl,
          thumbFile.uri,
          thumbFile.mimeType,
        );
      }

      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      let diff = eh * 60 + em - (sh * 60 + sm);
      if (diff <= 0) diff += 24 * 60;

      await updateEvent({
        eventId: id as Id<"memberEvents">,
        name: name.trim(),
        description: description.trim() || undefined,
        clearDescription: !description.trim() ? true : undefined,
        venue: venue.trim(),
        city: city.trim(),
        county: county || undefined,
        date: parseDateDE(date.trim()) as string,
        startTime: startTime.trim(),
        durationMinutes: diff,
        maxAttendees: maxAttendees ? parseInt(maxAttendees, 10) : undefined,
        clearMaxAttendees: !maxAttendees ? true : undefined,
        thumbnailStorageId: thumbnailStorageId as never,
        removeThumbnail: removeThumbnail ? true : undefined,
      });

      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Fehler beim Speichern";
      Alert.alert("Fehler", msg);
    } finally {
      setSaving(false);
    }
  };

  const canSave =
    name.trim() &&
    venue.trim() &&
    city.trim() &&
    date.trim() &&
    startTime.trim() &&
    endTime.trim();

  if (!event && id) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.gray300} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => safeBack("edit-member-event")}
          style={styles.backBtn}
        >
          <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event bearbeiten</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Thumbnail */}
        <View style={styles.thumbContainer}>
          <TouchableOpacity
            style={styles.thumbPicker}
            onPress={handlePickThumb}
            activeOpacity={0.7}
          >
            {thumbPreview ? (
              <Image
                source={{ uri: thumbPreview }}
                style={styles.thumbImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.thumbPlaceholder}>
                <SymbolView name="photo" size={28} tintColor={colors.gray300} />
                <Text style={styles.thumbPlaceholderText}>
                  Titelbild ändern
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {thumbPreview && (
            <TouchableOpacity
              style={styles.removeThumbBtn}
              onPress={handleRemoveThumb}
            >
              <SymbolView name="xmark.circle.fill" size={22} tintColor={colors.gray500} />
            </TouchableOpacity>
          )}
        </View>

        {/* Name */}
        <Text style={styles.label}>Event-Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="z.B. Hausparty bei Max"
          placeholderTextColor={colors.gray300}
          value={name}
          onChangeText={setName}
          maxLength={80}
        />

        {/* Description */}
        <Text style={styles.label}>Beschreibung</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Was erwartet die Teilnehmer?"
          placeholderTextColor={colors.gray300}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={500}
        />

        {/* Venue */}
        <Text style={styles.label}>Ort / Venue *</Text>
        <TextInput
          style={styles.input}
          placeholder="z.B. Mein Garten, Schweriner See"
          placeholderTextColor={colors.gray300}
          value={venue}
          onChangeText={setVenue}
          maxLength={120}
        />

        {/* City */}
        <Text style={styles.label}>Stadt *</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
        >
          {CITIES.slice(0, 15).map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, city === c && styles.chipActive]}
              onPress={() => setCity(c)}
            >
              <Text
                style={[styles.chipText, city === c && styles.chipTextActive]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {!CITIES.slice(0, 15).includes(city as (typeof CITIES)[number]) &&
        city ? (
          <Text style={styles.selectedText}>Gewählt: {city}</Text>
        ) : null}
        <TextInput
          style={[styles.input, { marginTop: spacing.sm }]}
          placeholder="Oder Stadt eingeben"
          placeholderTextColor={colors.gray300}
          value={
            CITIES.includes(city as (typeof CITIES)[number]) ? "" : city
          }
          onChangeText={setCity}
        />

        {/* County */}
        <Text style={styles.label}>Landkreis</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
        >
          {COUNTIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, county === c && styles.chipActive]}
              onPress={() => setCounty(county === c ? "" : c)}
            >
              <Text
                style={[styles.chipText, county === c && styles.chipTextActive]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Date & Time */}
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Datum * (TT.MM.JJJJ)</Text>
            <TextInput
              style={styles.input}
              placeholder="24.04.2026"
              placeholderTextColor={colors.gray300}
              value={date}
              onChangeText={setDate}
              maxLength={10}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Startzeit *</Text>
            <TextInput
              style={styles.input}
              placeholder="19:00"
              placeholderTextColor={colors.gray300}
              value={startTime}
              onChangeText={setStartTime}
              maxLength={5}
            />
          </View>
        </View>

        {/* End time & Max */}
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Endzeit *</Text>
            <TextInput
              style={styles.input}
              placeholder="23:00"
              placeholderTextColor={colors.gray300}
              value={endTime}
              onChangeText={setEndTime}
              maxLength={5}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Max. Teilnehmer</Text>
            <TextInput
              style={styles.input}
              placeholder="Unbegrenzt"
              placeholderTextColor={colors.gray300}
              value={maxAttendees}
              onChangeText={setMaxAttendees}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>Änderungen speichern</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  loadingWrap: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.black,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  thumbContainer: {
    position: "relative",
    marginBottom: spacing.xl,
  },
  thumbPicker: {
    height: 180,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    borderCurve: "continuous",
  },
  thumbImage: { width: "100%", height: "100%" },
  thumbPlaceholder: {
    flex: 1,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  thumbPlaceholderText: {
    fontSize: 14,
    color: colors.gray400,
    fontWeight: "500",
  },
  removeThumbBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray500,
    marginBottom: 6,
    marginTop: spacing.md,
    letterSpacing: -0.1,
  },
  input: {
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.black,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  chipScroll: {
    marginTop: 4,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
    marginRight: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
  },
  chipActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.gray500,
  },
  chipTextActive: {
    color: colors.white,
  },
  selectedText: {
    fontSize: 13,
    color: colors.gray400,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  saveBtn: {
    backgroundColor: colors.black,
    borderRadius: radius.full,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: -0.2,
  },
});
