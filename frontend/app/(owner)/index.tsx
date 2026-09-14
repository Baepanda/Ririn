import React from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { TrendUp, Package, Calculator, ClockCountdown, CurrencyCircleDollar, Wallet, Percent } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { useApi } from "@/src/api/query";
import { useAuth } from "@/src/auth/auth";
import { ScreenContainer, AppHeader, formatIDR, LoadingView } from "@/src/components/ui";
import { LogoutButton } from "@/src/components/logout-button";

export default function OwnerHome() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useApi<any>(["summary"], "/reports/summary");

  return (
    <ScreenContainer>
      <AppHeader title={`Halo, ${user?.full_name || "Owner"}`} subtitle="Command Center" right={<LogoutButton />} />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
      >
        {isLoading ? (
          <LoadingView />
        ) : (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>Total Omzet Penjualan</Text>
              <Text style={styles.heroVal}>{formatIDR(data?.total_revenue)}</Text>
              <View style={styles.heroRow}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatVal}>{formatIDR(data?.gross_profit)}</Text>
                  <Text style={styles.heroStatLbl}>Laba Kotor</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatVal}>{data?.margin || 0}%</Text>
                  <Text style={styles.heroStatLbl}>Margin</Text>
                </View>
              </View>
            </View>

            <View style={styles.grid}>
              <StatBox icon={<Package size={22} color={colors.brandPrimary} weight="fill" />} value={String(data?.in_stock || 0)} label="Stok Barang" styles={styles} />
              <StatBox icon={<Wallet size={22} color={colors.brandPrimary} weight="fill" />} value={formatIDR(data?.stock_value)} label="Nilai Stok" styles={styles} />
              <StatBox icon={<CurrencyCircleDollar size={22} color={colors.brandPrimary} weight="fill" />} value={String(data?.sales_count || 0)} label="Transaksi Selesai" styles={styles} />
              <StatBox icon={<ClockCountdown size={22} color={colors.warning} weight="fill" />} value={String(data?.pending_approvals || 0)} label="Menunggu ACC" styles={styles} highlight={!!data?.pending_approvals} />
            </View>

            <Pressable style={styles.actionRow} onPress={() => router.push("/(owner)/approval")} testID="owner-go-approval">
              <View style={[styles.actionIcon, { backgroundColor: colors.warning }]}><ClockCountdown size={22} color={colors.onWarning} weight="fill" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>ACC Harga Transaksi</Text>
                <Text style={styles.actionSub}>{data?.pending_approvals || 0} transaksi menunggu persetujuan</Text>
              </View>
            </Pressable>

            <Pressable style={styles.actionRow} onPress={() => router.push("/calculator")} testID="owner-go-calculator">
              <View style={[styles.actionIcon, { backgroundColor: colors.brandPrimary }]}><Calculator size={22} color={colors.onBrandPrimary} weight="fill" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Kalkulator Harga Emas</Text>
                <Text style={styles.actionSub}>Hitung harga jual dari modal, margin & laba</Text>
              </View>
            </Pressable>

            <Pressable style={styles.actionRow} onPress={() => router.push("/(owner)/reports")} testID="owner-go-reports">
              <View style={[styles.actionIcon, { backgroundColor: colors.surfaceInverse }]}><TrendUp size={22} color={colors.onSurfaceInverse} weight="fill" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Laporan & Analisa</Text>
                <Text style={styles.actionSub}>Rekap harian, stock opname & keuangan</Text>
              </View>
            </Pressable>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function StatBox({ icon, value, label, styles, highlight }: any) {
  return (
    <View style={[styles.statBox, highlight && { borderColor: "#FF9500", borderWidth: 1.5 }]}>
      {icon}
      <Text style={styles.statBoxVal} numberOfLines={1}>{value}</Text>
      <Text style={styles.statBoxLbl}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  heroCard: { backgroundColor: c.surfaceInverse, borderRadius: 20, padding: 20 },
  heroLabel: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "600" },
  heroVal: { color: c.onSurfaceInverse, fontSize: 30, fontWeight: "900", marginTop: 4, letterSpacing: -0.5 },
  heroRow: { flexDirection: "row", alignItems: "center", marginTop: 16 },
  heroStat: { flex: 1 },
  heroStatVal: { color: c.brand, fontSize: 18, fontWeight: "800" },
  heroStatLbl: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 },
  heroDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.15)" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statBox: { width: "47%", flexGrow: 1, backgroundColor: c.surfaceSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.border, gap: 6 },
  statBoxVal: { fontSize: 19, fontWeight: "800", color: c.onSurface, marginTop: 4 },
  statBoxLbl: { fontSize: 12, color: c.muted },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: c.surfaceSecondary, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: c.border },
  actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionTitle: { fontSize: 15, fontWeight: "800", color: c.onSurface },
  actionSub: { fontSize: 12, color: c.muted, marginTop: 2 },
}));
