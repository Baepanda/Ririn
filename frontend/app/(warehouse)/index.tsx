import React, { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, Modal, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { Plus, Printer, Package, Warning, ArrowCounterClockwise } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { useApi } from "@/src/api/query";
import { apiFetch, ApiError } from "@/src/api/client";
import { queryClient } from "@/src/query-client";
import { ScreenContainer, AppHeader, EmptyState, LoadingView, Badge, Button, TextField, SearchBar, formatIDR } from "@/src/components/ui";
import { ProductImage } from "@/src/components/product-image";
import { LogoutButton } from "@/src/components/logout-button";
import { printQrLabels } from "@/src/utils/print";
import { useToast } from "@/src/components/toast";

const VISIBLE = ["pending_acc", "in_stock", "damaged"];

export default function WarehouseInventory() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [damageId, setDamageId] = useState<string | null>(null);
  const [damageReason, setDamageReason] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: all = [], isLoading, refetch, isRefetching } = useApi<any[]>(["items", "warehouse"], "/items?status=all");

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    return all.filter(
      (i) =>
        VISIBLE.includes(i.status) &&
        (!term ||
          i.name?.toLowerCase().includes(term) ||
          i.qr_code?.toLowerCase().includes(term) ||
          i.category?.toLowerCase().includes(term)),
    );
  }, [all, q]);
  const counts = useMemo(() => ({
    ready: all.filter((i) => i.status === "in_stock").length,
    pending: all.filter((i) => i.status === "pending_acc").length,
    damaged: all.filter((i) => i.status === "damaged").length,
  }), [all]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["items"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
  };

  const confirmDamage = async () => {
    if (!damageId) return;
    setBusy(true);
    try {
      await apiFetch(`/items/${damageId}/damage`, { method: "POST", body: JSON.stringify({ reason: damageReason }) });
      invalidate();
      toast.show("Barang ditandai rusak", "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Gagal", "error");
    } finally {
      setBusy(false);
      setDamageId(null);
      setDamageReason("");
    }
  };

  const restore = async (id: string) => {
    try {
      await apiFetch(`/items/${id}/restore`, { method: "POST" });
      invalidate();
      toast.show("Barang dikembalikan ke stok", "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Gagal", "error");
    }
  };

  const printOne = async (item: any) => {
    try {
      await printQrLabels([item]);
    } catch {
      toast.show("Gagal membuka cetak", "error");
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const tone = item.status === "in_stock" ? "success" : item.status === "damaged" ? "error" : "warning";
    const label = item.status === "in_stock" ? "Ready" : item.status === "damaged" ? "Rusak" : "Menunggu ACC";
    return (
      <View style={styles.row}>
        <ProductImage path={item.photo_path} style={styles.img} iconSize={22} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[item.karat, item.weight_gram ? `${item.weight_gram}gr` : null].filter(Boolean).join(" • ") || "—"}
          </Text>
          <Text style={styles.cost}>Modal {formatIDR(item.cost_price)}</Text>
          <Badge label={label} tone={tone} />
          {item.status === "damaged" && (
            <Text style={styles.damageInfo} numberOfLines={2}>
              {(item.damage_reason || "Tanpa keterangan")}
              {item.damaged_at ? ` — ${new Date(item.damaged_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}` : ""}
            </Text>
          )}
        </View>
        <View style={styles.rightCol}>
          <View style={styles.qrBox}>
            <QRCode value={item.qr_code} size={40} />
            <Text style={styles.qrCode}>{item.qr_code}</Text>
          </View>
          <View style={styles.actions}>
            <Pressable style={styles.iconBtn} onPress={() => printOne(item)} testID={`print-qr-${item.qr_code}`}>
              <Printer size={16} color={colors.brandPrimary} weight="fill" />
            </Pressable>
            {item.status === "in_stock" && (
              <Pressable style={[styles.iconBtn, { backgroundColor: "#FDECEA" }]} onPress={() => setDamageId(item.id)} testID={`damage-${item.qr_code}`}>
                <Warning size={16} color={colors.error} weight="fill" />
              </Pressable>
            )}
            {item.status === "damaged" && (
              <Pressable style={[styles.iconBtn, { backgroundColor: "#E7F8EC" }]} onPress={() => restore(item.id)} testID={`restore-${item.qr_code}`}>
                <ArrowCounterClockwise size={16} color={colors.success} weight="bold" />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <AppHeader title="Inventaris" subtitle={`${counts.ready} ready • ${counts.pending} menunggu ACC • ${counts.damaged} rusak`} right={<LogoutButton />} />
      <View style={styles.searchWrap}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Cari nama, kode QR, kategori" testID="warehouse-search" />
      </View>
      {isLoading ? (
        <LoadingView />
      ) : items.length === 0 ? (
        <EmptyState icon={<Package size={44} color={colors.muted} />} title={q ? "Barang tidak ditemukan" : "Belum ada stok"} subtitle={q ? undefined : "Tekan tombol + untuk input barang masuk"} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
        />
      )}
      <Pressable style={styles.fab} onPress={() => router.push("/add-item")} testID="warehouse-add-fab">
        <Plus size={26} color={colors.onBrandPrimary} weight="bold" />
      </Pressable>

      <Modal visible={!!damageId} transparent animationType="slide" onRequestClose={() => setDamageId(null)}>
        <Pressable style={styles.backdrop} onPress={() => setDamageId(null)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.sheetTitle}>Tandai Barang Rusak</Text>
          <TextField label="Alasan / keterangan kerusakan" value={damageReason} onChangeText={setDamageReason} placeholder="Contoh: tergores, patah, dll" testID="damage-reason" />
          <View style={{ height: 14 }} />
          <Button title="Konfirmasi Rusak" variant="danger" onPress={confirmDamage} loading={busy} testID="damage-confirm" />
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surfaceSecondary, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: c.border },
  img: { width: 52, height: 52, borderRadius: 10 },
  name: { fontSize: 15, fontWeight: "700", color: c.onSurface },
  meta: { fontSize: 12, color: c.muted },
  cost: { fontSize: 12, color: c.brandPrimary, fontWeight: "700" },
  damageInfo: { fontSize: 11, color: c.error, marginTop: 2 },
  rightCol: { alignItems: "center", gap: 8 },
  qrBox: { alignItems: "center", gap: 2 },
  qrCode: { fontSize: 8, color: c.muted, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 6 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  fab: { position: "absolute", right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: c.onSurface, marginBottom: 14 },
}));
