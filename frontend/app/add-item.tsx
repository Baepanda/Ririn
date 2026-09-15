import React, { useState } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Camera, Image as ImageIcon, Printer } from "phosphor-react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { apiFetch, ApiError, uploadImage } from "@/src/api/client";
import { queryClient } from "@/src/query-client";
import { useToast } from "@/src/components/toast";
import { AppHeader, Button, Card, TextField, ScreenContainer, formatIDR } from "@/src/components/ui";
import { ProductImage } from "@/src/components/product-image";
import { printQrLabels } from "@/src/utils/print";

export default function AddItem() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [karat, setKarat] = useState("");
  const [weight, setWeight] = useState("");
  const [cost, setCost] = useState("");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [photoPath, setPhotoPath] = useState("");
  const [localUri, setLocalUri] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleImage = async (fromCamera: boolean) => {
    try {
      let perm;
      if (fromCamera) {
        perm = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
      if (!perm.granted) {
        if (!perm.canAskAgain) {
          toast.show("Izin ditolak. Buka Pengaturan untuk mengaktifkan.", "error");
          Linking.openSettings();
        } else {
          toast.show("Izin diperlukan untuk memilih foto", "error");
        }
        return;
      }
      const res = fromCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
      if (res.canceled || !res.assets?.length) return;
      const uri = res.assets[0].uri;
      setLocalUri(uri);
      setUploading(true);
      const path = await uploadImage(uri);
      setPhotoPath(path);
      toast.show("Foto terunggah", "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Gagal mengunggah foto", "error");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!name.trim() || !cost.trim()) {
      toast.show("Nama dan modal wajib diisi", "error");
      return;
    }
    const quantity = Math.max(1, parseInt(qty || "1", 10));
    setSaving(true);
    try {
      const res = await apiFetch<any>("/items", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim(),
          karat: karat.trim(),
          weight_gram: weight ? parseFloat(weight) : null,
          cost_price: parseInt(cost.replace(/\D/g, ""), 10) || 0,
          quantity,
          photo_path: photoPath,
          note: note.trim(),
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.show(`${res.count} barang ditambah, menunggu ACC Owner`, "success");
      try {
        await printQrLabels(res.items);
      } catch {}
      router.back();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <AppHeader title="Input Barang Masuk" subtitle="QR code otomatis dibuat" back />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 12 }} bottomOffset={24}>
        <Card style={{ alignItems: "center", gap: 12 }}>
          <ProductImage path={photoPath || undefined} style={styles.preview} iconSize={40} />
          {uploading && <Text style={styles.uploading}>Mengunggah...</Text>}
          <View style={styles.photoBtns}>
            <Pressable style={styles.photoBtn} onPress={() => handleImage(false)} testID="pick-gallery">
              <ImageIcon size={18} color={colors.brandPrimary} weight="fill" />
              <Text style={styles.photoBtnTxt}>Galeri</Text>
            </Pressable>
            <Pressable style={styles.photoBtn} onPress={() => handleImage(true)} testID="pick-camera">
              <Camera size={18} color={colors.brandPrimary} weight="fill" />
              <Text style={styles.photoBtnTxt}>Kamera</Text>
            </Pressable>
          </View>
        </Card>

        <Card style={{ gap: 12 }}>
          <TextField label="Nama Barang" value={name} onChangeText={setName} placeholder="Cincin Emas 24K" testID="item-name" />
          <TextField label="Kategori" value={category} onChangeText={setCategory} placeholder="Cincin / Kalung / Gelang" testID="item-category" />
          <View style={styles.two}>
            <View style={{ flex: 1 }}><TextField label="Karat" value={karat} onChangeText={setKarat} placeholder="24K" testID="item-karat" /></View>
            <View style={{ flex: 1 }}><TextField label="Berat (gram)" value={weight} onChangeText={setWeight} placeholder="5.2" keyboardType="decimal-pad" testID="item-weight" /></View>
          </View>
          <TextField label="Harga Modal (Rp)" value={cost} onChangeText={(t) => setCost(t.replace(/\D/g, ""))} placeholder="0" keyboardType="number-pad" testID="item-cost" />
          {cost ? <Text style={styles.hint}>{formatIDR(parseInt(cost, 10))}</Text> : null}
          <TextField label="Jumlah Unit (QR unik per unit)" value={qty} onChangeText={(t) => setQty(t.replace(/\D/g, ""))} placeholder="1" keyboardType="number-pad" testID="item-qty" />
          <TextField label="Catatan (opsional)" value={note} onChangeText={setNote} placeholder="Catatan" testID="item-note" />
        </Card>

        <Button title="Simpan & Cetak QR" onPress={submit} loading={saving} disabled={uploading} testID="item-save" icon={<Printer size={18} color={colors.onBrandPrimary} weight="fill" />} />
      </KeyboardAwareScrollView>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  preview: { width: 120, height: 120, borderRadius: 16 },
  uploading: { fontSize: 12, color: c.brandPrimary, fontWeight: "600" },
  photoBtns: { flexDirection: "row", gap: 10 },
  photoBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.brandTertiary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  photoBtnTxt: { fontSize: 14, fontWeight: "700", color: c.brandPrimary },
  two: { flexDirection: "row", gap: 12 },
  hint: { fontSize: 13, color: c.brandPrimary, fontWeight: "700", marginTop: -4 },
}));
