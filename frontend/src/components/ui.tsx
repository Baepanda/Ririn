import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { CaretLeft, MagnifyingGlass, XCircle } from "phosphor-react-native";
import { useRouter } from "expo-router";
import { makeStyles, useTheme } from "@/src/theme";

export function formatIDR(n?: number | null): string {
  const v = Math.round(n || 0);
  return "Rp " + v.toLocaleString("id-ID");
}

// ---------------------------------------------------------------------------
// Screen wrapper — paints background edge to edge; pads top via insets.
// ---------------------------------------------------------------------------
export function ScreenContainer({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return <View style={[{ flex: 1, backgroundColor: colors.surface }, style]}>{children}</View>;
}

// ---------------------------------------------------------------------------
// Sticky header
// ---------------------------------------------------------------------------
export function AppHeader({
  title,
  subtitle,
  right,
  back,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  back?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const styles = useHeaderStyles();
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 10 }]}>
      <View style={styles.row}>
        {back && (
          <Pressable
            testID="header-back-button"
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={10}
          >
            <CaretLeft size={22} color={colors.onSurface} weight="bold" />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {right}
      </View>
    </View>
  );
}

const useHeaderStyles = makeStyles((c) => ({
  wrap: {
    backgroundColor: c.surfaceSecondary,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.surfaceTertiary,
  },
  title: { fontSize: 22, fontWeight: "800", color: c.onSurface, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: c.muted, marginTop: 2 },
}));

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  testID,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger";
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const s = useBtnStyles();
  const isDisabled = disabled || loading;
  const bg =
    variant === "primary"
      ? colors.brandPrimary
      : variant === "danger"
        ? colors.error
        : variant === "secondary"
          ? colors.surfaceTertiary
          : "transparent";
  const fg =
    variant === "primary"
      ? colors.onBrandPrimary
      : variant === "danger"
        ? colors.onError
        : colors.onSurface;
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        if (isDisabled) return;
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={[
        s.btn,
        { backgroundColor: bg, opacity: isDisabled ? 0.5 : 1 },
        variant === "outline" && { borderWidth: 1.5, borderColor: colors.borderStrong },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={s.inner}>
          {icon}
          <Text style={[s.text, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const useBtnStyles = makeStyles(() => ({
  btn: {
    minHeight: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  inner: { flexDirection: "row", alignItems: "center", gap: 8 },
  text: { fontSize: 16, fontWeight: "700" },
}));

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const s = useCardStyles();
  return <View style={[s.card, style]}>{children}</View>;
}

const useCardStyles = makeStyles((c) => ({
  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
}));

// ---------------------------------------------------------------------------
// TextField
// ---------------------------------------------------------------------------
export function TextField({
  label,
  value,
  onChangeText,
  ...props
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
} & TextInputProps) {
  const s = useFieldStyles();
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {!!label && <Text style={s.label}>{label}</Text>}
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.muted}
        {...props}
      />
    </View>
  );
}

const useFieldStyles = makeStyles((c) => ({
  label: { fontSize: 13, fontWeight: "600", color: c.onSurfaceTertiary },
  input: {
    backgroundColor: c.surfaceTertiary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: c.onSurface,
    borderWidth: 1,
    borderColor: c.border,
  },
}));

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------
export function Badge({ label, tone = "info" }: { label: string; tone?: "success" | "warning" | "error" | "info" | "brand" }) {
  const { colors } = useTheme();
  const map = {
    success: { bg: "#E7F8EC", fg: colors.success },
    warning: { bg: "#FFF3E0", fg: colors.warning },
    error: { bg: "#FDECEA", fg: colors.error },
    info: { bg: colors.surfaceTertiary, fg: colors.muted },
    brand: { bg: colors.brandTertiary, fg: colors.brandPrimary },
  }[tone];
  return (
    <View style={{ backgroundColor: map.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start" }}>
      <Text style={{ color: map.fg, fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Empty / Loading
// ---------------------------------------------------------------------------
export function LoadingView() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <ActivityIndicator size="large" color={colors.brandPrimary} />
    </View>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon?: React.ReactNode; title: string; subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", padding: 40, gap: 8 }}>
      {icon}
      <Text style={{ fontSize: 16, fontWeight: "700", color: colors.onSurface, textAlign: "center", marginTop: 8 }}>
        {title}
      </Text>
      {!!subtitle && <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center" }}>{subtitle}</Text>}
    </View>
  );
}

export { ScrollView };

// ---------------------------------------------------------------------------
// SearchBar
// ---------------------------------------------------------------------------
export function SearchBar({
  value,
  onChangeText,
  placeholder = "Cari...",
  testID,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  testID?: string;
}) {
  const s = useSearchStyles();
  const { colors } = useTheme();
  return (
    <View style={s.wrap}>
      <MagnifyingGlass size={18} color={colors.muted} />
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        testID={testID}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText("")} hitSlop={8} testID={`${testID}-clear`}>
          <XCircle size={18} color={colors.muted} weight="fill" />
        </Pressable>
      )}
    </View>
  );
}

const useSearchStyles = makeStyles((c) => ({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: c.surfaceTertiary,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: c.border,
  },
  input: { flex: 1, fontSize: 15, color: c.onSurface, paddingVertical: 0 },
}));
