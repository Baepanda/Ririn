import React, { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, ScrollView, useWindowDimensions, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { QrCode, Plus, ShoppingCartSimple, Check, Trash, Package } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { useApi } from "@/src/api/query";
import { ScreenContainer, AppHeader, EmptyState, LoadingView, Button, formatIDR } from "@/src/components/ui";
import { ProductImage } from "@/src/components/product-image";
import { useCart } from "@/src/store/cart";
import { useToast } from "@/src/components/toast";

export default function KaryawanPOS() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const cart = useCart();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const isTablet = width >= 820;
  const numCols = isTablet ? 3 : 2;

  const { data: items = [], isLoading, refetch, isRefetching } = useApi<any[]>(["items", "in_stock"], "/items?status=in_stock");
  const [cat, setCat] = useState("Semua");

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.category && set.add(i.category));
    return ["Semua", ...Array.from(set)];
  }, [items]);

  const filtered = useMemo(
    () => (cat === "Semua" ? items : items.filter((i) => i.category === cat)),
    [items, cat],
  );

  const inCart = (id: string) => cart.items.some((i) => i.id === id);

  const onAdd = (item: any) => {
    if (inCart(item.id)) {
      cart.remove(item.id);
      return;
    }
    const ok = cart.add(item);
    if (ok) toast.show(`${item.name} ditambah ke keranjang`, "success");
  };

  const renderItem = ({ item }: { item: any }) => {
    const selected = inCart(item.id);
    return (
      <Pressable style={[styles.card, { flex: 1 / numCols }]} onPress={() => onAdd(item)} testID={`pos-item-${item.qr_code}`}>
        <ProductImage path={item.photo_path} style={styles.cardImg} iconSize={32} />
        <View style={{ padding: 10, gap: 2 }}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {[item.karat, item.weight_gram ? `${item.weight_gram}gr` : null].filter(Boolean).join(" • ") || "—"}
          </Text>
          <View style={[styles.addBtn, selected && { backgroundColor: colors.success }]}>
            {selected ? <Check size={14} color={colors.onSuccess} weight="bold" /> : <Plus size={14} color={colors.onBrandPrimary} weight="bold" />}
            <Text style={[styles.addTxt, selected && { color: colors.onSuccess }]}>{selected ? "Di keranjang" : "Tambah"}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const chips = (
    <View style={styles.chipRow}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContent}>
        {categories.map((c) => {
          const active = c === cat;
          return (
            <Pressable key={c} onPress={() => setCat(c)} style={[styles.chip, active && styles.chipActive]} testID={`pos-chip-${c}`}>
              <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{c}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <ScreenContainer>
      <AppHeader
        title="Penjualan"
        subtitle="Pilih barang untuk dijual"
        right={
          <Pressable style={styles.scanBtn} onPress={() => router.push("/scan")} testID="pos-scan-button">
            <QrCode size={20} color={colors.onBrandPrimary} weight="bold" />
          </Pressable>
        }
      />
      {chips}
      <View style={{ flex: 1, flexDirection: "row" }}>
        <View style={{ flex: 1 }}>
          {isLoading ? (
            <LoadingView />
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Package size={44} color={colors.muted} />} title="Belum ada barang di inventaris" subtitle="Barang akan muncul setelah gudang input stok" />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(i) => i.id}
              renderItem={renderItem}
              numColumns={numCols}
              key={numCols}
              columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: 120, gap: 12 }}
              refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
            />
          )}
        </View>

        {isTablet && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Keranjang ({cart.items.length})</Text>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
              {cart.items.length === 0 ? (
                <Text style={styles.panelEmpty}>Keranjang kosong</Text>
              ) : (
                cart.items.map((i) => (
                  <View key={i.id} style={styles.panelRow}>
                    <ProductImage path={i.photo_path} style={styles.panelImg} iconSize={18} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardName} numberOfLines={1}>{i.name}</Text>
                      <Text style={styles.cardMeta}>{i.qr_code}</Text>
                    </View>
                    <Pressable onPress={() => cart.remove(i.id)} hitSlop={8}>
                      <Trash size={18} color={colors.error} />
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>
            <Button title={`Lanjut (${cart.items.length})`} onPress={() => router.push("/checkout")} disabled={cart.items.length === 0} testID="pos-panel-checkout" icon={<ShoppingCartSimple size={18} color={colors.onBrandPrimary} weight="fill" />} />
          </View>
        )}
      </View>

      {!isTablet && cart.items.length > 0 && (
        <Pressable style={styles.cartBar} onPress={() => router.push("/checkout")} testID="pos-cart-bar">
          <View style={styles.cartBadge}><Text style={styles.cartBadgeTxt}>{cart.items.length}</Text></View>
          <Text style={styles.cartBarTxt}>Lihat Keranjang</Text>
          <Text style={styles.cartBarTotal}>{formatIDR(cart.totalSell)}</Text>
          <ShoppingCartSimple size={20} color={colors.onBrandPrimary} weight="fill" />
        </Pressable>
      )}
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  scanBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  chipRow: { height: 56, backgroundColor: c.surface, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: c.divider },
  chipContent: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
  chip: { height: 36, paddingHorizontal: 16, borderRadius: 999, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center", flexShrink: 0, borderWidth: 1, borderColor: c.border },
  chipActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  chipTxt: { fontSize: 13, fontWeight: "600", color: c.onSurfaceTertiary },
  chipTxtActive: { color: c.onBrandPrimary },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
  cardImg: { width: "100%", aspectRatio: 1, backgroundColor: c.brandTertiary },
  cardName: { fontSize: 14, fontWeight: "700", color: c.onSurface },
  cardMeta: { fontSize: 12, color: c.muted },
  addBtn: { marginTop: 6, flexDirection: "row", gap: 4, alignItems: "center", justifyContent: "center", backgroundColor: c.brandPrimary, borderRadius: 8, paddingVertical: 7 },
  addTxt: { fontSize: 12, fontWeight: "700", color: c.onBrandPrimary },
  panel: { width: 300, borderLeftWidth: 1, borderLeftColor: c.divider, backgroundColor: c.surfaceSecondary, padding: 16, gap: 8 },
  panelTitle: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  panelEmpty: { color: c.muted, fontSize: 14, textAlign: "center", marginTop: 24 },
  panelRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.surface, borderRadius: 12, padding: 8, borderWidth: 1, borderColor: c.border },
  panelImg: { width: 40, height: 40, borderRadius: 8 },
  cartBar: { position: "absolute", left: 16, right: 16, bottom: 20, height: 58, borderRadius: 16, backgroundColor: c.brandPrimary, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 12, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  cartBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: c.onBrandPrimary, alignItems: "center", justifyContent: "center" },
  cartBadgeTxt: { color: c.brandPrimary, fontWeight: "800", fontSize: 13 },
  cartBarTxt: { color: c.onBrandPrimary, fontWeight: "700", fontSize: 15, flex: 1 },
  cartBarTotal: { color: c.onBrandPrimary, fontWeight: "800", fontSize: 15 },
}));
