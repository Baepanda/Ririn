import React, { useMemo, useState } from "react";
import { View, FlatList, RefreshControl } from "react-native";
import { Receipt } from "phosphor-react-native";
import { useTheme } from "@/src/theme";
import { useApi } from "@/src/api/query";
import { ScreenContainer, AppHeader, EmptyState, LoadingView, SearchBar } from "@/src/components/ui";
import { SaleRow } from "@/src/components/sale-row";
import { LogoutButton } from "@/src/components/logout-button";

export default function AccountingTransactions() {
  const { colors } = useTheme();
  const [q, setQ] = useState("");
  const { data: sales = [], isLoading, refetch, isRefetching } = useApi<any[]>(["sales", "completed"], "/sales?status=completed");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return sales;
    return sales.filter((s) => s.receipt_no?.toLowerCase().includes(term) || s.customer?.toLowerCase().includes(term));
  }, [sales, q]);

  return (
    <ScreenContainer>
      <AppHeader title="Semua Transaksi" subtitle="Penjualan selesai" right={<LogoutButton />} />
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Cari nomor nota / nama pelanggan" testID="acc-tx-search" />
      </View>
      {isLoading ? (
        <LoadingView />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Receipt size={44} color={colors.muted} />} title={q ? "Transaksi tidak ditemukan" : "Belum ada transaksi selesai"} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <SaleRow sale={item} />}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
        />
      )}
    </ScreenContainer>
  );
}
