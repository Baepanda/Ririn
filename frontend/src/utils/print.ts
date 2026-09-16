import * as Print from "expo-print";
import QRCode from "qrcode";
import { formatIDR } from "@/src/components/ui";

const STORE = {
  name: "TOKO GLOBAL MAS",
  phone: "+123 456 7890",
  address: "Jl. Tewah",
};

const PAYMENT_LABEL: Record<string, string> = {
  tunai: "Tunai",
  transfer: "Transfer",
  debit: "Debit",
  kredit: "Kredit",
};

// ---- Terbilang (Indonesian number to words) ----
const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
function toWords(n: number): string {
  n = Math.floor(n);
  if (n < 12) return SATUAN[n];
  if (n < 20) return toWords(n - 10) + " belas";
  if (n < 100) return toWords(Math.floor(n / 10)) + " puluh" + (n % 10 ? " " + toWords(n % 10) : "");
  if (n < 200) return "seratus" + (n % 100 ? " " + toWords(n % 100) : "");
  if (n < 1000) return toWords(Math.floor(n / 100)) + " ratus" + (n % 100 ? " " + toWords(n % 100) : "");
  if (n < 2000) return "seribu" + (n % 1000 ? " " + toWords(n % 1000) : "");
  if (n < 1000000) return toWords(Math.floor(n / 1000)) + " ribu" + (n % 1000 ? " " + toWords(n % 1000) : "");
  if (n < 1000000000) return toWords(Math.floor(n / 1000000)) + " juta" + (n % 1000000 ? " " + toWords(n % 1000000) : "");
  return toWords(Math.floor(n / 1000000000)) + " miliar" + (n % 1000000000 ? " " + toWords(n % 1000000000) : "");
}
export function terbilang(n: number): string {
  if (!n || n <= 0) return "nol rupiah";
  const w = toWords(n).replace(/\s+/g, " ").trim();
  return w.charAt(0).toUpperCase() + w.slice(1) + " rupiah";
}

