import React from "react";
import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SignOut } from "phosphor-react-native";
import { useAuth } from "@/src/auth/auth";
import { useTheme } from "@/src/theme";

export function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <Pressable
      testID="logout-button"
      hitSlop={10}
      onPress={async () => {
        await logout();
        router.replace("/login");
      }}
      style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" }}
    >
      <SignOut size={20} color={colors.onSurface} />
    </Pressable>
  );
}
