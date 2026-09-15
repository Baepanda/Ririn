import React, { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Package } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { useApi } from "@/src/api/query";
import { ScreenContainer, AppHeader, formatIDR, EmptyState, LoadingView, Badge, SearchBar } from "@/src/components/ui";
import { ProductImage } from "@/src/components/product-image";
import { RoleGuard } from "@/src/auth/role-guard";

const TABS = [
  { key: "in_stock", label: "Ready", tone: "success" as const },
  { key: "sold", label: "Terjual", tone: "info" as const },
  { key: "damaged", label: "Rusak", tone: "error" as const },
];

function StockList() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const [tab, setTab] = useState<string>(filter && TABS.some((t) => t.key === filter) ? filter : "in_stock");
  const [q, setQ] = useState("");
  const { data: items = [], isLoading, refetch, isRefetching } = useApi<any[]>(["items", "all"], "/items?status=all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { in_stock: 0, sold: 0, damaged: 0 };
    items.forEach((i) => { if (c[i.status] !== undefined) c[i.status]++; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter(
      (i) =>
        i.status === tab &&
        (!term ||
          i.name?.toLowerCase().includes(term) ||
          i.qr_code?.toLowerCase().includes(term) ||
          i.category?.toLowerCase().includes(term)),
    );
  }, [items, tab, q]);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.row}>
      <ProductImage path={item.photo_path} style={styles.img} iconSize={24} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[item.karat, item.weight_gram ? `${item.weight_gram}gr` : null, item.qr_code].filter(Boolean).join(" • ")}
        </Text>
        <Text style={styles.price}>Modal {formatIDR(item.cost_price)}</Text>
        {tab === "damaged" && (
          <View style={styles.damageBox}>
            <Text style={styles.damageReason}>{item.damage_reason ? item.damage_reason : "Tanpa keterangan"}</Text>
            <Text style={styles.damageDate}>
              {item.damaged_at ? new Date(item.damaged_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : ""}
              {item.damaged_by_name ? ` • ${item.damaged_by_name}` : ""}
            </Text>
          </View>
        )}
      </View>
      {tab === "sold" && <Badge label="Terjual" tone="info" />}
      {tab === "damaged" && <Badge label="Rusak" tone="error" />}
      {tab === "in_stock" && <Badge label="Ready" tone="success" />}
    </View>
  );

  return (
    <ScreenContainer>
      <AppHeader title="Stok Barang" subtitle="Ready • Terjual • Rusak" back />
      <View style={styles.tabs}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable key={t.key} style={[styles.tab, active && styles.tabActive]} onPress={() => setTab(t.key)} testID={`stock-tab-${t.key}`}>
              <Text style={[styles.tabTxt, active && styles.tabTxtActive]}>{t.label}</Text>
              <View style={[styles.countBadge, active && styles.countActive]}>
                <Text style={[styles.countTxt, active && { color: colors.onBrandPrimary }]}>{counts[t.key]}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.searchWrap}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Cari nama, kode QR, kategori" testID="stock-search" />
      </View>
      {isLoading ? (
        <LoadingView />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Package size={40} color={colors.muted} />} title={q ? "Barang tidak ditemukan" : "Tidak ada barang"} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
        />
      )}
    </ScreenContainer>
  );
}

export default function StockListScreen() {
  return (
    <RoleGuard allow="owner">
      <StockList />
    </RoleGuard>
  );
}

const useStyles = makeStyles((c) => ({
  tabs: { flexDirection: "row", margin: 16, marginBottom: 0, backgroundColor: c.surfaceTertiary, borderRadius: 12, padding: 4, gap: 4 },
  tab: { flex: 1, flexDirection: "row", gap: 6, paddingVertical: 10, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: c.surfaceSecondary, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  tabTxt: { fontSize: 13, fontWeight: "700", color: c.muted },
  tabTxtActive: { color: c.onSurface },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  damageBox: { backgroundColor: "#FDECEA", borderRadius: 8, padding: 8, marginTop: 4, gap: 2 },
  damageReason: { fontSize: 12, color: c.error, fontWeight: "600" },
  damageDate: { fontSize: 11, color: c.muted },
  countBadge: { minWidth: 22, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  countActive: { backgroundColor: c.brandPrimary },
  countTxt: { fontSize: 11, fontWeight: "800", color: c.muted },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surfaceSecondary, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: c.border },
  img: { width: 56, height: 56, borderRadius: 12 },
  name: { fontSize: 15, fontWeight: "700", color: c.onSurface },
  meta: { fontSize: 12, color: c.muted },
  price: { fontSize: 13, fontWeight: "700", color: c.brandPrimary },
}));