function notaHtml(sale: any, qrDataUrl: string): string {
  const rows = (sale.lines || [])
    .map(
      (l: any, i: number) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${l.name}${l.karat ? " (" + l.karat + ")" : ""}<br/><span class="muted">${l.qr_code}</span></td>
        <td class="c">${l.weight_gram ? l.weight_gram + " gr" : "-"}</td>
        <td class="r">${formatIDR(l.sell_price)}</td>
      </tr>`,
    )
    .join("");
  // pad to keep table body tall like the paper form
  let pad = "";
  for (let k = (sale.lines?.length || 0); k < 5; k++) {
    pad += `<tr><td class="c">${k + 1}</td><td>&nbsp;</td><td></td><td></td></tr>`;
  }
  return `
  <div class="page">
    <div class="title">NOTA PENJUALAN</div>
    <div class="topbar">
      <div class="col">
        <div class="line"><span class="lbl">Nama</span>: ${sale.customer || "-"}</div>
        <div class="line"><span class="lbl">Nomor Telepon</span>: ${sale.customer_phone || "-"}</div>
        <div class="line"><span class="lbl">Alamat</span>: ${sale.customer_address || "-"}</div>
      </div>
      <div class="col">
        <div class="line"><span class="lbl2">Nomor Nota</span>: <b>${sale.receipt_no || "-"}</b></div>
        <div class="line"><span class="lbl2">Metode Pembayaran</span>: ${PAYMENT_LABEL[sale.payment_method] || sale.payment_method || "-"}</div>
        <div class="line"><span class="lbl2">Nomor Transaksi</span>: ${sale.transaction_number || "-"}</div>
        <div class="line"><span class="lbl2">Sales</span>: ${sale.created_by_name || "-"}</div>
      </div>
      <div class="qr"><img src="${qrDataUrl}" /></div>
    </div>
    <table class="items">
      <thead><tr><th class="c">NO</th><th>BARANG</th><th class="c">Berat (Kg/Gr)</th><th class="r">TOTAL</th></tr></thead>
      <tbody>${rows}${pad}</tbody>
    </table>
    <table class="totals">
      <tr>
        <td class="terbilang"><b>Terbilang :</b> ${terbilang(sale.total_sell)}</td>
        <td class="tlabel"><b>TOTAL</b></td>
        <td class="tval"><b>${formatIDR(sale.total_sell)}</b></td>
      </tr>
    </table>
    <div class="bottom">
      <div class="perhatian">
        <b>Perhatian !</b>
        <ol>
          <li>Barang yang dimaksud di dalam nota ini adalah berupa Perhiasan, Logam Mulia dan/atau jenis Logam lainnya.</li>
          <li>Barang yang telah dibeli/dijual tidak dapat dikembalikan.</li>
          <li>Barang yang kami beli/jual harus disertai data identitas pribadi penjual/pembeli seperti KTP/SIM/Lainnya.</li>
          <li>Bahwa kami (pihak ${STORE.name}) tidak bertanggung jawab dan tidak terlibat baik secara hukum pidana maupun hukum perdata apabila dikemudian hari diketahui dan/atau terbukti barang tersebut merupakan hasil tindak pidana atau dalam sengketa.</li>
          <li>Bahwa kami (pihak ${STORE.name}) berhak menerima ganti kerugian apabila dikemudian hari barang tersebut menimbulkan permasalahan dan/atau diperoleh dengan cara yang bertentangan dengan ketentuan hukum yang berlaku.</li>
        </ol>
        <div class="warn">BILA DIJUAL KEMBALI SURAT HARAP DIBAWA</div>
      </div>
      <div class="sign">
        <div>Hormat Kami,</div>
        <div class="sigline"></div>
        <div>Penjual/Pembeli</div>
      </div>
    </div>
    <div class="footer"><span>&#9742; ${STORE.phone}</span><span>&#9679;</span><span>&#128205; ${STORE.address}</span></div>
  </div>`;
}

export async function printReceipt(sale: any) {
  const qr = await QRCode.toDataURL(sale.receipt_no || "GOLDEN", { margin: 0, width: 160 });
  const one = notaHtml(sale, qr);
  // Auto-print two copies (customer + store)
  const html = `
  <html><head><meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    * { font-family: -apple-system, Helvetica, Arial, sans-serif; box-sizing: border-box; color:#111; }
    body { margin:0; }
    .page { padding: 18px 20px 8px; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .title { text-align:right; font-size: 34px; font-weight: 900; letter-spacing: -1px; }
    .topbar { display:flex; gap:14px; margin-top: 6px; }
    .topbar .col { flex:1; font-size: 12px; }
    .topbar .line { margin: 3px 0; }
    .lbl { display:inline-block; width: 96px; font-weight:600; }
    .lbl2 { display:inline-block; width: 130px; font-weight:600; }
    .qr { width: 92px; }
    .qr img { width: 88px; height: 88px; border-radius: 12px; }
    table.items { width:100%; border-collapse: collapse; margin-top: 12px; }
    table.items th, table.items td { border: 1px solid #111; padding: 6px 8px; font-size: 12px; vertical-align: top; }
    table.items th { font-weight: 800; }
    .c { text-align:center; } .r { text-align:right; white-space:nowrap; }
    .muted { color:#666; font-size: 10px; }
    table.totals { width:100%; border-collapse: collapse; }
    table.totals td { border: 1px solid #111; border-top: none; padding: 8px; font-size: 12px; }
    .terbilang { width: 60%; }
    .tlabel { text-align:center; width: 12%; }
    .tval { text-align:right; }
    .bottom { display:flex; gap:16px; margin-top: 14px; }
    .perhatian { flex: 1.6; font-size: 11px; }
    .perhatian ol { margin: 6px 0; padding-left: 18px; }
    .perhatian li { margin-bottom: 4px; line-height: 1.35; }
    .warn { font-weight: 800; margin-top: 6px; }
    .sign { flex: 1; text-align:center; font-weight:700; font-size:12px; padding-top: 4px; }
    .sigline { height: 46px; border-bottom: 1px solid #111; margin: 8px 8px; }
    .footer { display:flex; justify-content:center; gap:24px; margin-top: 16px; padding-top: 10px; border-top: 1px solid #111; font-size: 12px; font-weight:600; }
  </style></head>
  <body>${one}${one}</body></html>`;
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
