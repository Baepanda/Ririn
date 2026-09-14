import React, { useState } from "react";
import { View, Text, FlatList, Pressable, Modal, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { CheckCircle, XCircle, TrendUp } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { useApi } from "@/src/api/query";
import { apiFetch, ApiError } from "@/src/api/client";
import { queryClient } from "@/src/query-client";
import { useToast } from "@/src/components/toast";
import { ScreenContainer, AppHeader, EmptyState, LoadingView, Button, TextField, formatIDR } from "@/src/components/ui";
import { ProductImage } from "@/src/components/product-image";
import { LogoutButton } from "@/src/components/logout-button";

export default function OwnerApproval() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { data: sales = [], isLoading, refetch, isRefetching } = useApi<any[]>(["sales", "pending"], "/sales?status=pending_approval");
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["sales"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
  };

  const approve = async (id: string) => {
    setBusy(id);
    try {
      await apiFetch(`/sales/${id}/approve`, { method: "POST" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      invalidate();
      toast.show("Harga di-ACC. Karyawan bisa lanjut pembayaran.", "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Gagal", "error");
    } finally {
      setBusy(null);
    }
  };

  const doReject = async () => {
    if (!rejectId) return;
    setBusy(rejectId);
    try {
      await apiFetch(`/sales/${rejectId}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      invalidate();
      toast.show("Transaksi ditolak", "info");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Gagal", "error");
    } finally {
      setBusy(null);
      setRejectId(null);
      setReason("");
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.by}>{item.created_by_name}</Text>
        <Text style={styles.date}>{new Date(item.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
      </View>
      {item.lines.map((l: any, i: number) => (
        <View key={i} style={styles.line}>
          <ProductImage path={l.photo_path} style={styles.img} iconSize={16} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{l.name}</Text>
            <Text style={styles.meta}>Modal {formatIDR(l.cost_price)}</Text>
          </View>
          <Text style={styles.price}>{formatIDR(l.sell_price)}</Text>
        </View>
      ))}
      <View style={styles.totalRow}>
        <Text style={styles.totalLbl}>Total {formatIDR(item.total_sell)}</Text>
        <View style={styles.profitBadge}>
          <TrendUp size={14} color={colors.success} weight="bold" />
          <Text style={styles.profitTxt}>{formatIDR(item.profit)} • {item.profit_pct}%</Text>
        </View>
      </View>
      <View style={styles.btns}>
        <Button title="Tolak" variant="outline" onPress={() => setRejectId(item.id)} testID={`reject-${item.id}`} style={{ flex: 1 }} icon={<XCircle size={18} color={colors.error} />} />
        <Button title="ACC Harga" onPress={() => approve(item.id)} loading={busy === item.id} testID={`approve-${item.id}`} style={{ flex: 1 }} icon={<CheckCircle size={18} color={colors.onBrandPrimary} weight="fill" />} />
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      <AppHeader title="Approval Harga" subtitle="ACC harga jual karyawan" right={<LogoutButton />} />
      {isLoading ? (
        <LoadingView />
      ) : sales.length === 0 ? (
        <EmptyState icon={<CheckCircle size={44} color={colors.success} />} title="Tidak ada yang perlu di-ACC" subtitle="Semua transaksi sudah diproses" />
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(s) => s.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
        />
      )}

      <Modal visible={!!rejectId} transparent animationType="slide" onRequestClose={() => setRejectId(null)}>
        <Pressable style={styles.backdrop} onPress={() => setRejectId(null)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.sheetTitle}>Tolak Transaksi</Text>
          <TextField label="Alasan penolakan" value={reason} onChangeText={setReason} placeholder="Contoh: harga terlalu rendah" testID="reject-reason" />
          <View style={{ height: 14 }} />
          <Button title="Konfirmasi Tolak" variant="danger" onPress={doReject} loading={busy === rejectId} testID="reject-confirm" />
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.surfaceSecondary, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: c.border, gap: 8 },
  cardHead: { flexDirection: "row", justifyContent: "space-between" },
  by: { fontSize: 14, fontWeight: "800", color: c.onSurface },
  date: { fontSize: 12, color: c.muted },
  line: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  img: { width: 36, height: 36, borderRadius: 8 },
  name: { fontSize: 14, fontWeight: "600", color: c.onSurface },
  meta: { fontSize: 12, color: c.muted },
  price: { fontSize: 14, fontWeight: "700", color: c.onSurface },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: c.divider, paddingTop: 10 },
  totalLbl: { fontSize: 15, fontWeight: "800", color: c.onSurface },
  profitBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E7F8EC", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  profitTxt: { fontSize: 12, fontWeight: "700", color: c.success },
  btns: { flexDirection: "row", gap: 10, marginTop: 4 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: c.onSurface, marginBottom: 14 },
}));
