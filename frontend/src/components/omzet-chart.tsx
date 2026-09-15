import React, { useState } from "react";
import { View, Text, Pressable, useWindowDimensions } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { ChartBar } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { useApi } from "@/src/api/query";
import { formatIDR } from "@/src/components/ui";

function short(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "M";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "jt";
  if (n >= 1_000) return Math.round(n / 1_000) + "rb";
  return String(n);
}

export function OmzetChart() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [type, setType] = useState<"daily" | "monthly">("daily");
  const { data } = useApi<any>(["trend", type], `/reports/trend?type=${type}`);

  const points: { label: string; value: number }[] = data?.points || [];
  const maxVal = Math.max(1, ...points.map((p) => p.value));
  const chartWidth = Math.min(width, 640) - 32 - 24;
  const spacing = points.length > 1 ? Math.max(8, chartWidth / points.length - 22) : 20;

  const barData = points.map((p) => ({
    value: p.value,
    label: p.label,
    frontColor: colors.brandPrimary,
    topLabelComponent: () =>
      p.value > 0 ? <Text style={styles.topLabel}>{short(p.value)}</Text> : null,
  }));

  const total = points.reduce((a, p) => a + p.value, 0);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.titleRow}>
          <ChartBar size={20} color={colors.brandPrimary} weight="fill" />
          <Text style={styles.title}>Tren Omzet</Text>
        </View>
        <View style={styles.toggle}>
          <Pressable style={[styles.tBtn, type === "daily" && styles.tActive]} onPress={() => setType("daily")} testID="trend-daily">
            <Text style={[styles.tTxt, type === "daily" && styles.tTxtActive]}>Harian</Text>
          </Pressable>
          <Pressable style={[styles.tBtn, type === "monthly" && styles.tActive]} onPress={() => setType("monthly")} testID="trend-monthly">
            <Text style={[styles.tTxt, type === "monthly" && styles.tTxtActive]}>Bulanan</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.total}>{formatIDR(total)} <Text style={styles.totalSub}>total {type === "daily" ? "7 hari" : "6 bulan"}</Text></Text>
      <View style={{ marginTop: 12, alignItems: "center" }}>
        {barData.length > 0 && (
          <BarChart
            data={barData}
            width={chartWidth}
            height={150}
            barWidth={18}
            spacing={spacing}
            initialSpacing={12}
            roundedTop
            noOfSections={3}
            maxValue={maxVal * 1.25}
            hideYAxisText
            yAxisThickness={0}
            xAxisThickness={0}
            xAxisLabelTextStyle={{ color: colors.muted, fontSize: 11 }}
            hideRules
            disableScroll
          />
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.surfaceSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.border },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  toggle: { flexDirection: "row", backgroundColor: c.surfaceTertiary, borderRadius: 9, padding: 3 },
  tBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 7 },
  tActive: { backgroundColor: c.brandPrimary },
  tTxt: { fontSize: 12, fontWeight: "700", color: c.muted },
  tTxtActive: { color: c.onBrandPrimary },
  total: { fontSize: 20, fontWeight: "800", color: c.onSurface, marginTop: 10 },
  totalSub: { fontSize: 12, fontWeight: "600", color: c.muted },
  topLabel: { fontSize: 9, color: c.muted, fontWeight: "700", marginBottom: 2, width: 40, textAlign: "center", marginLeft: -11 },
}));
