import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { CaretRight } from "phosphor-react-native";
import { makeStyles } from "@/src/theme";
import { Badge, formatIDR } from "@/src/components/ui";

const STATUS: Record<string, { label: string; tone: any }> = {
  pending_approval: { label: "Menunggu ACC", tone: "warning" },
  approved: { label: "Disetujui", tone: "brand" },
  rejected: { label: "Ditolak", tone: "error" },
  completed: { label: "Selesai", tone: "success" },
};

export function SaleRow({ sale }: { sale: any }) {
  const styles = useStyles();
  const router = useRouter();
  const st = STATUS[sale.status] || STATUS.pending_approval;
  return (
    <Pressable
      style={styles.row}
      onPress={() => router.push({ pathname: "/sale/[id]", params: { id: sale.id } })}
      testID={`sale-row-${sale.id}`}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.title} numberOfLines={1}>
          {sale.receipt_no || `${sale.lines?.length || 0} barang`} • {formatIDR(sale.total_sell)}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {sale.created_by_name} • {new Date(sale.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
        </Text>
        <Badge label={st.label} tone={st.tone} />
      </View>
      <CaretRight size={18} color="#8E8E93" />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.surfaceSecondary, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: c.border },
  title: { fontSize: 15, fontWeight: "700", color: c.onSurface },
  meta: { fontSize: 12, color: c.muted },
}));
