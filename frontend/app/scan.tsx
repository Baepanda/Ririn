import React, { useRef, useState } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { X, QrCode, Camera as CameraIcon } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { apiFetch, ApiError } from "@/src/api/client";
import { useCart } from "@/src/store/cart";
import { useToast } from "@/src/components/toast";
import { Button } from "@/src/components/ui";

export default function ScanScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const cart = useCart();
  const toast = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);

  const onScanned = async ({ data }: { data: string }) => {
    if (lock.current || busy) return;
    lock.current = true;
    setBusy(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      const item = await apiFetch<any>(`/items/qr/${encodeURIComponent(data.trim())}`);
      const ok = cart.add(item);
      toast.show(ok ? `${item.name} ditambah` : `${item.name} sudah di keranjang`, ok ? "success" : "info");
      router.back();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Barang tidak ditemukan", "error");
      setTimeout(() => {
        lock.current = false;
        setBusy(false);
      }, 1500);
    }
  };

  // Permission states
  if (!permission) {
    return <View style={styles.black} />;
  }

  if (!permission.granted) {
    const blocked = !permission.canAskAgain;
    return (
      <View style={[styles.perm, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <Pressable style={[styles.closeTop, { top: insets.top + 12 }]} onPress={() => router.back()} testID="scan-close">
          <X size={22} color={colors.onSurface} weight="bold" />
        </Pressable>
        <View style={styles.permIcon}><CameraIcon size={44} color={colors.brandPrimary} weight="fill" /></View>
        <Text style={styles.permTitle}>Izin Kamera Diperlukan</Text>
        <Text style={styles.permText}>
          Golden memerlukan akses kamera untuk memindai QR code barang saat penjualan.
        </Text>
        <View style={{ height: 20 }} />
        {blocked ? (
          <Button title="Buka Pengaturan" onPress={() => Linking.openSettings()} testID="scan-open-settings" />
        ) : (
          <Button title="Izinkan Kamera" onPress={requestPermission} testID="scan-request-permission" />
        )}
        <View style={{ height: 10 }} />
        <Button title="Batal" variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.black}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr", "code128", "ean13", "ean8", "code39"] }}
        onBarcodeScanned={onScanned}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.overlayTitle}>Scan QR Barang</Text>
          <Pressable style={styles.closeBtn} onPress={() => router.back()} testID="scan-close">
            <X size={22} color="#FFFFFF" weight="bold" />
          </Pressable>
        </View>
        <View style={styles.center} pointerEvents="none">
          <View style={styles.frame}>
            <QrCode size={40} color="rgba(255,255,255,0.5)" />
          </View>
          <Text style={styles.hint}>Arahkan kamera ke QR code barang</Text>
        </View>
        <View style={{ height: insets.bottom + 24 }} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  black: { flex: 1, backgroundColor: "#000000" },
  overlay: { ...({ position: "absolute" } as const), top: 0, left: 0, right: 0, bottom: 0, justifyContent: "space-between" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  overlayTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", gap: 16 },
  frame: { width: 240, height: 240, borderRadius: 24, borderWidth: 3, borderColor: c.brand, alignItems: "center", justifyContent: "center" },
  hint: { color: "#FFFFFF", fontSize: 14, fontWeight: "600", textAlign: "center" },
  perm: { flex: 1, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  closeTop: { ...({ position: "absolute" } as const), right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  permIcon: { width: 96, height: 96, borderRadius: 28, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  permTitle: { fontSize: 20, fontWeight: "800", color: c.onSurface, textAlign: "center" },
  permText: { fontSize: 14, color: c.muted, textAlign: "center", marginTop: 8, lineHeight: 20 },
}));
