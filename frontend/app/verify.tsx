import React, { useRef, useState } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { X, ShieldCheck, Camera as CameraIcon } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { apiFetch, ApiError } from "@/src/api/client";
import { useToast } from "@/src/components/toast";
import { Button } from "@/src/components/ui";

export default function VerifyScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
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
      const sale = await apiFetch<any>(`/sales/verify/${encodeURIComponent(data.trim())}`);
      toast.show(`Nota asli: ${sale.receipt_no}`, "success");
      router.replace({ pathname: "/sale/[id]", params: { id: sale.id } });
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toast.show(e instanceof ApiError ? e.message : "Nota tidak valid", "error");
      setTimeout(() => {
        lock.current = false;
        setBusy(false);
      }, 1500);
    }
  };

  if (!permission) return <View style={styles.black} />;

  if (!permission.granted) {
    const blocked = !permission.canAskAgain;
    return (
      <View style={[styles.perm, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <Pressable style={[styles.closeTop, { top: insets.top + 12 }]} onPress={() => router.back()} testID="verify-close">
          <X size={22} color={colors.onSurface} weight="bold" />
        </Pressable>
        <View style={styles.permIcon}><CameraIcon size={44} color={colors.brandPrimary} weight="fill" /></View>
        <Text style={styles.permTitle}>Izin Kamera Diperlukan</Text>
        <Text style={styles.permText}>Golden memerlukan kamera untuk memindai QR pada nota penjualan.</Text>
        <View style={{ height: 20 }} />
        {blocked ? (
          <Button title="Buka Pengaturan" onPress={() => Linking.openSettings()} testID="verify-open-settings" />
        ) : (
          <Button title="Izinkan Kamera" onPress={requestPermission} testID="verify-request-permission" />
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
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={onScanned}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.overlayTitle}>Verifikasi Nota</Text>
          <Pressable style={styles.closeBtn} onPress={() => router.back()} testID="verify-close">
            <X size={22} color="#FFFFFF" weight="bold" />
          </Pressable>
        </View>
        <View style={styles.center} pointerEvents="none">
          <View style={styles.frame}>
            <ShieldCheck size={40} color="rgba(255,255,255,0.6)" />
          </View>
          <Text style={styles.hint}>Arahkan ke QR code pada nota untuk cek keaslian</Text>
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
  hint: { color: "#FFFFFF", fontSize: 14, fontWeight: "600", textAlign: "center", paddingHorizontal: 40 },
  perm: { flex: 1, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  closeTop: { ...({ position: "absolute" } as const), right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  permIcon: { width: 96, height: 96, borderRadius: 28, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  permTitle: { fontSize: 20, fontWeight: "800", color: c.onSurface, textAlign: "center" },
  permText: { fontSize: 14, color: c.muted, textAlign: "center", marginTop: 8, lineHeight: 20 },
}));
