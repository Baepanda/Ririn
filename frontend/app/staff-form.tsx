import React, { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LockKeyOpen, Trash } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { useApi } from "@/src/api/query";
import { apiFetch, ApiError } from "@/src/api/client";
import { queryClient } from "@/src/query-client";
import { useToast } from "@/src/components/toast";
import { AppHeader, Button, Card, TextField, ScreenContainer } from "@/src/components/ui";

const ROLES = [
  { key: "employee", label: "Karyawan" },
  { key: "warehouse", label: "Warehouse" },
  { key: "accounting", label: "Accounting" },
  { key: "owner", label: "Owner" },
];

export default function StaffForm() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const { data: users = [] } = useApi<any[]>(["users"], "/users", { enabled: isEdit });
  const existing = users.find((u) => u.id === id);

  const [form, setForm] = useState<any>({
    full_name: "", username: "", password: "", role: "employee", position: "",
    salary: "", phone: "", email: "", address: "", ktp: "", contract: "", join_date: "", status: "active",
  });
  const [newPw, setNewPw] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setForm({
        full_name: existing.full_name || "", username: existing.username, password: "",
        role: existing.role, position: existing.position || "",
        salary: existing.salary ? String(existing.salary) : "", phone: existing.phone || "",
        email: existing.email || "", address: existing.address || "", ktp: existing.ktp || "",
        contract: existing.contract || "", join_date: existing.join_date || "", status: existing.status || "active",
      });
    }
  }, [existing]);

  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const save = async () => {
    if (!form.full_name.trim()) return toast.show("Nama wajib diisi", "error");
    if (!isEdit && (form.username.trim().length < 3 || form.password.length < 4))
      return toast.show("Username min 3 & password min 4 karakter", "error");
    setSaving(true);
    try {
      const payload: any = {
        full_name: form.full_name.trim(), role: form.role, position: form.position.trim(),
        salary: form.salary ? parseInt(form.salary.replace(/\D/g, ""), 10) : null,
        phone: form.phone.trim(), email: form.email.trim(), address: form.address.trim(),
        ktp: form.ktp.trim(), contract: form.contract.trim(), join_date: form.join_date.trim(),
      };
      if (isEdit) {
        payload.status = form.status;
        await apiFetch(`/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        payload.username = form.username.trim();
        payload.password = form.password;
        await apiFetch("/users", { method: "POST", body: JSON.stringify(payload) });
      }
      invalidate();
      toast.show(isEdit ? "Data pegawai diperbarui" : "Akun pegawai dibuat", "success");
      router.back();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    if (newPw.length < 4) return toast.show("Password min 4 karakter", "error");
    try {
      await apiFetch(`/users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ password: newPw }) });
      invalidate();
      setNewPw("");
      toast.show("Password direset & blokir dibuka", "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Gagal", "error");
    }
  };

  const unblock = async () => {
    try {
      await apiFetch(`/users/${id}/unblock`, { method: "POST" });
      invalidate();
      toast.show("Blokir dibuka", "success");
    } catch {
      toast.show("Gagal", "error");
    }
  };

  const deactivate = async () => {
    try {
      await apiFetch(`/users/${id}`, { method: "DELETE" });
      invalidate();
      toast.show("Pegawai dinonaktifkan", "info");
      router.back();
    } catch {
      toast.show("Gagal", "error");
    }
  };

  return (
    <ScreenContainer>
      <AppHeader title={isEdit ? "Edit Pegawai" : "Tambah Pegawai"} subtitle={isEdit ? `@${form.username}` : "Buat akun login pegawai"} back />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 12 }} bottomOffset={24}>
        <Card style={{ gap: 12 }}>
          <Text style={styles.section}>Akun & Jabatan</Text>
          <TextField label="Nama Lengkap" value={form.full_name} onChangeText={(t) => set("full_name", t)} placeholder="Nama pegawai" testID="staff-name" />
          {!isEdit && (
            <>
              <TextField label="Username" value={form.username} onChangeText={(t) => set("username", t)} autoCapitalize="none" placeholder="username login" testID="staff-username" />
              <TextField label="Password" value={form.password} onChangeText={(t) => set("password", t)} placeholder="password login" testID="staff-password" />
            </>
          )}
          <Text style={styles.label}>Tingkat / Role</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => {
              const active = form.role === r.key;
              return (
                <Pressable key={r.key} style={[styles.roleBtn, active && styles.roleActive]} onPress={() => set("role", r.key)} testID={`staff-role-${r.key}`}>
                  <Text style={[styles.roleTxt, active && { color: colors.onBrandPrimary }]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextField label="Jabatan" value={form.position} onChangeText={(t) => set("position", t)} placeholder="Contoh: Kasir, Kepala Gudang" testID="staff-position" />
          <TextField label="Gaji (Rp)" value={form.salary} onChangeText={(t) => set("salary", t.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="0" testID="staff-salary" />
        </Card>

        <Card style={{ gap: 12 }}>
          <Text style={styles.section}>Data Pribadi</Text>
          <TextField label="No. Telepon" value={form.phone} onChangeText={(t) => set("phone", t)} keyboardType="phone-pad" placeholder="08xxxx" testID="staff-phone" />
          <TextField label="Email" value={form.email} onChangeText={(t) => set("email", t)} autoCapitalize="none" keyboardType="email-address" placeholder="email@contoh.com" testID="staff-email" />
          <TextField label="Alamat" value={form.address} onChangeText={(t) => set("address", t)} placeholder="Alamat lengkap" testID="staff-address" />
          <TextField label="No. KTP" value={form.ktp} onChangeText={(t) => set("ktp", t)} keyboardType="number-pad" placeholder="NIK" testID="staff-ktp" />
          <TextField label="Surat Kontrak" value={form.contract} onChangeText={(t) => set("contract", t)} placeholder="No/keterangan kontrak" testID="staff-contract" />
          <TextField label="Mulai Kerja / Lama Kerja" value={form.join_date} onChangeText={(t) => set("join_date", t)} placeholder="Contoh: 2023-01 / 2 tahun" testID="staff-join" />
        </Card>

        <Button title={isEdit ? "Simpan Perubahan" : "Buat Akun"} onPress={save} loading={saving} testID="staff-save" />

        {isEdit && (
          <Card style={{ gap: 12 }}>
            <Text style={styles.section}>Keamanan Akun</Text>
            <TextField label="Reset Password Baru" value={newPw} onChangeText={setNewPw} placeholder="Password baru" testID="staff-reset-input" />
            <Button title="Reset Password & Buka Blokir" variant="secondary" onPress={resetPassword} testID="staff-reset-btn" icon={<LockKeyOpen size={18} color={colors.onSurface} />} />
            {existing?.locked && <Button title="Buka Blokir Akun" variant="outline" onPress={unblock} testID="staff-unblock-btn" />}
            <Button title="Nonaktifkan Pegawai" variant="danger" onPress={deactivate} testID="staff-delete-btn" icon={<Trash size={18} color={colors.onError} />} />
          </Card>
        )}
      </KeyboardAwareScrollView>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  section: { fontSize: 15, fontWeight: "800", color: c.onSurface },
  label: { fontSize: 13, fontWeight: "600", color: c.onSurfaceTertiary },
  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border },
  roleActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  roleTxt: { fontSize: 13, fontWeight: "700", color: c.onSurface },
}));
