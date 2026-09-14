import React, { useState } from "react";
import { View, Text, Image, Pressable } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Eye, EyeSlash, LockKey } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { useAuth, roleHome } from "@/src/auth/auth";
import { useToast } from "@/src/components/toast";
import { Button, TextField } from "@/src/components/ui";
import { ApiError } from "@/src/api/client";

export default function LoginScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!username.trim() || !password) {
      toast.show("Isi username dan password", "error");
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const me = await import("@/src/api/client").then((m) => m.apiFetch("/me"));
      router.replace(roleHome[(me as any).role] as any);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toast.show(e instanceof ApiError ? e.message : "Gagal login", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoWrap}>
          <Image source={require("../assets/images/app-image.png")} style={styles.logo} />
        </View>
        <Text style={styles.brand}>GOLDEN</Text>
        <Text style={styles.tagline}>Manajemen Inventaris & Penjualan Emas</Text>

        <View style={styles.card}>
          <TextField
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            autoCapitalize="none"
            autoCorrect={false}
            testID="login-username-input"
          />
          <View style={{ height: 14 }} />
          <Text style={styles.fieldLabel}>Password</Text>
          <View style={styles.pwRow}>
            <View style={{ flex: 1 }}>
              <TextField
                value={password}
                onChangeText={setPassword}
                placeholder="password"
                secureTextEntry={!show}
                autoCapitalize="none"
                testID="login-password-input"
              />
            </View>
            <Pressable style={styles.eye} onPress={() => setShow((s) => !s)} testID="login-toggle-password">
              {show ? <EyeSlash size={20} color={colors.muted} /> : <Eye size={20} color={colors.muted} />}
            </Pressable>
          </View>
          <View style={{ height: 20 }} />
          <Button title="Masuk" onPress={onLogin} loading={loading} testID="login-submit-button" icon={<LockKey size={18} color={colors.onBrandPrimary} weight="fill" />} />
        </View>

        <View style={styles.noteRow}>
          <Text style={styles.note}>Akun dibuat oleh Owner. 3x salah password akun terkunci.</Text>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  content: { paddingHorizontal: 24, flexGrow: 1, justifyContent: "center" },
  logoWrap: { alignSelf: "center", width: 96, height: 96, borderRadius: 24, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  logo: { width: 64, height: 64, resizeMode: "contain" },
  brand: { fontSize: 34, fontWeight: "900", color: c.onSurface, textAlign: "center", letterSpacing: 2 },
  tagline: { fontSize: 14, color: c.muted, textAlign: "center", marginTop: 6, marginBottom: 28 },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: c.border, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: c.onSurfaceTertiary, marginBottom: 6 },
  pwRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eye: { width: 44, height: 48, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceTertiary, borderRadius: 12, borderWidth: 1, borderColor: c.border },
  noteRow: { marginTop: 20, paddingHorizontal: 8 },
  note: { fontSize: 12, color: c.muted, textAlign: "center", lineHeight: 18 },
}));
