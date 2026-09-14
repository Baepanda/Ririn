import React, { useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { makeStyles, useTheme } from "@/src/theme";
import { useApi } from "@/src/api/query";
import { apiFetch, ApiError } from "@/src/api/client";
import { queryClient } from "@/src/query-client";
import { useToast } from "@/src/components/toast";
import { AppHeader, Button, Card, TextField, ScreenContainer, LoadingView } from "@/src/components/ui";

const PERIODS = [
  { key: "weekly", label: "Mingguan" },
  { key: "monthly", label: "Bulanan" },
  { key: "yearly", label: "Tahunan" },
];

export default function OpnameNew() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  const { data: items = [], isLoading } = useApi<any[]>(["items", "in_stock"], "/items?status=in_stock");
  const [period, setPeriod] = useState("weekly");
  const [notes, setNotes] = useState("");
  const [counted, setCounted] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const groups = useMemo(() => {
    const map: Record<string, { name: string; item_id: string; system_qty: number }> = {};
    items.forEach((it) => {
      const key = it.name;
      if (!map[key]) map[key] = { name: it.name, item_id: it.id, system_qty: 0 };
      map[key].system_qty += 1;
    });
    return Object.values(map);
  }, [items]);

  const submit = async () => {
    const payload = groups.map((g) => ({
      item_id: g.item_id,
      name: g.name,
      system_qty: g.system_qty,
      counted_qty: counted[g.name] !== undefined ? parseInt(counted[g.name] || "0", 10) : g.system_qty,
    }));
    setSaving(true);
    try {
      await apiFetch("/stock-opname", { method: "POST", body: JSON.stringify({ period_type: period, notes, items: payload }) });
      queryClient.invalidateQueries({ queryKey: ["opname"] });
      toast.show("Laporan opname dibuat, menunggu ACC Owner", "success");
      router.back();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <AppHeader title="Buat Laporan Opname" subtitle="Hitung fisik vs sistem" back />
      {isLoading ? (
        <LoadingView />
      ) : (
        <KeyboardAwareScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 12 }} bottomOffset={24}>
          <Card style={{ gap: 10 }}>
            <Text style={styles.label}>Periode Laporan</Text>
            <View style={styles.periodRow}>
              {PERIODS.map((p) => {
                const active = p.key === period;
                return (
                  <Pressable key={p.key} style={[styles.periodBtn, active && styles.periodActive]} onPress={() => setPeriod(p.key)} testID={`opname-new-${p.key}`}>
                    <Text style={[styles.periodTxt, active && { color: colors.onBrandPrimary }]}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <Text style={styles.section}>Perhitungan Fisik ({groups.length} jenis)</Text>
          {groups.length === 0 ? (
            <Card><Text style={styles.empty}>Tidak ada stok untuk diperiksa</Text></Card>
          ) : (
            groups.map((g) => {
              const val = counted[g.name] !== undefined ? counted[g.name] : String(g.system_qty);
              const diff = (parseInt(val || "0", 10) || 0) - g.system_qty;
              return (
                <Card key={g.name} style={{ gap: 8 }}>
                  <View style={styles.groupHead}>
                    <Text style={styles.groupName}>{g.name}</Text>
                    <Text style={styles.groupSys}>Sistem: {g.system_qty}</Text>
                  </View>
                  <TextField
                    label="Jumlah fisik dihitung"
                    value={val}
                    onChangeText={(t) => setCounted((c) => ({ ...c, [g.name]: t.replace(/\D/g, "") }))}
                    keyboardType="number-pad"
                    testID={`opname-count-${g.name}`}
                  />
                  {diff !== 0 && <Text style={[styles.diff, { color: colors.error }]}>Selisih {diff > 0 ? "+" : ""}{diff}</Text>}
                </Card>
              );
            })
          )}

          <Card>
            <TextField label="Catatan Laporan" value={notes} onChangeText={setNotes} placeholder="Keterangan opname" testID="opname-notes" />
          </Card>

          <Button title="Simpan Laporan" onPress={submit} loading={saving} disabled={groups.length === 0} testID="opname-save" />
        </KeyboardAwareScrollView>
      )}
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  label: { fontSize: 13, fontWeight: "600", color: c.onSurfaceTertiary },
  periodRow: { flexDirection: "row", gap: 8 },
  periodBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: c.surfaceTertiary, alignItems: "center", borderWidth: 1, borderColor: c.border },
  periodActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  periodTxt: { fontSize: 14, fontWeight: "700", color: c.onSurface },
  section: { fontSize: 15, fontWeight: "800", color: c.onSurface, marginTop: 4 },
  groupHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  groupName: { fontSize: 15, fontWeight: "700", color: c.onSurface },
  groupSys: { fontSize: 13, color: c.muted },
  diff: { fontSize: 13, fontWeight: "700" },
  empty: { color: c.muted, textAlign: "center" },
}));
