import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { Receipt } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { useApi } from "@/src/api/query";
import { ScreenContainer, AppHeader, formatIDR, EmptyState, LoadingView } from "@/src/components/ui";
import { RoleGuard } from "@/src/auth/role-guard";
import { PERIOD_OPTIONS, Period, inPeriod, periodLabel } from "@/src/utils/period";

function Report() {
  const styles = useStyles();
  const { colors } = useTheme();
  const [period, setPeriod] = useState<Period>("day");
  const { data: sales = [], isLoading, refetch, isRefetching } = useApi<any[]>(["sales", "completed"], "/sales?status=completed");

  const filtered = useMemo(() => sales.filter((s) => inPeriod(s.completed_at, period)), [sales, period]);
  const total = useMemo(() => filtered.reduce((a, s) => a + s.total_sell, 0), [filtered]);
  const profit = useMemo(() => filtered.reduce((a, s) => a + s.profit, 0), [filtered]);

  return (
    <ScreenContainer>
      <AppHeader title="Laporan Penjualan" subtitle="Omzet per periode" back />
      <View style={styles.chipRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContent}>
          {PERIOD_OPTIONS.map((p) => {
            const active = p.key === period;
            return (
              <Pressable key={p.key} onPress={() => setPeriod(p.key)} style={[styles.chip, active && styles.chipActive]} testID={`sales-period-${p.key}`}>
                <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
      >
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Total Omzet — {periodLabel(period)}</Text>
          <Text style={styles.heroVal}>{formatIDR(total)}</Text>
          <View style={styles.heroRow}>
            <Text style={styles.heroSub}>{filtered.length} transaksi</Text>
            <Text style={styles.heroSub}>Laba {formatIDR(profit)}</Text>
          </View>
        </View>

        {isLoading ? (
          <LoadingView />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Receipt size={40} color={colors.muted} />} title="Belum ada penjualan pada periode ini" />
        ) : (
          filtered.map((s) => (
            <View key={s.id} style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.receipt}>{s.receipt_no || "-"}</Text>
                <Text style={styles.date}>{new Date(s.completed_at || s.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</Text>
              </View>
              {s.lines.map((l: any, i: number) => (
                <View key={i} style={styles.line}>
                  <Text style={styles.lineName} numberOfLines={1}>• {l.name}{l.karat ? ` (${l.karat})` : ""}</Text>
                  <Text style={styles.linePrice}>{formatIDR(l.sell_price)}</Text>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLbl}>Total</Text>
                <Text style={styles.totalVal}>{formatIDR(s.total_sell)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

export default function SalesReportScreen() {
  return (
    <RoleGuard allow="owner">
      <Report />
    </RoleGuard>
  );
}

const useStyles = makeStyles((c) => ({
  chipRow: { height: 56, backgroundColor: c.surface, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: c.divider },
  chipContent: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
  chip: { height: 36, paddingHorizontal: 16, borderRadius: 999, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center", flexShrink: 0, borderWidth: 1, borderColor: c.border },
  chipActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  chipTxt: { fontSize: 13, fontWeight: "600", color: c.onSurfaceTertiary },
  chipTxtActive: { color: c.onBrandPrimary },
  hero: { backgroundColor: c.surfaceInverse, borderRadius: 18, padding: 18 },
  heroLabel: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "600" },
  heroVal: { color: "#FFFFFF", fontSize: 28, fontWeight: "900", marginTop: 4 },
  heroRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  heroSub: { color: c.brand, fontSize: 13, fontWeight: "700" },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: c.border, gap: 6 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  receipt: { fontSize: 14, fontWeight: "800", color: c.onSurface },
  date: { fontSize: 11, color: c.muted },
  line: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  lineName: { fontSize: 13, color: c.onSurfaceTertiary, flex: 1 },
  linePrice: { fontSize: 13, fontWeight: "600", color: c.onSurface },
  totalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: c.divider, paddingTop: 6, marginTop: 2 },
  totalLbl: { fontSize: 13, fontWeight: "700", color: c.muted },
  totalVal: { fontSize: 15, fontWeight: "800", color: c.brandPrimary },
}));
