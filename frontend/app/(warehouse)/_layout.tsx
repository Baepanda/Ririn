import { Tabs } from "expo-router";
import { Package, ClipboardText } from "phosphor-react-native";
import { useTheme } from "@/src/theme";
import { makeTabOptions } from "@/src/components/tab-bar";
import { RoleGuard } from "@/src/auth/role-guard";

export default function WarehouseLayout() {
  const { colors } = useTheme();
  return (
    <RoleGuard allow="warehouse">
      <Tabs screenOptions={makeTabOptions(colors)}>
        <Tabs.Screen
          name="index"
          options={{ title: "Inventaris", tabBarIcon: ({ color, size }) => <Package color={color} size={size} weight="fill" /> }}
        />
        <Tabs.Screen
          name="opname"
          options={{ title: "Opname", tabBarIcon: ({ color, size }) => <ClipboardText color={color} size={size} weight="fill" /> }}
        />
      </Tabs>
    </RoleGuard>
  );
}
