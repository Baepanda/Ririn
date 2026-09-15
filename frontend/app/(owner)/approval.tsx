import React, { useState } from "react";
import { View, Text, FlatList, Pressable, Modal, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { CheckCircle, XCircle, TrendUp, Package } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { useApi } from "@/src/api/query";
import { apiFetch, ApiError } from "@/src/api/client";
import { queryClient } from "@/src/query-client";
import { useToast } from "@/src/components/toast";
import { ScreenContainer, AppHeader, EmptyState, LoadingView, Button, TextField, Badge, formatIDR } from "@/src/components/ui";
import { ProductImage } from "@/src/components/product-image";
import { LogoutButton } from "@/src/components/logout-button";

export default function OwnerApproval() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [seg, setSeg] = useState<"price" | "items">("price");
  const { data: sales = [], isLoading, refetch, isRefetching } = useApi<any[]>(["sales", "pending"], "/sales?status=pending_approval");
  const { data: pendingItems = [], isLoading: itemsLoading, refetch: refetchItems, isRefetching: itemsRefetching } = useApi<any[]>(["items", "pending_acc"], "/items?status=pending_acc");
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["sales"] });
    queryClient.invalidateQueries({ queryKey: ["items"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
  };

  const approveItem = async (id: string) => {
    setBusy(id);
    try {
      await apiFetch(`/items/${id}/approve`, { method: "POST" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      invalidate();
      toast.show("Barang di-ACC & masuk inventaris", "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Gagal", "error");
    } finally {
      setBusy(null);
    }
  };

  const rejectItem = async (id: string) => {
    setBusy(id);
    try {
      await apiFetch(`/items/${id}/reject`, { method: "POST" });
      invalidate();
      toast.show("Barang ditolak", "info");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Gagal", "error");
    } finally {
      setBusy(null);
    }
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

  const renderItemCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.line}>
        <ProductImage path={item.photo_path} style={styles.itemImg} iconSize={26} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.meta} numberOfLines={1}>{[item.karat, item.weight_gram ? `${item.weight_gram}gr` : null, item.qr_code].filter(Boolean).join(" • ")}</Text>
          <Text style={styles.itemCost}>Modal {formatIDR(item.cost_price)}</Text>
          <Text style={styles.meta}>oleh {item.created_by_name}</Text>
        </View>
        <Badge label="Menunggu" tone="warning" />
      </View>
      <View style={styles.btns}>
        <Button title="Tolak" variant="outline" onPress={() => rejectItem(item.id)} loading={busy === item.id} testID={`reject-item-${item.id}`} style={{ flex: 1 }} icon={<XCircle size={18} color={colors.error} />} />
        <Button title="ACC Barang" onPress={() => approveItem(item.id)} loading={busy === item.id} testID={`approve-item-${item.id}`} style={{ flex: 1 }} icon={<CheckCircle size={18} color={colors.onBrandPrimary} weight="fill" />} />
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      <AppHeader title="Approval" subtitle="ACC harga jual & barang masuk" right={<LogoutButton />} />
      <View style={styles.segment}>
        <Pressable style={[styles.seg, seg === "price" && styles.segActive]} onPress={() => setSeg("price")} testID="approval-seg-price">
          <Text style={[styles.segTxt, seg === "price" && styles.segTxtActive]}>Harga ({sales.length})</Text>
        </Pressable>
        <Pressable style={[styles.seg, seg === "items" && styles.segActive]} onPress={() => setSeg("items")} testID="approval-seg-items">
          <Text style={[styles.segTxt, seg === "items" && styles.segTxtActive]}>Barang Masuk ({pendingItems.length})</Text>
        </Pressable>
      </View>

      {seg === "price" ? (
        isLoading ? (
          <LoadingView />
        ) : sales.length === 0 ? (
          <EmptyState icon={<CheckCircle size={44} color={colors.success} />} title="Tidak ada harga yang perlu di-ACC" subtitle="Semua transaksi sudah diproses" />
        ) : (
          <FlatList
            data={sales}
            keyExtractor={(s) => s.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
          />
        )
      ) : itemsLoading ? (
        <LoadingView />
      ) : pendingItems.length === 0 ? (
        <EmptyState icon={<Package size={44} color={colors.success} />} title="Tidak ada barang menunggu ACC" subtitle="Barang dari gudang akan tampil di sini" />
      ) : (
        <FlatList
          data={pendingItems}
          keyExtractor={(i) => i.id}
          renderItem={renderItemCard}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={itemsRefetching} onRefresh={refetchItems} tintColor={colors.brandPrimary} />}
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
  segment: { flexDirection: "row", margin: 16, marginBottom: 0, backgroundColor: c.surfaceTertiary, borderRadius: 12, padding: 4 },
  seg: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: "center" },
  segActive: { backgroundColor: c.surfaceSecondary, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  segTxt: { fontSize: 13, fontWeight: "700", color: c.muted },
  segTxtActive: { color: c.onSurface },
  itemImg: { width: 56, height: 56, borderRadius: 12 },
  itemCost: { fontSize: 13, fontWeight: "700", color: c.brandPrimary },
}));
