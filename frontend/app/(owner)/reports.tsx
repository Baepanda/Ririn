import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { CheckCircle, TrendUp } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { useApi } from "@/src/api/query";
import { apiFetch } from "@/src/api/client";
import { queryClient } from "@/src/query-client";
import { useToast } from "@/src/components/toast";
import { ScreenContainer, AppHeader, formatIDR, EmptyState, LoadingView, Button, Badge } from "@/src/components/ui";
import { SaleRow } from "@/src/components/sale-row";
import { LogoutButton } from "@/src/components/logout-button";

const PLABEL: Record<string, string> = { weekly: "Mingguan", monthly: "Bulanan", yearly: "Tahunan" };
const PERIODS = [{ key: "", label: "Semua" }, { key: "weekly", label: "Mingguan" }, { key: "monthly", label: "Bulanan" }, { key: "yearly", label: "Tahunan" }];

export default function OwnerReports() {
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const [tab, setTab] = useState<"sales" | "opname">("sales");
  const [period, setPeriod] = useState("");

  const summary = useApi<any>(["summary"], "/reports/summary");
  const sales = useApi<any[]>(["sales", "completed"], "/sales?status=completed");
  const opname = useApi<any[]>(["opname", period], `/stock-opname${period ? `?period=${period}` : ""}`);

  const approveOpname = async (id: string) => {
    try {
      await apiFetch(`/stock-opname/${id}/approve`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["opname"] });
      toast.show("Laporan opname di-ACC", "success");
    } catch {
      toast.show("Gagal ACC laporan", "error");
    }
  };

  return (
    <ScreenContainer>
      <AppHeader title="Laporan" subtitle="Keuangan & stock opname" right={<LogoutButton />} />
      <View style={styles.segment}>
        <Pressable style={[styles.seg, tab === "sales" && styles.segActive]} onPress={() => setTab("sales")} testID="report-tab-sales">
          <Text style={[styles.segTxt, tab === "sales" && styles.segTxtActive]}>Penjualan</Text>
        </Pressable>
        <Pressable style={[styles.seg, tab === "opname" && styles.segActive]} onPress={() => setTab("opname")} testID="report-tab-opname">
          <Text style={[styles.segTxt, tab === "opname" && styles.segTxtActive]}>Stock Opname</Text>
        </Pressable>
      </View>

      {tab === "sales" ? (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={summary.isRefetching} onRefresh={() => { summary.refetch(); sales.refetch(); }} tintColor={colors.brandPrimary} />}
        >
          {summary.isLoading ? (
            <LoadingView />
          ) : (
            <>
              <View style={styles.finCard}>
                <FinRow label="Total Omzet" value={formatIDR(summary.data?.total_revenue)} styles={styles} />
                <FinRow label="Total Modal (HPP)" value={formatIDR(summary.data?.total_cost)} styles={styles} />
                <View style={styles.finDivider} />
                <FinRow label="Laba Kotor" value={formatIDR(summary.data?.gross_profit)} bold styles={styles} accent />
                <View style={styles.marginBadge}>
                  <TrendUp size={16} color={colors.success} weight="bold" />
                  <Text style={styles.marginTxt}>Margin {summary.data?.margin || 0}%</Text>
                </View>
              </View>
              <Text style={styles.section}>Transaksi Selesai ({sales.data?.length || 0})</Text>
              {(sales.data || []).length === 0 ? (
                <EmptyState title="Belum ada transaksi selesai" />
              ) : (
                <View style={{ gap: 12 }}>{sales.data!.map((s) => <SaleRow key={s.id} sale={s} />)}</View>
              )}
            </>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={opname.isRefetching} onRefresh={opname.refetch} tintColor={colors.brandPrimary} />}
        >
          <View style={styles.chipRow}>
            {PERIODS.map((p) => {
              const active = p.key === period;
              return (
                <Pressable key={p.key} onPress={() => setPeriod(p.key)} style={[styles.chip, active && styles.chipActive]} testID={`report-opname-${p.key || "all"}`}>
                  <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {opname.isLoading ? (
            <LoadingView />
          ) : (opname.data || []).length === 0 ? (
            <EmptyState title="Belum ada laporan opname" />
          ) : (
            opname.data!.map((item) => (
              <View key={item.id} style={styles.opCard}>
                <View style={styles.opHead}>
                  <Badge label={PLABEL[item.period_type] || item.period_type} tone="brand" />
                  <Badge label={item.status === "approved" ? "Di-ACC" : "Menunggu ACC"} tone={item.status === "approved" ? "success" : "warning"} />
                </View>
                <Text style={styles.opDate}>{new Date(item.created_at).toLocaleString("id-ID")} • {item.created_by_name}</Text>
                <View style={styles.opStats}>
                  <Text style={styles.opStat}>Sistem: {item.total_system}</Text>
                  <Text style={styles.opStat}>Fisik: {item.total_counted}</Text>
                  <Text style={[styles.opStat, { color: item.difference === 0 ? colors.success : colors.error, fontWeight: "800" }]}>Selisih: {item.difference > 0 ? "+" : ""}{item.difference}</Text>
                </View>
                {item.status !== "approved" && (
                  <Button title="ACC Laporan" onPress={() => approveOpname(item.id)} testID={`opname-approve-${item.id}`} icon={<CheckCircle size={18} color={colors.onBrandPrimary} weight="fill" />} />
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

function FinRow({ label, value, bold, accent, styles }: any) {
  return (
    <View style={styles.finRow}>
      <Text style={[styles.finLbl, bold && { fontWeight: "800", color: styles._accent }]}>{label}</Text>
      <Text style={[styles.finVal, bold && { fontSize: 20 }, accent && { color: "#C5A028" }]}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  segment: { flexDirection: "row", margin: 16, marginBottom: 0, backgroundColor: c.surfaceTertiary, borderRadius: 12, padding: 4 },
  seg: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: "center" },
  segActive: { backgroundColor: c.surfaceSecondary, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  segTxt: { fontSize: 14, fontWeight: "700", color: c.muted },
  segTxtActive: { color: c.onSurface },
  finCard: { backgroundColor: c.surfaceSecondary, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: c.border, gap: 10 },
  finRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  finLbl: { fontSize: 14, color: c.onSurfaceTertiary, fontWeight: "600" },
  finVal: { fontSize: 15, fontWeight: "700", color: c.onSurface },
  finDivider: { height: 1, backgroundColor: c.divider },
  marginBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "#E7F8EC", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  marginTxt: { fontSize: 13, fontWeight: "800", color: c.success },
  section: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: { height: 36, paddingHorizontal: 16, borderRadius: 999, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center", flexShrink: 0, borderWidth: 1, borderColor: c.border },
  chipActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  chipTxt: { fontSize: 13, fontWeight: "600", color: c.onSurfaceTertiary },
  chipTxtActive: { color: c.onBrandPrimary },
  opCard: { backgroundColor: c.surfaceSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.border, gap: 10 },
  opHead: { flexDirection: "row", justifyContent: "space-between" },
  opDate: { fontSize: 12, color: c.muted },
  opStats: { flexDirection: "row", justifyContent: "space-between" },
  opStat: { fontSize: 13, color: c.onSurfaceTertiary },
}));
