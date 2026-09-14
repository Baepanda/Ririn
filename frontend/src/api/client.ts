import { Platform } from "react-native";
import { storage } from "@/src/utils/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
const TOKEN_KEY = "golden_token";

export async function getToken(): Promise<string | null> {
  return storage.secureGet(TOKEN_KEY, "");
}
export async function setToken(token: string) {
  await storage.secureSet(TOKEN_KEY, token);
}
export async function clearToken() {
  await storage.secureRemove(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api${path}`, { ...options, headers });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = (data && data.detail) || "Terjadi kesalahan";
    throw new ApiError(typeof detail === "string" ? detail : "Terjadi kesalahan", res.status);
  }
  return data as T;
}

export async function uploadImage(uri: string): Promise<string> {
  const token = await getToken();
  const name = uri.split("/").pop() || `photo_${Date.now()}.jpg`;
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append("file", blob, name);
  } else {
    form.append("file", { uri, name, type: "image/jpeg" } as any);
  }
  const res = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new ApiError("Gagal mengunggah gambar", res.status);
  const data = await res.json();
  return data.path as string;
}

export function fileUrl(path?: string): string | undefined {
  if (!path) return undefined;
  return `${BASE}/api/files/${path}`;
}
