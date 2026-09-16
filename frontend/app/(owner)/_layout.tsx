import { Tabs } from "expo-router";
import { House, CheckSquareOffset, ChartBar, UsersThree } from "phosphor-react-native";
import { useTheme } from "@/src/theme";
import { useApi } from "@/src/api/query";
import { makeTabOptions } from "@/src/components/tab-bar";
import { RoleGuard } from "@/src/auth/role-guard";

export default function OwnerLayout() {
  const { colors } = useTheme();
  const { data } = useApi<any>(["summary"], "/reports/summary", { refetchInterval: 15000 });
  const pending = data?.pending_total || 0;
  return (
    <RoleGuard allow="owner">
      <Tabs screenOptions={makeTabOptions(colors)}>
        <Tabs.Screen
          name="index"
          options={{ title: "Beranda", tabBarIcon: ({ color, size }) => <House color={color} size={size} weight="fill" /> }}
        />
        <Tabs.Screen
          name="approval"
          options={{ title: "Approval", tabBarBadge: pending > 0 ? pending : undefined, tabBarIcon: ({ color, size }) => <CheckSquareOffset color={color} size={size} weight="fill" /> }}
        />
        <Tabs.Screen
          name="reports"
          options={{ title: "Laporan", tabBarIcon: ({ color, size }) => <ChartBar color={color} size={size} weight="fill" /> }}
        />
        <Tabs.Screen
          name="staff"
          options={{ title: "Pegawai", tabBarIcon: ({ color, size }) => <UsersThree color={color} size={size} weight="fill" /> }}
        />
      </Tabs>
    </RoleGuard>
  );
}
