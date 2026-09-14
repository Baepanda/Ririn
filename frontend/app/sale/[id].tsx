import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Printer, Money, CreditCard, Bank, Wallet, TrendUp, CheckCircle, XCircle, Clock } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { useApi } from "@/src/api/query";
import { apiFetch, ApiError } from "@/src/api/client";
import { queryClient } from "@/src/query-client";
import { useAuth } from "@/src/auth/auth";
import { useToast } from "@/src/components/toast";
import { AppHeader, Button, Card, TextField, Badge, formatIDR, ScreenContainer, LoadingView } from "@/src/components/ui";
import { ProductImage } from "@/src/components/product-image";
import { printReceipt } from "@/src/utils/print";

const METHODS = [
  { key: "tunai", label: "Tunai", Icon: Money },
  { key: "transfer", label: "Transfer", Icon: Bank },
  { key: "debit", label: "Debit", Icon: CreditCard },
  { key: "kredit", label: "Kredit", Icon: Wallet },
] as const;

const STATUS: Record<string, { label: string; tone: any }> = {
  pending_approval: { label: "Menunggu ACC", tone: "warning" },
  approved: { label: "Disetujui", tone: "brand" },
  rejected: { label: "Ditolak", tone: "error" },
  completed: { label: "Selesai", tone: "success" },
};

