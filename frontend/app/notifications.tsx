import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { ClockCountdown, Package, CheckCircle, CaretRight } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { useApi } from "@/src/api/query";
import { ScreenContainer, AppHeader, EmptyState, LoadingView, formatIDR, Badge } from "@/src/components/ui";
import { RoleGuard } from "@/src/auth/role-guard";

function Notifications() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const pendingSales = useApi<any[]>(["sales", "pending"], "/sales?status=pending_approval");
  const pendingItems = useApi<any[]>(["items", "pending_acc"], "/items?status=pending_acc");
  const completed = useApi<any[]>(["sales", "completed"], "/sales?status=completed");

  const loading = pendingSales.isLoading || pendingItems.isLoading || completed.isLoading;
  const latestCompleted = useMemo(() => (completed.data || []).slice(0, 12), [completed.data]);
  const hasPending = (pendingSales.data?.length || 0) + (pendingItems.data?.length || 0) > 0;

  const refetchAll = () => {
    pendingSales.refetch();
    pendingItems.refetch();
    completed.refetch();
  };

  return (
    <ScreenContainer>
      <AppHeader title="Notifikasi" subtitle="Approval & transaksi terbaru" back />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={pendingSales.isRefetching} onRefresh={refetchAll} tintColor={colors.brandPrimary} />}
      >
        {loading ? (
          <LoadingView />
        ) : (
          <>
            <Text style={styles.section}>Menunggu Approval</Text>
            {!hasPending ? (
              <View style={styles.emptyMini}><Text style={styles.emptyTxt}>Tidak ada yang menunggu ACC</Text></View>
            ) : (
              <>
                {(pendingSales.data || []).map((s) => (
                  <Pressable key={s.id} style={styles.card} onPress={() => router.push("/(owner)/approval")} testID={`notif-sale-${s.id}`}>
                    <View style={[styles.icon, { backgroundColor: colors.warning }]}><ClockCountdown size={20} color={colors.onWarning} weight="fill" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.title}>ACC harga — {formatIDR(s.total_sell)}</Text>
                      <Text style={styles.meta}>{s.created_by_name} • {s.lines?.length || 0} barang</Text>
                    </View>
                    <Badge label="Harga" tone="warning" />
                  </Pressable>
                ))}
                {(pendingItems.data || []).map((it) => (
                  <Pressable key={it.id} style={styles.card} onPress={() => router.push("/(owner)/approval")} testID={`notif-item-${it.id}`}>
                    <View style={[styles.icon, { backgroundColor: colors.brandPrimary }]}><Package size={20} color={colors.onBrandPrimary} weight="fill" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.title}>ACC barang masuk — {it.name}</Text>
                      <Text style={styles.meta}>Modal {formatIDR(it.cost_price)} • {it.created_by_name}</Text>
                    </View>
                    <Badge label="Barang" tone="brand" />
                  </Pressable>
                ))}
              </>
            )}

            <Text style={[styles.section, { marginTop: 8 }]}>Transaksi Selesai Terbaru</Text>
            {latestCompleted.length === 0 ? (
              <EmptyState icon={<CheckCircle size={40} color={colors.muted} />} title="Belum ada transaksi selesai" />
            ) : (
              latestCompleted.map((s) => (
                <Pressable key={s.id} style={styles.card} onPress={() => router.push({ pathname: "/sale/[id]", params: { id: s.id } })} testID={`notif-done-${s.id}`}>
                  <View style={[styles.icon, { backgroundColor: colors.success }]}><CheckCircle size={20} color={colors.onSuccess} weight="fill" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{s.receipt_no} — {formatIDR(s.total_sell)}</Text>
                    <Text style={styles.meta}>{s.created_by_name} • {new Date(s.completed_at || s.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
                  </View>
                  <CaretRight size={18} color={colors.muted} />
                </Pressable>
              ))
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

export default function NotificationsScreen() {
  return (
    <RoleGuard allow="owner">
      <Notifications />
    </RoleGuard>
  );
}

const useStyles = makeStyles((c) => ({
  section: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surfaceSecondary, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: c.border },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontWeight: "700", color: c.onSurface },
  meta: { fontSize: 12, color: c.muted, marginTop: 2 },
  emptyMini: { backgroundColor: c.surfaceTertiary, borderRadius: 12, padding: 16, alignItems: "center" },
  emptyTxt: { fontSize: 13, color: c.muted },
}));
