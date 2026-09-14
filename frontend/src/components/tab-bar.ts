import { Platform } from "react-native";
import type { ThemeColors } from "@/src/theme";

export function makeTabOptions(colors: ThemeColors) {
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.brandPrimary,
    tabBarInactiveTintColor: colors.muted,
    tabBarStyle: {
      backgroundColor: colors.surfaceSecondary,
      borderTopColor: colors.divider,
      ...(Platform.OS === "web" ? { height: 64 } : {}),
    },
    tabBarItemStyle: { alignSelf: "center" as const },
    tabBarLabelStyle: { fontSize: 11, fontWeight: "600" as const },
  };
}
