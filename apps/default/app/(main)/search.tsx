import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { SymbolView } from "@/components/Icon";
import { COUNTIES, CITIES, INTERESTS } from "@/lib/constants";

export default function SearchScreen() {
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState("");
  const [ageFrom, setAgeFrom] = useState("");
  const [ageTo, setAgeTo] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState("");

  const toggleInterest = (i: string) => {
    setSelectedInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const handleAddCustomInterest = () => {
    const trimmed = customInterest.trim();
    if (trimmed && !selectedInterests.includes(trimmed) && !(INTERESTS as readonly string[]).includes(trimmed)) {
      setSelectedInterests(prev => [...prev, trimmed]);
      setCustomInterest("");
    }
  };

  const genderOptions = ["M\u00e4nnlich", "Weiblich", "Divers", "Alle"];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack("search")} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
        </TouchableOpacity>
        <SymbolView name="slider.horizontal.3" size={20} tintColor={colors.black} />
        <Text style={styles.title}>Filter</Text>
        <TouchableOpacity onPress={() => { setCounty(""); setCity(""); setGender(""); setAgeFrom(""); setAgeTo(""); setSelectedInterests([]); setCustomInterest(""); }}>
          <Text style={styles.resetText}>Zurücksetzen</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Landkreis</Text>
        <View style={styles.chips}>
          {COUNTIES.map(c => (
            <TouchableOpacity key={c} style={[styles.chip, county === c && styles.chipActive]} onPress={() => setCounty(county === c ? "" : c)}>
              <Text style={[styles.chipText, county === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Stadt</Text>
        <View style={styles.chips}>
          {CITIES.map(c => (
            <TouchableOpacity key={c} style={[styles.chip, city === c && styles.chipActive]} onPress={() => setCity(city === c ? "" : c)}>
              <Text style={[styles.chipText, city === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Geschlecht</Text>
        <View style={styles.chips}>
          {genderOptions.map(g => (
            <TouchableOpacity key={g} style={[styles.chip, gender === g && styles.chipActive]} onPress={() => setGender(gender === g ? "" : g)}>
              <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Alter</Text>
        <View style={styles.ageRow}>
          <TextInput style={styles.ageInput} placeholder="Von" placeholderTextColor={colors.gray400} value={ageFrom} onChangeText={setAgeFrom} keyboardType="numeric" />
          <TextInput style={styles.ageInput} placeholder="Bis" placeholderTextColor={colors.gray400} value={ageTo} onChangeText={setAgeTo} keyboardType="numeric" />
        </View>

        <Text style={styles.sectionTitle}>Interessen</Text>
        <View style={styles.chips}>
          {INTERESTS.map(i => (
            <TouchableOpacity key={i} style={[styles.chip, selectedInterests.includes(i) && styles.chipActive]} onPress={() => toggleInterest(i)}>
              <Text style={[styles.chipText, selectedInterests.includes(i) && styles.chipTextActive]}>{i}</Text>
            </TouchableOpacity>
          ))}
          {selectedInterests
            .filter(i => !(INTERESTS as readonly string[]).includes(i))
            .map(i => (
              <TouchableOpacity key={i} style={[styles.chip, styles.chipActive, styles.customChip]} onPress={() => toggleInterest(i)}>
                <Text style={[styles.chipText, styles.chipTextActive]}>{i}</Text>
                <SymbolView name="xmark" size={10} tintColor={colors.white} />
              </TouchableOpacity>
            ))}
        </View>
        <View style={styles.customInterestRow}>
          <TextInput
            style={styles.customInterestInput}
            value={customInterest}
            onChangeText={setCustomInterest}
            placeholder="Eigenes Interesse eingeben..."
            placeholderTextColor={colors.gray400}
            returnKeyType="done"
            onSubmitEditing={handleAddCustomInterest}
          />
          <TouchableOpacity
            style={[styles.customInterestBtn, !customInterest.trim() && styles.customInterestBtnDisabled]}
            onPress={handleAddCustomInterest}
            disabled={!customInterest.trim()}
            activeOpacity={0.7}
          >
            <SymbolView name="plus" size={16} tintColor={!customInterest.trim() ? colors.gray400 : colors.white} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.applyBtn} onPress={() => safeBack("search")}>
          <Text style={styles.applyText}>Filter anwenden</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.md },
  backBtn: { padding: spacing.xs },
  title: { flex: 1, fontSize: 22, fontWeight: "700", color: colors.black },
  resetText: { fontSize: 14, fontWeight: "500", color: colors.gray500 },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: colors.black, marginTop: spacing.xl, marginBottom: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.gray300, backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.black, borderColor: colors.black },
  chipText: { fontSize: 13, color: colors.gray700 },
  chipTextActive: { color: colors.white, fontWeight: "600" },
  customChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  customInterestRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  customInterestInput: { flex: 1, height: 42, backgroundColor: colors.gray100, borderRadius: 21, paddingHorizontal: spacing.md, fontSize: 14, color: colors.black },
  customInterestBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.black, alignItems: "center", justifyContent: "center" },
  customInterestBtnDisabled: { backgroundColor: colors.gray200 },
  ageRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  ageInput: { flex: 1, height: 44, borderRadius: radius.md, backgroundColor: colors.gray100, paddingHorizontal: spacing.md, fontSize: 16, color: colors.black },
  applyBtn: { marginTop: spacing.xxl, padding: spacing.lg, backgroundColor: colors.black, borderRadius: radius.lg, alignItems: "center" },
  applyText: { fontSize: 16, fontWeight: "600", color: colors.white },
});
