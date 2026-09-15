import React, { useMemo } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { Plus, Printer, Package, Warning, ArrowCounterClockwise } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { useApi } from "@/src/api/query";
import { apiFetch, ApiError } from "@/src/api/client";
import { queryClient } from "@/src/query-client";
import { ScreenContainer, AppHeader, EmptyState, LoadingView, Badge, formatIDR } from "@/src/components/ui";
import { ProductImage } from "@/src/components/product-image";
import { LogoutButton } from "@/src/components/logout-button";
import { printQrLabels } from "@/src/utils/print";
import { useToast } from "@/src/components/toast";

const VISIBLE = ["pending_acc", "in_stock", "damaged"];

export default function WarehouseInventory() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { data: all = [], isLoading, refetch, isRefetching } = useApi<any[]>(["items", "warehouse"], "/items?status=all");

  const items = useMemo(() => all.filter((i) => VISIBLE.includes(i.status)), [all]);
  const counts = useMemo(() => ({
    ready: items.filter((i) => i.status === "in_stock").length,
    pending: items.filter((i) => i.status === "pending_acc").length,
    damaged: items.filter((i) => i.status === "damaged").length,
  }), [items]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["items"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
  };

  const act = async (id: string, action: "damage" | "restore") => {
    try {
      await apiFetch(`/items/${id}/${action}`, { method: "POST" });
      invalidate();
      toast.show(action === "damage" ? "Barang ditandai rusak" : "Barang dikembalikan ke stok", "success");
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
              <Pressable style={[styles.iconBtn, { backgroundColor: "#FDECEA" }]} onPress={() => act(item.id, "damage")} testID={`damage-${item.qr_code}`}>
                <Warning size={16} color={colors.error} weight="fill" />
              </Pressable>
            )}
            {item.status === "damaged" && (
              <Pressable style={[styles.iconBtn, { backgroundColor: "#E7F8EC" }]} onPress={() => act(item.id, "restore")} testID={`restore-${item.qr_code}`}>
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
      {isLoading ? (
        <LoadingView />
      ) : items.length === 0 ? (
        <EmptyState icon={<Package size={44} color={colors.muted} />} title="Belum ada stok" subtitle="Tekan tombol + untuk input barang masuk" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
        />
      )}
      <Pressable style={styles.fab} onPress={() => router.push("/add-item")} testID="warehouse-add-fab">
        <Plus size={26} color={colors.onBrandPrimary} weight="bold" />
      </Pressable>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surfaceSecondary, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: c.border },
  img: { width: 52, height: 52, borderRadius: 10 },
  name: { fontSize: 15, fontWeight: "700", color: c.onSurface },
  meta: { fontSize: 12, color: c.muted },
  cost: { fontSize: 12, color: c.brandPrimary, fontWeight: "700" },
  rightCol: { alignItems: "center", gap: 8 },
  qrBox: { alignItems: "center", gap: 2 },
  qrCode: { fontSize: 8, color: c.muted, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 6 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  fab: { position: "absolute", right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
}));
