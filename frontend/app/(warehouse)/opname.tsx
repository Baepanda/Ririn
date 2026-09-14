import React, { useState } from "react";
import { View, Text, FlatList, Pressable, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Plus, ClipboardText, CheckCircle, Clock } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { useApi } from "@/src/api/query";
import { ScreenContainer, AppHeader, EmptyState, LoadingView, Badge } from "@/src/components/ui";
import { LogoutButton } from "@/src/components/logout-button";

const PERIODS = [
  { key: "", label: "Semua" },
  { key: "weekly", label: "Mingguan" },
  { key: "monthly", label: "Bulanan" },
  { key: "yearly", label: "Tahunan" },
];
const PLABEL: Record<string, string> = { weekly: "Mingguan", monthly: "Bulanan", yearly: "Tahunan" };

export default function OpnameList() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const [period, setPeriod] = useState("");
  const { data: rows = [], isLoading, refetch, isRefetching } = useApi<any[]>(
    ["opname", period],
    `/stock-opname${period ? `?period=${period}` : ""}`,
  );

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Badge label={PLABEL[item.period_type] || item.period_type} tone="brand" />
        <Badge label={item.status === "approved" ? "Di-ACC Owner" : "Menunggu ACC"} tone={item.status === "approved" ? "success" : "warning"} />
      </View>
      <Text style={styles.date}>{new Date(item.created_at).toLocaleString("id-ID")} • oleh {item.created_by_name}</Text>
      <View style={styles.statRow}>
        <View style={styles.stat}><Text style={styles.statVal}>{item.total_system}</Text><Text style={styles.statLbl}>Sistem</Text></View>
        <View style={styles.stat}><Text style={styles.statVal}>{item.total_counted}</Text><Text style={styles.statLbl}>Fisik</Text></View>
        <View style={styles.stat}><Text style={[styles.statVal, { color: item.difference === 0 ? colors.success : colors.error }]}>{item.difference > 0 ? "+" : ""}{item.difference}</Text><Text style={styles.statLbl}>Selisih</Text></View>
        <View style={styles.stat}><Text style={[styles.statVal, { color: item.discrepancy_count ? colors.warning : colors.success }]}>{item.discrepancy_count}</Text><Text style={styles.statLbl}>Tdk cocok</Text></View>
      </View>
      {!!item.notes && <Text style={styles.notes}>{item.notes}</Text>}
    </View>
  );

  return (
    <ScreenContainer>
      <AppHeader title="Stock Opname" subtitle="Laporan pemeriksaan stok" right={<LogoutButton />} />
      <View style={styles.chipRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContent}>
          {PERIODS.map((p) => {
            const active = p.key === period;
            return (
              <Pressable key={p.key} onPress={() => setPeriod(p.key)} style={[styles.chip, active && styles.chipActive]} testID={`opname-period-${p.key || "all"}`}>
                <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      {isLoading ? (
        <LoadingView />
      ) : rows.length === 0 ? (
        <EmptyState icon={<ClipboardText size={44} color={colors.muted} />} title="Belum ada laporan opname" subtitle="Tekan + untuk membuat laporan baru" />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
        />
      )}
      <Pressable style={styles.fab} onPress={() => router.push("/opname-new")} testID="opname-new-fab">
        <Plus size={26} color={colors.onBrandPrimary} weight="bold" />
      </Pressable>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  chipRow: { height: 56, backgroundColor: c.surface, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: c.divider },
  chipContent: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
  chip: { height: 36, paddingHorizontal: 16, borderRadius: 999, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center", flexShrink: 0, borderWidth: 1, borderColor: c.border },
  chipActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  chipTxt: { fontSize: 13, fontWeight: "600", color: c.onSurfaceTertiary },
  chipTxtActive: { color: c.onBrandPrimary },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.border, gap: 8 },
  cardHead: { flexDirection: "row", justifyContent: "space-between" },
  date: { fontSize: 12, color: c.muted },
  statRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  stat: { alignItems: "center", flex: 1 },
  statVal: { fontSize: 20, fontWeight: "800", color: c.onSurface },
  statLbl: { fontSize: 11, color: c.muted, marginTop: 2 },
  notes: { fontSize: 13, color: c.onSurfaceTertiary, backgroundColor: c.surfaceTertiary, padding: 10, borderRadius: 10 },
  fab: { position: "absolute", right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
}));
