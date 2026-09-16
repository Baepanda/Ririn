import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { ToastProvider } from "@/src/components/toast";
import { AuthProvider } from "@/src/auth/auth";
import { CartProvider } from "@/src/store/cart";
import { queryClient } from "@/src/query-client";

LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <KeyboardProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <CartProvider>
                <ToastProvider>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="checkout" options={{ presentation: "modal" }} />
                    <Stack.Screen name="scan" options={{ presentation: "fullScreenModal" }} />
                    <Stack.Screen name="verify" options={{ presentation: "fullScreenModal" }} />
                    <Stack.Screen name="add-item" options={{ presentation: "modal" }} />
                    <Stack.Screen name="calculator" options={{ presentation: "modal" }} />
                    <Stack.Screen name="opname-new" options={{ presentation: "modal" }} />
                  </Stack>
                </ToastProvider>
              </CartProvider>
            </AuthProvider>
          </QueryClientProvider>
          </KeyboardProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
