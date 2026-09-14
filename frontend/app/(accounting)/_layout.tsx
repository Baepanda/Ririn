import { Tabs } from "expo-router";
import { Wallet, Receipt } from "phosphor-react-native";
import { useTheme } from "@/src/theme";
import { makeTabOptions } from "@/src/components/tab-bar";
import { RoleGuard } from "@/src/auth/role-guard";

export default function AccountingLayout() {
  const { colors } = useTheme();
  return (
    <RoleGuard allow="accounting">
      <Tabs screenOptions={makeTabOptions(colors)}>
        <Tabs.Screen
          name="index"
          options={{ title: "Rekap", tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} weight="fill" /> }}
        />
        <Tabs.Screen
          name="transactions"
          options={{ title: "Transaksi", tabBarIcon: ({ color, size }) => <Receipt color={color} size={size} weight="fill" /> }}
        />
      </Tabs>
    </RoleGuard>
  );
}
