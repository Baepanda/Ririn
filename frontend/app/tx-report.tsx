import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { Receipt } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { useApi } from "@/src/api/query";
import { ScreenContainer, AppHeader, formatIDR, EmptyState, LoadingView } from "@/src/components/ui";
import { SaleRow } from "@/src/components/sale-row";
import { RoleGuard } from "@/src/auth/role-guard";
import { PERIOD_OPTIONS, Period, inPeriod } from "@/src/utils/period";

function Report() {
  const styles = useStyles();
  const { colors } = useTheme();
  const [period, setPeriod] = useState<Period>("day");
  const { data: sales = [], isLoading, refetch, isRefetching } = useApi<any[]>(["sales", "completed"], "/sales?status=completed");

  const filtered = useMemo(() => sales.filter((s) => inPeriod(s.completed_at, period)), [sales, period]);
  const total = useMemo(() => filtered.reduce((a, s) => a + s.total_sell, 0), [filtered]);

  return (
    <ScreenContainer>
      <AppHeader title="Transaksi Selesai" subtitle="Daftar transaksi per periode" back />
      <View style={styles.chipRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContent}>
          {PERIOD_OPTIONS.map((p) => {
            const active = p.key === period;
            return (
              <Pressable key={p.key} onPress={() => setPeriod(p.key)} style={[styles.chip, active && styles.chipActive]} testID={`tx-period-${p.key}`}>
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
        <View style={styles.summary}>
          <Text style={styles.sumTxt}>{filtered.length} transaksi</Text>
          <Text style={styles.sumVal}>{formatIDR(total)}</Text>
        </View>
        {isLoading ? (
          <LoadingView />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Receipt size={40} color={colors.muted} />} title="Belum ada transaksi pada periode ini" />
        ) : (
          filtered.map((s) => <SaleRow key={s.id} sale={s} />)
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

export default function TxReportScreen() {
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
  summary: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: c.brandTertiary, borderRadius: 14, padding: 16 },
  sumTxt: { fontSize: 14, fontWeight: "700", color: c.onSurface },
  sumVal: { fontSize: 18, fontWeight: "800", color: c.brandPrimary },
}));
