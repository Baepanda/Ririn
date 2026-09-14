import { useEffect } from "react";
import { View, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth, roleHome } from "@/src/auth/auth";
import { useTheme } from "@/src/theme";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(roleHome[user.role] as any);
    } else {
      router.replace("/login");
    }
  }, [user, loading, router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
      <Image
        source={require("../assets/images/app-image.png")}
        style={{ width: 140, height: 140, resizeMode: "contain", marginBottom: 24 }}
      />
      <ActivityIndicator color={colors.brandPrimary} size="large" />
    </View>
  );
}
