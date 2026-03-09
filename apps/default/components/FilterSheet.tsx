import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { theme } from "@/lib/theme";
import { COUNTIES, INTERESTS_CATALOG } from "@/lib/constants";
import { Button } from "@/components/Button";

interface FilterState {
  county?: string;
  city?: string;
  gender?: string;
  ageFrom?: number;
  ageTo?: number;
  interests?: string[];
}

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initial?: FilterState;
}

export function FilterSheet({ visible, onClose, onApply, initial }: FilterSheetProps) {
  const [county, setCounty] = useState(initial?.county ?? "");
  const [gender, setGender] = useState(initial?.gender ?? "");
  const [interests, setInterests] = useState<string[]>(initial?.interests ?? []);

  const toggleInterest = (i: string) => {
    setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={s.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={s.title}>Filter</Text>
          <TouchableOpacity onPress={() => { setCounty(""); setGender(""); setInterests([]); }}>
            <Text style={s.reset}>Reset</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
          <Text style={s.sectionTitle}>County</Text>
          <View style={s.chipRow}>
            {COUNTIES.map(c => (
              <TouchableOpacity key={c} style={[s.chip, county === c && s.chipActive]} onPress={() => setCounty(county === c ? "" : c)}>
                <Text style={[s.chipText, county === c && s.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.sectionTitle}>Gender</Text>
          <View style={s.chipRow}>
            {["male", "female", "other"].map(g => (
              <TouchableOpacity key={g} style={[s.chip, gender === g && s.chipActive]} onPress={() => setGender(gender === g ? "" : g)}>
                <Text style={[s.chipText, gender === g && s.chipTextActive]}>{g[0].toUpperCase() + g.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.sectionTitle}>Interests</Text>
          <View style={s.chipRow}>
            {INTERESTS_CATALOG.slice(0, 60).map(i => (
              <TouchableOpacity key={i} style={[s.chip, interests.includes(i) && s.chipActive]} onPress={() => toggleInterest(i)}>
                <Text style={[s.chipText, interests.includes(i) && s.chipTextActive]}>{i}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <View style={s.footer}>
          <Button title="Apply Filters" onPress={() => { onApply({ county: county || undefined, gender: gender || undefined, interests: interests.length > 0 ? interests : undefined }); onClose(); }} />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
  title: { fontSize: 17, fontWeight: "600", color: theme.text },
  cancel: { fontSize: 16, color: theme.textSecondary },
  reset: { fontSize: 16, color: theme.textSecondary },
  body: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: theme.text, marginBottom: 10, marginTop: 16 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  chipActive: { backgroundColor: theme.text, borderColor: theme.text },
  chipText: { fontSize: 14, color: theme.text },
  chipTextActive: { color: theme.bg },
  footer: { padding: 16, paddingBottom: 34 },
});
