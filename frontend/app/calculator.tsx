import React, { useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Calculator, Sparkle } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { AppHeader, Card, TextField, ScreenContainer, formatIDR } from "@/src/components/ui";

type Mode = "markup" | "margin" | "net";
const MODES: { key: Mode; label: string; hint: string }[] = [
  { key: "markup", label: "Laba Kotor %", hint: "Markup dari modal" },
  { key: "margin", label: "Margin %", hint: "Margin dari harga jual" },
  { key: "net", label: "Laba Bersih Rp", hint: "Target laba bersih nominal" },
];

const num = (s: string) => parseFloat(s.replace(/[^\d.]/g, "")) || 0;

export default function GoldCalculator() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [perGram, setPerGram] = useState("");
  const [weight, setWeight] = useState("");
  const [ongkos, setOngkos] = useState("");
  const [mode, setMode] = useState<Mode>("markup");
  const [target, setTarget] = useState("");

  const r = useMemo(() => {
    const goldCost = num(perGram) * num(weight);
    const modal = goldCost + num(ongkos);
    const t = num(target);
    let sell = modal;
    if (mode === "markup") sell = modal * (1 + t / 100);
    else if (mode === "margin") sell = t < 100 ? modal / (1 - t / 100) : modal;
    else sell = modal + t;
    const labaKotor = sell - goldCost;
    const labaBersih = sell - modal;
    const margin = sell > 0 ? (labaBersih / sell) * 100 : 0;
    return { goldCost, modal, sell, labaKotor, labaBersih, margin };
  }, [perGram, weight, ongkos, mode, target]);

  return (
    <ScreenContainer>
      <AppHeader title="Kalkulator Harga Emas" subtitle="Tentukan harga jual perhiasan" back />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 12 }} bottomOffset={24}>
        <Card style={{ gap: 12 }}>
          <View style={styles.iconRow}>
            <View style={styles.iconBox}><Calculator size={22} color={colors.brandPrimary} weight="fill" /></View>
            <Text style={styles.section}>Data Modal</Text>
          </View>
          <TextField label="Harga Emas / gram (Rp)" value={perGram} onChangeText={(t) => setPerGram(t.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="1.000.000" testID="calc-pergram" />
          <TextField label="Berat (gram)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="5" testID="calc-weight" />
          <TextField label="Ongkos / Biaya Pembuatan (Rp)" value={ongkos} onChangeText={(t) => setOngkos(t.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="0" testID="calc-ongkos" />
        </Card>

        <Card style={{ gap: 12 }}>
          <Text style={styles.section}>Metode Penentuan Harga</Text>
          <View style={styles.modeRow}>
            {MODES.map((m) => {
              const active = mode === m.key;
              return (
                <Pressable key={m.key} style={[styles.modeBtn, active && styles.modeActive]} onPress={() => setMode(m.key)} testID={`calc-mode-${m.key}`}>
                  <Text style={[styles.modeTxt, active && { color: colors.onBrandPrimary }]}>{m.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.modeHint}>{MODES.find((m) => m.key === mode)?.hint}</Text>
          <TextField
            label={mode === "net" ? "Target Laba Bersih (Rp)" : "Target Persentase (%)"}
            value={target}
            onChangeText={(t) => setTarget(mode === "net" ? t.replace(/\D/g, "") : t.replace(/[^\d.]/g, ""))}
            keyboardType="decimal-pad"
            placeholder={mode === "net" ? "500.000" : "20"}
            testID="calc-target"
          />
        </Card>

        <View style={styles.resultCard}>
          <View style={styles.resultHead}>
            <Sparkle size={20} color={colors.brand} weight="fill" />
            <Text style={styles.resultLabel}>Harga Jual Rekomendasi</Text>
          </View>
          <Text style={styles.resultVal}>{formatIDR(r.sell)}</Text>
          <View style={styles.breakdown}>
            <Row label="Harga Emas" value={formatIDR(r.goldCost)} styles={styles} />
            <Row label="Modal (Emas + Ongkos)" value={formatIDR(r.modal)} styles={styles} />
            <View style={styles.rdivider} />
            <Row label="Laba Kotor" value={formatIDR(r.labaKotor)} accent styles={styles} />
            <Row label="Laba Bersih" value={formatIDR(r.labaBersih)} accent styles={styles} />
            <Row label="Margin" value={`${r.margin.toFixed(1)}%`} accent styles={styles} />
          </View>
        </View>
      </KeyboardAwareScrollView>
    </ScreenContainer>
  );
}

function Row({ label, value, accent, styles }: any) {
  return (
    <View style={styles.brow}>
      <Text style={styles.blabel}>{label}</Text>
      <Text style={[styles.bvalue, accent && { color: "#E5C85C" }]}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  iconRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  section: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  modeRow: { flexDirection: "row", gap: 8 },
  modeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: c.surfaceTertiary, alignItems: "center", borderWidth: 1, borderColor: c.border },
  modeActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  modeTxt: { fontSize: 12, fontWeight: "700", color: c.onSurface, textAlign: "center" },
  modeHint: { fontSize: 12, color: c.muted },
  resultCard: { backgroundColor: c.surfaceInverse, borderRadius: 20, padding: 20 },
  resultHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  resultLabel: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "600" },
  resultVal: { color: "#FFFFFF", fontSize: 32, fontWeight: "900", marginTop: 6, letterSpacing: -0.5 },
  breakdown: { marginTop: 16, gap: 10 },
  brow: { flexDirection: "row", justifyContent: "space-between" },
  blabel: { color: "rgba(255,255,255,0.6)", fontSize: 14 },
  bvalue: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  rdivider: { height: 1, backgroundColor: "rgba(255,255,255,0.12)" },
}));
