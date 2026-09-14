import React, { createContext, useContext, useCallback, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme";

type ToastType = "success" | "error" | "info";
interface ToastCtx {
  show: (message: string, type?: ToastType) => void;
}
const Ctx = createContext<ToastCtx>({ show: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [msg, setMsg] = useState("");
  const [type, setType] = useState<ToastType>("info");
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, t: ToastType = "info") => {
      setMsg(message);
      setType(t);
      setVisible(true);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(
          () => setVisible(false),
        );
      }, 2600);
    },
    [opacity],
  );

  const bg =
    type === "success" ? colors.success : type === "error" ? colors.error : colors.surfaceInverse;
  const fg =
    type === "success" ? colors.onSuccess : type === "error" ? colors.onError : colors.onSurfaceInverse;

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {visible && (
        <Animated.View
          pointerEvents="none"
          testID="app-toast"
          style={[
            styles.wrap,
            { top: insets.top + 12, opacity, backgroundColor: bg },
          ]}
        >
          <Text style={[styles.text, { color: fg }]}>{msg}</Text>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    zIndex: 9999,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  text: { fontSize: 14, fontWeight: "600", textAlign: "center" },
});
