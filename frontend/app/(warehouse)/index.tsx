import React from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { Plus, Printer, Package } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { useApi } from "@/src/api/query";
import { ScreenContainer, AppHeader, EmptyState, LoadingView, formatIDR } from "@/src/components/ui";
import { ProductImage } from "@/src/components/product-image";
import { LogoutButton } from "@/src/components/logout-button";
import { printQrLabels } from "@/src/utils/print";
import { useToast } from "@/src/components/toast";

export default function WarehouseInventory() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { data: items = [], isLoading, refetch, isRefetching } = useApi<any[]>(["items", "in_stock"], "/items?status=in_stock");

  const printOne = async (item: any) => {
    try {
      await printQrLabels([item]);
    } catch {
      toast.show("Gagal membuka cetak", "error");
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.row}>
      <ProductImage path={item.photo_path} style={styles.img} iconSize={22} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[item.karat, item.weight_gram ? `${item.weight_gram}gr` : null].filter(Boolean).join(" • ") || "—"}
        </Text>
        <Text style={styles.cost}>Modal {formatIDR(item.cost_price)}</Text>
      </View>
      <View style={styles.qrBox}>
        <QRCode value={item.qr_code} size={44} />
        <Text style={styles.qrCode}>{item.qr_code}</Text>
      </View>
      <Pressable style={styles.printBtn} onPress={() => printOne(item)} testID={`print-qr-${item.qr_code}`}>
        <Printer size={18} color={colors.brandPrimary} weight="fill" />
      </Pressable>
    </View>
  );

  return (
    <ScreenContainer>
      <AppHeader title="Inventaris" subtitle={`${items.length} barang di stok`} right={<LogoutButton />} />
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
      <Pressable style={[styles.fab, { bottom: 24 }]} onPress={() => router.push("/add-item")} testID="warehouse-add-fab">
        <Plus size={26} color={colors.onBrandPrimary} weight="bold" />
      </Pressable>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surfaceSecondary, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: c.border },
  img: { width: 52, height: 52, borderRadius: 10 },
  name: { fontSize: 15, fontWeight: "700", color: c.onSurface },
  meta: { fontSize: 12, color: c.muted, marginTop: 2 },
  cost: { fontSize: 12, color: c.brandPrimary, fontWeight: "700", marginTop: 2 },
  qrBox: { alignItems: "center", gap: 2 },
  qrCode: { fontSize: 8, color: c.muted, fontWeight: "600" },
  printBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  fab: { position: "absolute", right: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
}));
