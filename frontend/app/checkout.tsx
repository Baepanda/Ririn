import React, { useState, useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Trash, TrendUp } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { useCart } from "@/src/store/cart";
import { useToast } from "@/src/components/toast";
import { apiFetch, ApiError } from "@/src/api/client";
import { queryClient } from "@/src/query-client";
import { AppHeader, Button, Card, TextField, formatIDR, ScreenContainer, EmptyState } from "@/src/components/ui";
import { ProductImage } from "@/src/components/product-image";

export default function Checkout() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const cart = useCart();
  const toast = useToast();

  const [prices, setPrices] = useState<Record<string, string>>({});
  const [customer, setCustomer] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const getPrice = (id: string) => parseInt(prices[id]?.replace(/\D/g, "") || "0", 10) || 0;

  const totals = useMemo(() => {
    const sell = cart.items.reduce((s, i) => s + getPrice(i.id), 0);
    const cost = cart.items.reduce((s, i) => s + i.cost_price, 0);
    const profit = sell - cost;
    const pct = cost ? Math.round((profit / cost) * 1000) / 10 : 0;
    return { sell, cost, profit, pct };
  }, [cart.items, prices]);

  const submit = async () => {
    const lines = cart.items.map((i) => ({ item_id: i.id, sell_price: getPrice(i.id) }));
    if (lines.some((l) => l.sell_price <= 0)) {
      toast.show("Isi harga jual semua barang", "error");
      return;
    }
    setLoading(true);
    try {
      const sale = await apiFetch<any>("/sales", { method: "POST", body: JSON.stringify({ lines, customer, note }) });
      cart.clear();
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.show("Transaksi diajukan, menunggu ACC Owner", "success");
      router.replace({ pathname: "/sale/[id]", params: { id: sale.id } });
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Gagal mengajukan", "error");
    } finally {
      setLoading(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <ScreenContainer>
        <AppHeader title="Keranjang" back />
        <EmptyState title="Keranjang kosong" subtitle="Tambah barang dari halaman penjualan" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppHeader title="Keranjang" subtitle="Input harga jual (di-ACC Owner)" back />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: 16, paddingBottom: 220, gap: 12 }} bottomOffset={220}>
        {cart.items.map((i) => (
          <Card key={i.id} style={{ padding: 12 }}>
            <View style={styles.row}>
              <ProductImage path={i.photo_path} style={styles.img} iconSize={22} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{i.name}</Text>
                <Text style={styles.meta}>{i.qr_code} • Modal {formatIDR(i.cost_price)}</Text>
              </View>
              <Pressable onPress={() => cart.remove(i.id)} hitSlop={8} testID={`checkout-remove-${i.qr_code}`}>
                <Trash size={20} color={colors.error} />
              </Pressable>
            </View>
            <View style={{ height: 10 }} />
            <TextField
              label="Harga Jual (Rp)"
              value={prices[i.id] || ""}
              onChangeText={(t) => setPrices((p) => ({ ...p, [i.id]: t.replace(/\D/g, "") }))}
              placeholder="0"
              keyboardType="number-pad"
              testID={`checkout-price-${i.qr_code}`}
            />
            {getPrice(i.id) > 0 && (
              <Text style={styles.profitHint}>
                Untung {formatIDR(getPrice(i.id) - i.cost_price)} ({i.cost_price ? Math.round(((getPrice(i.id) - i.cost_price) / i.cost_price) * 100) : 0}%)
              </Text>
            )}
          </Card>
        ))}

        <Card>
          <TextField label="Nama Pelanggan (opsional)" value={customer} onChangeText={setCustomer} placeholder="Nama" testID="checkout-customer" />
          <View style={{ height: 12 }} />
          <TextField label="Catatan (opsional)" value={note} onChangeText={setNote} placeholder="Catatan" testID="checkout-note" />
        </Card>
      </KeyboardAwareScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.sumLabel}>Total</Text>
            <Text style={styles.sumTotal}>{formatIDR(totals.sell)}</Text>
          </View>
          <View style={styles.profitBadge}>
            <TrendUp size={16} color={colors.success} weight="bold" />
            <Text style={styles.profitTxt}>Untung {formatIDR(totals.profit)} • {totals.pct}%</Text>
          </View>
        </View>
        <Button title="Ajukan ke Owner untuk ACC" onPress={submit} loading={loading} testID="checkout-submit" />
      </View>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  img: { width: 48, height: 48, borderRadius: 10 },
  name: { fontSize: 15, fontWeight: "700", color: c.onSurface },
  meta: { fontSize: 12, color: c.muted, marginTop: 2 },
  profitHint: { fontSize: 12, color: c.success, fontWeight: "600", marginTop: 6 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: c.surfaceSecondary, borderTopWidth: 1, borderTopColor: c.divider, padding: 16, gap: 12 },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sumLabel: { fontSize: 12, color: c.muted },
  sumTotal: { fontSize: 22, fontWeight: "800", color: c.onSurface },
  profitBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#E7F8EC", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  profitTxt: { fontSize: 12, fontWeight: "700", color: c.success },
}));
