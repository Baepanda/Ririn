import { Tabs } from "expo-router";
import { Storefront, ClockCounterClockwise } from "phosphor-react-native";
import { useTheme } from "@/src/theme";
import { makeTabOptions } from "@/src/components/tab-bar";
import { RoleGuard } from "@/src/auth/role-guard";

export default function KaryawanLayout() {
  const { colors } = useTheme();
  return (
    <RoleGuard allow="employee">
      <Tabs screenOptions={makeTabOptions(colors)}>
        <Tabs.Screen
          name="index"
          options={{ title: "Penjualan", tabBarIcon: ({ color, size }) => <Storefront color={color} size={size} weight="fill" /> }}
        />
        <Tabs.Screen
          name="history"
          options={{ title: "Riwayat", tabBarIcon: ({ color, size }) => <ClockCounterClockwise color={color} size={size} weight="fill" /> }}
        />
      </Tabs>
    </RoleGuard>
  );
}