export default function SaleDetail() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();

  const { data: sale, isLoading, refetch } = useApi<any>(["sale", id], `/sales/${id}`);
  const [method, setMethod] = useState<string>("tunai");
  const [txnNo, setTxnNo] = useState("");
  const [loading, setLoading] = useState(false);

  if (isLoading || !sale) {
    return (
      <ScreenContainer>
        <AppHeader title="Detail Transaksi" back />
        <LoadingView />
      </ScreenContainer>
    );
  }

  const st = STATUS[sale.status] || STATUS.pending_approval;
  const canPay = sale.status === "approved" && (user?.role === "employee" || user?.role === "owner");
  const needTxn = method === "transfer" || method === "debit";

  const complete = async () => {
    if (needTxn && !txnNo.trim()) {
      toast.show("Nomor transaksi wajib untuk transfer/debit", "error");
      return;
    }
    setLoading(true);
    try {
      const updated = await apiFetch<any>(`/sales/${id}/complete`, {
        method: "POST",
        body: JSON.stringify({ payment_method: method, transaction_number: txnNo }),
      });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["sale", id] });
      await refetch();
      toast.show("Transaksi selesai, barang keluar dari inventaris", "success");
      try {
        await printReceipt(updated);
      } catch {
        toast.show("Nota siap, cetak dari tombol Cetak Nota", "info");
      }
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Gagal menyelesaikan", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <AppHeader title="Detail Transaksi" subtitle={sale.receipt_no || "Belum ada nomor"} back />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 12 }} bottomOffset={24}>
        <View style={styles.statusRow}>
          <Badge label={st.label} tone={st.tone} />
          <Text style={styles.date}>{new Date(sale.created_at).toLocaleString("id-ID")}</Text>
        </View>

        {sale.status === "pending_approval" && (
          <Card style={styles.infoCard}>
            <Clock size={22} color={colors.warning} weight="fill" />
            <Text style={styles.infoTxt}>Menunggu Owner meng-ACC harga jual sebelum pembayaran.</Text>
          </Card>
        )}
        {sale.status === "rejected" && (
          <Card style={[styles.infoCard, { backgroundColor: "#FDECEA" }]}>
            <XCircle size={22} color={colors.error} weight="fill" />
            <Text style={styles.infoTxt}>Ditolak Owner. {sale.reject_reason || ""}</Text>
          </Card>
        )}
        {sale.status === "approved" && (
          <Card style={[styles.infoCard, { backgroundColor: colors.brandTertiary }]}>
            <CheckCircle size={22} color={colors.brandPrimary} weight="fill" />
            <Text style={styles.infoTxt}>Harga sudah di-ACC. Lanjutkan pembayaran & cetak nota.</Text>
          </Card>
        )}

        <Card>
          {sale.lines.map((l: any, idx: number) => (
            <View key={idx} style={[styles.lineRow, idx > 0 && styles.lineBorder]}>
              <ProductImage path={l.photo_path} style={styles.img} iconSize={18} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{l.name}</Text>
                <Text style={styles.meta}>{[l.karat, l.weight_gram ? `${l.weight_gram}gr` : null, l.qr_code].filter(Boolean).join(" • ")}</Text>
              </View>
              <Text style={styles.price}>{formatIDR(l.sell_price)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalVal}>{formatIDR(sale.total_sell)}</Text>
          </View>
          {(user?.role === "owner") && (
            <View style={styles.profitRow}>
              <TrendUp size={16} color={colors.success} weight="bold" />
              <Text style={styles.profitTxt}>Untung {formatIDR(sale.profit)} • {sale.profit_pct}% (modal {formatIDR(sale.total_cost)})</Text>
            </View>
          )}
        </Card>

        {sale.customer ? <Text style={styles.meta}>Pelanggan: {sale.customer}</Text> : null}

        {canPay && (
          <Card>
            <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
            <View style={styles.methodGrid}>
              {METHODS.map(({ key, label, Icon }) => {
                const active = method === key;
                return (
                  <Pressable key={key} style={[styles.method, active && styles.methodActive]} onPress={() => setMethod(key)} testID={`pay-method-${key}`}>
                    <Icon size={22} color={active ? colors.onBrandPrimary : colors.onSurface} weight={active ? "fill" : "regular"} />
                    <Text style={[styles.methodTxt, active && { color: colors.onBrandPrimary }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {needTxn && (
              <View style={{ marginTop: 12 }}>
                <TextField label="Nomor Transaksi (wajib)" value={txnNo} onChangeText={setTxnNo} placeholder="No. referensi transfer/debit" testID="pay-txn-number" />
              </View>
            )}
            <View style={{ height: 14 }} />
            <Button title="Bayar & Cetak Nota" onPress={complete} loading={loading} testID="sale-complete-button" icon={<Printer size={18} color={colors.onBrandPrimary} weight="fill" />} />
          </Card>
        )}

        {sale.status === "completed" && (
          <Card>
            <Text style={styles.sectionTitle}>Pembayaran</Text>
            <Text style={styles.meta}>Metode: {METHODS.find((m) => m.key === sale.payment_method)?.label || sale.payment_method}</Text>
            {sale.transaction_number ? <Text style={styles.meta}>No. Transaksi: {sale.transaction_number}</Text> : null}
            <View style={{ height: 14 }} />
            <Button title="Cetak Nota" onPress={() => printReceipt(sale)} testID="sale-print-button" icon={<Printer size={18} color={colors.onBrandPrimary} weight="fill" />} />
          </Card>
        )}
      </KeyboardAwareScrollView>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  date: { fontSize: 12, color: c.muted },
  infoCard: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoTxt: { flex: 1, fontSize: 13, color: c.onSurface, lineHeight: 19 },
  lineRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  lineBorder: { borderTopWidth: 1, borderTopColor: c.divider },
  img: { width: 44, height: 44, borderRadius: 10 },
  name: { fontSize: 14, fontWeight: "700", color: c.onSurface },
  meta: { fontSize: 12, color: c.muted, marginTop: 2 },
  price: { fontSize: 14, fontWeight: "700", color: c.onSurface },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 2, borderTopColor: c.onSurface, marginTop: 8, paddingTop: 10 },
  totalLabel: { fontSize: 15, fontWeight: "800", color: c.onSurface },
  totalVal: { fontSize: 18, fontWeight: "800", color: c.onSurface },
  profitRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  profitTxt: { fontSize: 12, fontWeight: "700", color: c.success },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: c.onSurface, marginBottom: 10 },
  methodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  method: { width: "47%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.surfaceTertiary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: c.border },
  methodActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  methodTxt: { fontSize: 14, fontWeight: "700", color: c.onSurface },
}));
