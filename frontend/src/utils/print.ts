import { Platform } from "react-native";
import * as Print from "expo-print";
import QRCode from "qrcode";
import { formatIDR } from "@/src/components/ui";

const PAYMENT_LABEL: Record<string, string> = {
  tunai: "Tunai",
  transfer: "Transfer",
  debit: "Debit",
  kredit: "Kredit",
};

export async function printReceipt(sale: any) {
  const rows = (sale.lines || [])
    .map(
      (l: any) => `
      <tr>
        <td>${l.name}${l.karat ? " • " + l.karat : ""}${l.weight_gram ? " • " + l.weight_gram + "gr" : ""}<br/><span class="muted">${l.qr_code}</span></td>
        <td class="right">${formatIDR(l.sell_price)}</td>
      </tr>`,
    )
    .join("");
  const html = `
  <html><head><meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    * { font-family: -apple-system, Helvetica, Arial, sans-serif; }
    body { padding: 16px; color: #1A1A1A; }
    h1 { font-size: 22px; letter-spacing: 2px; margin: 0; text-align:center; }
    .sub { text-align:center; color:#8E8E93; font-size:12px; margin-bottom:12px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 8px 0; border-bottom: 1px dashed #E5E5EA; font-size: 13px; vertical-align: top; }
    .right { text-align: right; white-space: nowrap; }
    .muted { color:#8E8E93; font-size:11px; }
    .total td { border-top: 2px solid #1A1A1A; border-bottom: none; font-weight: 800; font-size: 15px; padding-top: 10px; }
    .meta { font-size: 12px; color:#1A1A1A; margin: 4px 0; }
    .box { background:#F9F3D9; border-radius:8px; padding:10px; margin-top:12px; font-size:12px; }
  </style></head>
  <body>
    <h1>GOLDEN</h1>
    <div class="sub">Toko Perhiasan Emas</div>
    <div class="meta"><b>No:</b> ${sale.receipt_no || "-"}</div>
    <div class="meta"><b>Tanggal:</b> ${new Date(sale.completed_at || sale.created_at).toLocaleString("id-ID")}</div>
    <div class="meta"><b>Kasir:</b> ${sale.created_by_name || "-"}</div>
    ${sale.customer ? `<div class="meta"><b>Pelanggan:</b> ${sale.customer}</div>` : ""}
    <table>
      ${rows}
      <tr class="total"><td>TOTAL</td><td class="right">${formatIDR(sale.total_sell)}</td></tr>
    </table>
    <div class="box">
      <div><b>Pembayaran:</b> ${PAYMENT_LABEL[sale.payment_method] || sale.payment_method || "-"}</div>
      ${sale.transaction_number ? `<div><b>No. Transaksi:</b> ${sale.transaction_number}</div>` : ""}
    </div>
    <p style="text-align:center;color:#8E8E93;font-size:11px;margin-top:20px;">Terima kasih atas kepercayaan Anda</p>
  </body></html>`;
  await Print.printAsync({ html });
}

export async function printQrLabels(items: any[]) {
  const cells = await Promise.all(
    items.map(async (it) => {
      const dataUrl = await QRCode.toDataURL(it.qr_code, { margin: 0, width: 120 });
      return `
      <div class="label">
        <img src="${dataUrl}" />
        <div class="code">${it.qr_code}</div>
      </div>`;
    }),
  );
  const html = `
  <html><head><meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    * { font-family: -apple-system, Helvetica, Arial, sans-serif; }
    body { padding: 8px; }
    .grid { display:flex; flex-wrap:wrap; gap:6px; }
    .label { width: 1cm; text-align:center; page-break-inside: avoid; }
    .label img { width: 0.8cm; height: 0.8cm; }
    .code { font-size: 4px; letter-spacing: 0.2px; }
  </style></head>
  <body><div class="grid">${cells.join("")}</div></body></html>`;
  await Print.printAsync({ html });
}
