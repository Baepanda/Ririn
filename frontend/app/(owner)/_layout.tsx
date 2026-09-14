import { Tabs } from "expo-router";
import { House, CheckSquareOffset, ChartBar, UsersThree } from "phosphor-react-native";
import { useTheme } from "@/src/theme";
import { makeTabOptions } from "@/src/components/tab-bar";
import { RoleGuard } from "@/src/auth/role-guard";

export default function OwnerLayout() {
  const { colors } = useTheme();
  return (
    <RoleGuard allow="owner">
      <Tabs screenOptions={makeTabOptions(colors)}>
        <Tabs.Screen
          name="index"
          options={{ title: "Beranda", tabBarIcon: ({ color, size }) => <House color={color} size={size} weight="fill" /> }}
        />
        <Tabs.Screen
          name="approval"
          options={{ title: "Approval", tabBarIcon: ({ color, size }) => <CheckSquareOffset color={color} size={size} weight="fill" /> }}
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
