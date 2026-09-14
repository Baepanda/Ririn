import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { CaretLeft, CaretRight, TrendUp, Receipt, Wallet } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { useApi } from "@/src/api/query";
import { ScreenContainer, AppHeader, formatIDR, EmptyState, LoadingView } from "@/src/components/ui";
import { SaleRow } from "@/src/components/sale-row";
import { LogoutButton } from "@/src/components/logout-button";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}
const METHOD_LABEL: Record<string, string> = { tunai: "Tunai", transfer: "Transfer", debit: "Debit", kredit: "Kredit" };

export default function AccountingRecap() {
  const styles = useStyles();
  const { colors } = useTheme();
  const [date, setDate] = useState(new Date());
  const dateStr = ymd(date);
  const { data, isLoading, refetch, isRefetching } = useApi<any>(["daily", dateStr], `/reports/daily-sales?date=${dateStr}`);

  const shift = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    if (d <= new Date()) setDate(d);
  };
  const isToday = dateStr === ymd(new Date());

  return (
    <ScreenContainer>
      <AppHeader title="Rekap Harian" subtitle="Ringkasan penjualan" right={<LogoutButton />} />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
      >
        <View style={styles.dateNav}>
          <Pressable onPress={() => shift(-1)} style={styles.navBtn} testID="date-prev"><CaretLeft size={18} color={colors.onSurface} weight="bold" /></Pressable>
          <Text style={styles.dateLabel}>{isToday ? "Hari Ini" : date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}</Text>
          <Pressable onPress={() => shift(1)} style={[styles.navBtn, isToday && { opacity: 0.3 }]} disabled={isToday} testID="date-next"><CaretRight size={18} color={colors.onSurface} weight="bold" /></Pressable>
        </View>

        {isLoading ? (
          <LoadingView />
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.brandTertiary }]}>
                <Wallet size={22} color={colors.brandPrimary} weight="fill" />
                <Text style={styles.statVal}>{formatIDR(data?.total_income)}</Text>
                <Text style={styles.statLbl}>Total Pemasukan</Text>
              </View>
              <View style={styles.statCard}>
                <Receipt size={22} color={colors.onSurface} weight="fill" />
                <Text style={styles.statVal}>{data?.transaction_count || 0}</Text>
                <Text style={styles.statLbl}>Transaksi</Text>
              </View>
            </View>

            <View style={styles.profitCard}>
              <TrendUp size={20} color={colors.success} weight="bold" />
              <Text style={styles.profitTxt}>Total Keuntungan: {formatIDR(data?.total_profit)}</Text>
            </View>

            {data?.by_method && Object.keys(data.by_method).length > 0 && (
              <View style={styles.methodCard}>
                <Text style={styles.section}>Per Metode Pembayaran</Text>
                {Object.entries(data.by_method).map(([m, v]) => (
                  <View key={m} style={styles.methodRow}>
                    <Text style={styles.methodName}>{METHOD_LABEL[m] || m}</Text>
                    <Text style={styles.methodVal}>{formatIDR(v as number)}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.section}>Daftar Transaksi</Text>
            {(data?.sales || []).length === 0 ? (
              <EmptyState icon={<Receipt size={40} color={colors.muted} />} title="Belum ada penjualan" subtitle="Belum ada transaksi selesai pada tanggal ini" />
            ) : (
              <View style={{ gap: 12 }}>
                {data.sales.map((s: any) => <SaleRow key={s.id} sale={s} />)}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  dateNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.surfaceSecondary, borderRadius: 14, padding: 8, borderWidth: 1, borderColor: c.border },
  navBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  dateLabel: { fontSize: 15, fontWeight: "800", color: c.onSurface },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.border, gap: 6 },
  statVal: { fontSize: 22, fontWeight: "800", color: c.onSurface, marginTop: 4 },
  statLbl: { fontSize: 12, color: c.muted },
  profitCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#E7F8EC", borderRadius: 14, padding: 14 },
  profitTxt: { fontSize: 15, fontWeight: "800", color: c.success },
  methodCard: { backgroundColor: c.surfaceSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.border, gap: 8 },
  methodRow: { flexDirection: "row", justifyContent: "space-between" },
  methodName: { fontSize: 14, color: c.onSurfaceTertiary, fontWeight: "600" },
  methodVal: { fontSize: 14, color: c.onSurface, fontWeight: "700" },
  section: { fontSize: 16, fontWeight: "800", color: c.onSurface, marginTop: 4 },
}));
