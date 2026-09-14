import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuth, roleHome, Role } from "@/src/auth/auth";
import { useTheme } from "@/src/theme";

export function RoleGuard({ allow, children }: { allow: Role; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.brandPrimary} size="large" />
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;
  if (user.role !== allow) return <Redirect href={roleHome[user.role] as any} />;
  return <>{children}</>;
}
