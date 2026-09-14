import React from "react";
import { FlatList, RefreshControl } from "react-native";
import { ClockCounterClockwise } from "phosphor-react-native";
import { useTheme } from "@/src/theme";
import { useApi } from "@/src/api/query";
import { ScreenContainer, AppHeader, EmptyState, LoadingView } from "@/src/components/ui";
import { SaleRow } from "@/src/components/sale-row";
import { LogoutButton } from "@/src/components/logout-button";

export default function KaryawanHistory() {
  const { colors } = useTheme();
  const { data: sales = [], isLoading, refetch, isRefetching } = useApi<any[]>(["sales", "mine"], "/sales");

  return (
    <ScreenContainer>
      <AppHeader title="Riwayat Penjualan" subtitle="Transaksi Anda" right={<LogoutButton />} />
      {isLoading ? (
        <LoadingView />
      ) : sales.length === 0 ? (
        <EmptyState icon={<ClockCounterClockwise size={44} color={colors.muted} />} title="Belum ada transaksi" subtitle="Transaksi penjualan Anda akan tampil di sini" />
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <SaleRow sale={item} />}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
        />
      )}
    </ScreenContainer>
  );
}
