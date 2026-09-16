import React from "react";
import { Pressable, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { Bell } from "phosphor-react-native";
import { useApi } from "@/src/api/query";
import { makeStyles, useTheme } from "@/src/theme";

export function NotifBell() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { data } = useApi<any>(["summary"], "/reports/summary", { refetchInterval: 15000 });
  const count = data?.pending_total || 0;
  return (
    <Pressable style={styles.btn} onPress={() => router.push("/notifications")} testID="notif-bell" hitSlop={8}>
      <Bell size={20} color={colors.onSurface} weight="fill" />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>{count > 9 ? "9+" : count}</Text>
        </View>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  btn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: c.error, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: c.surface },
  badgeTxt: { color: c.onError, fontSize: 10, fontWeight: "800" },
}));
