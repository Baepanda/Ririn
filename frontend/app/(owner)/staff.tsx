import React from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { UserPlus, LockKey, CaretRight, UsersThree } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { useApi } from "@/src/api/query";
import { ScreenContainer, AppHeader, EmptyState, LoadingView, Badge, formatIDR } from "@/src/components/ui";
import { LogoutButton } from "@/src/components/logout-button";

const ROLE_LABEL: Record<string, string> = { owner: "Owner", warehouse: "Warehouse", accounting: "Accounting", employee: "Karyawan" };

export default function StaffList() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { data: users = [], isLoading, refetch, isRefetching } = useApi<any[]>(["users"], "/users");

  const renderItem = ({ item }: { item: any }) => (
    <Pressable style={styles.row} onPress={() => router.push({ pathname: "/staff-form", params: { id: item.id } })} testID={`staff-row-${item.username}`}>
      <View style={styles.avatar}><Text style={styles.avatarTxt}>{(item.full_name || item.username).charAt(0).toUpperCase()}</Text></View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{item.full_name}</Text>
          {item.locked && <LockKey size={16} color={colors.error} weight="fill" />}
        </View>
        <Text style={styles.meta}>@{item.username} • {item.position || ROLE_LABEL[item.role]}</Text>
        <View style={styles.badges}>
          <Badge label={ROLE_LABEL[item.role]} tone="brand" />
          {item.status === "inactive" ? <Badge label="Nonaktif" tone="error" /> : <Badge label="Aktif" tone="success" />}
          {item.salary ? <Text style={styles.salary}>{formatIDR(item.salary)}</Text> : null}
        </View>
      </View>
      <CaretRight size={18} color={colors.muted} />
    </Pressable>
  );

  return (
    <ScreenContainer>
      <AppHeader title="Data Pegawai" subtitle="Kelola akun, jabatan & gaji" right={<LogoutButton />} />
      {isLoading ? (
        <LoadingView />
      ) : users.length === 0 ? (
        <EmptyState icon={<UsersThree size={44} color={colors.muted} />} title="Belum ada pegawai" />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
        />
      )}
      <Pressable style={styles.fab} onPress={() => router.push("/staff-form")} testID="staff-add-fab">
        <UserPlus size={24} color={colors.onBrandPrimary} weight="bold" />
      </Pressable>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surfaceSecondary, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: c.border },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  avatarTxt: { fontSize: 20, fontWeight: "800", color: c.brandPrimary },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 15, fontWeight: "800", color: c.onSurface },
  meta: { fontSize: 12, color: c.muted },
  badges: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  salary: { fontSize: 12, fontWeight: "700", color: c.brandPrimary },
  fab: { position: "absolute", right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
}));
