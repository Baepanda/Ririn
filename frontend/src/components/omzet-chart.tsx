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
  const [metric, setMetric] = useState<"value" | "profit">("value");
  const { data } = useApi<any>(["trend", type], `/reports/trend?type=${type}`);

  const points: { label: string; value: number; profit: number }[] = data?.points || [];
  const val = (p: any) => (metric === "value" ? p.value : p.profit) || 0;
  const maxVal = Math.max(1, ...points.map((p) => val(p)));
  const chartWidth = Math.min(width, 640) - 32 - 24;
  const spacing = points.length > 1 ? Math.max(8, chartWidth / points.length - 22) : 20;
  const barColor = metric === "value" ? colors.brandPrimary : colors.success;

  const barData = points.map((p) => ({
    value: val(p),
    label: p.label,
    frontColor: barColor,
    topLabelComponent: () =>
      val(p) > 0 ? <Text style={styles.topLabel}>{short(val(p))}</Text> : null,
  }));

  const total = points.reduce((a, p) => a + val(p), 0);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.titleRow}>
          <ChartBar size={20} color={colors.brandPrimary} weight="fill" />
          <Text style={styles.title}>Tren {metric === "value" ? "Omzet" : "Laba"}</Text>
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
      <View style={styles.metricRow}>
        <Pressable style={[styles.mBtn, metric === "value" && styles.mActiveOmzet]} onPress={() => setMetric("value")} testID="metric-omzet">
          <Text style={[styles.mTxt, metric === "value" && { color: colors.onBrandPrimary }]}>Omzet</Text>
        </Pressable>
        <Pressable style={[styles.mBtn, metric === "profit" && styles.mActiveLaba]} onPress={() => setMetric("profit")} testID="metric-laba">
          <Text style={[styles.mTxt, metric === "profit" && { color: colors.onSuccess }]}>Laba</Text>
        </Pressable>
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
  metricRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  mBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 999, backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border },
  mActiveOmzet: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  mActiveLaba: { backgroundColor: c.success, borderColor: c.success },
  mTxt: { fontSize: 12, fontWeight: "700", color: c.muted },
  topLabel: { fontSize: 9, color: c.muted, fontWeight: "700", marginBottom: 2, width: 40, textAlign: "center", marginLeft: -11 },
}));
