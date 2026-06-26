const PptxGenJS = require("pptxgenjs");
const path = require("path");
const prs = new PptxGenJS();
prs.layout = "LAYOUT_WIDE";
const BG = "0D1B2A", CARD = "1B2A41", AC = "0096C7", AC2 = "48CAE4", GLD = "FFD600", WH = "FFFFFF", GR = "BBBBBB", SUB = "90E0EF";

function cover(d, n) {
  const s = prs.addSlide();
  s.background = { color: BG };
  s.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.06, fill: { color: AC } });
  s.addShape(prs.ShapeType.rect, { x: 0, y: 7.35, w: "100%", h: 0.15, fill: { color: AC } });
  s.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 0.08, h: "100%", fill: { color: AC } });
  s.addShape(prs.ShapeType.rect, { x: 0.3, y: 1.5, w: 0.06, h: 4.5, fill: { color: GLD } });
  if (n === 1) {
    s.addText(d.title, { x: 0.8, y: 0.7, w: 11, h: 0.6, fontSize: 28, color: AC2, bold: true, fontFace: "Segoe UI" });
    const lines = d.subtitle.split("\n");
    lines.forEach((l, i) => {
      s.addText(l, { x: 0.8, y: 1.5 + i * 0.55, w: 11, h: 0.55, fontSize: 26, color: WH, bold: true, fontFace: "Segoe UI" });
    });
    s.addText(d.content.join("\n"), { x: 0.8, y: 3.6, w: 11, h: 3.5, fontSize: 17, color: GR, fontFace: "Segoe UI", lineSpacingMultiple: 1.2 });
  } else {
    s.addText(d.title, { x: 0.8, y: 1.0, w: 11.5, h: 0.8, fontSize: 42, color: GLD, bold: true, fontFace: "Segoe UI", align: "center" });
    s.addText(d.subtitle, { x: 0.8, y: 1.9, w: 11.5, h: 0.5, fontSize: 22, color: AC2, fontFace: "Segoe UI", align: "center" });
    s.addText(d.content.join("\n"), { x: 2, y: 2.8, w: 9, h: 4, fontSize: 19, color: GR, fontFace: "Segoe UI", align: "center", lineSpacingMultiple: 1.3 });
  }
}

function content(d, n) {
  const s = prs.addSlide();
  s.background = { color: BG };
  s.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.06, fill: { color: AC } });
  s.addShape(prs.ShapeType.rect, { x: 0, y: 0.06, w: "100%", h: 0.9, fill: { color: CARD } });
  s.addText(d.title, { x: 0.6, y: 0.12, w: 10.5, h: 0.7, fontSize: 24, color: WH, bold: true, fontFace: "Segoe UI" });
  s.addText(`${n}`, { x: 11.5, y: 0.15, w: 1.5, h: 0.5, fontSize: 16, color: AC2, bold: true, fontFace: "Segoe UI", align: "right" });
  let ct = 1.15;
  if (d.subtitle) {
    s.addText(d.subtitle, { x: 0.6, y: 1.0, w: 11, h: 0.35, fontSize: 15, color: SUB, fontFace: "Segoe UI" });
    ct = 1.45;
  }
  s.addShape(prs.ShapeType.rect, { x: 0.6, y: ct - 0.03, w: 2, h: 0.04, fill: { color: GLD } });
  const textObjs = [];
  d.content.forEach(line => {
    let c = WH, b = false, fs = 15;
    if (/^[■❶❷❸❹]/.test(line)) { c = AC2; b = true; }
    else if (/^[✓→]/.test(line)) { c = GLD; b = true; }
    else if (/^(IDENTIFIKASI|RUMUSAN|BATASAN|TUJUAN|FRONTEND|PEMETAAN|BACKEND|ADMIN|STAFF|MANFAAT|MEKANISME|RESEARCH|Alur|Grade|Rumus|No \|)/.test(line)) { c = AC2; b = true; }
    else if (/^(RQ|T[1-4]:)/.test(line)) { c = SUB; }
    else if (/^    /.test(line)) { c = GR; fs = 14; }
    else if (/^[1-6]\./.test(line)) { b = true; }
    else if (line === "") { fs = 6; }
    textObjs.push({ text: line + "\n", options: { color: c, bold: b, fontSize: fs, fontFace: "Segoe UI" } });
  });
  s.addText(textObjs, { x: 0.6, y: ct + 0.1, w: 12, h: 6.0 - ct, valign: "top", lineSpacingMultiple: 1.15 });
  s.addShape(prs.ShapeType.rect, { x: 0, y: 7.35, w: "100%", h: 0.15, fill: { color: CARD } });
  s.addText("SIPETA TPK — Seminar Proposal — Yolan Ibnu Prasetya", { x: 0.5, y: 7.33, w: 8, h: 0.17, fontSize: 8, color: GR, fontFace: "Segoe UI" });
}

const SLIDES = [
  { layout: "cover", title: "SEMINAR PROPOSAL SKRIPSI", subtitle: "Rancang Bangun Website Sistem Informasi Geografis (SIG)\nInventarisasi dan Pemetaan Stok Kayu Jati di TPK Cabak\nBerbasis Metode Web Development Life Cycle (WDLC)", content: ["Disusun Oleh:", "Yolan Ibnu Prasetya — 1222002009", "", "Dosen Pembimbing:", "Zakiul Fahmi Jailani, S.Kom.", "", "PROGRAM STUDI SISTEM INFORMASI", "FAKULTAS TEKNIK DAN ILMU KOMPUTER", "UNIVERSITAS BAKRIE — 2026"] },
  { layout: "c", title: "OUTLINE PRESENTASI", subtitle: "", content: ["1. Latar Belakang Masalah", "2. Identifikasi & Rumusan Masalah", "3. Batasan & Tujuan Penelitian", "4. Landasan Teori: SIG & WebGIS", "5. Landasan Teori: Tech Stack", "6. Penelitian Terdahulu & Research Gap", "7. Metodologi: Pengumpulan Data", "8. Metodologi: 6 Tahap WDLC", "9. Rancangan Sistem: Fitur & Peran", "10. Profil Objek Penelitian", "11. Struktur Organisasi TPK Cabak", "12. Rencana Pengujian: SUS", "13. Manfaat & Kesimpulan", "14. Penutup"] },
  { layout: "c", title: "LATAR BELAKANG MASALAH", subtitle: "", content: ["■ TPK Cabak, Kec. Jiken, Kab. Blora — area 9,7 Ha, 15 blok kaveling (A–I)", "■ Kayu jati dengan 3 klasifikasi grade: AI, AII, AIII", "", "4 Permasalahan Utama:", "❶ Pencatatan stok masih MANUAL (buku besar & spreadsheet)", "    → Rentan human error, duplikasi, dan manipulasi data", "❷ Tidak ada PETA DIGITAL kaveling", "    → Petugas kesulitan menemukan tumpukan kayu di area 9,7 Ha", "❸ LAG INFORMASI antara lapangan & manajemen", "    → Data yang diterima Kepala TPK bisa sudah kadaluarsa", "❹ Keterbatasan SISHK (Sistem Informasi Hasil Kayu Perhutani)", "    → Hanya tabular, tidak ada fitur peta/pelacakan spasial"] },
  { layout: "c", title: "IDENTIFIKASI & RUMUSAN MASALAH", subtitle: "", content: ["IDENTIFIKASI MASALAH:", "1. Pencatatan inventaris stok kayu masih manual → rentan kesalahan", "2. Ketiadaan visualisasi peta digital terintegrasi dengan data inventaris", "3. Lag informasi antara kondisi riil lapangan & data manajemen", "", "RUMUSAN MASALAH (Research Questions):", "RQ1: Bagaimana merancang & membangun Website SIG menggunakan WDLC?", "RQ2: Bagaimana memvisualisasikan letak & status kaveling pada peta interaktif?", "RQ3: Bagaimana merancang pembagian hak akses (role) pengguna?", "RQ4: Bagaimana tingkat usability sistem yang dibangun (diukur SUS)?"] },
  { layout: "c", title: "BATASAN & TUJUAN PENELITIAN", subtitle: "", content: ["BATASAN MASALAH:", "1. Objek: TPK Cabak, Kec. Jiken, Kab. Blora (kayu jati)", "2. Frontend: Next.js + React.js", "3. Pemetaan: Leaflet.js (marker & polygon GeoJSON)", "4. Database: Supabase (PostgreSQL) + Realtime WebSocket", "5. Scope: Inventarisasi & pemetaan (bukan transaksi keuangan)", "", "TUJUAN PENELITIAN:", "T1: Merancang & membangun Website SIG menggunakan WDLC", "T2: Memvisualisasikan letak & status kaveling pada peta interaktif", "T3: Merancang pembagian hak akses Admin dan Staff", "T4: Mengukur tingkat usability sistem menggunakan SUS"] },
  { layout: "c", title: "LANDASAN TEORI: KONSEP SIG & WebGIS", subtitle: "", content: ["SISTEM INFORMASI GEOGRAFIS (SIG):", "• Kerangka teknologi untuk mengakuisisi, menyimpan, dan memvisualisasikan", "  data bereferensi koordinat spasial (Surachman, 2024)", "• Memadukan data geometri (titik, garis, poligon) dengan atribut deskriptif", "", "WebGIS:", "• Sistem pemetaan interaktif yang diakses via browser web", "• Mengeliminasi kebutuhan instalasi software GIS berat (Ate et al., 2024)", "", "SIPETA TPK = SIG + Inventarisasi dalam satu platform WebGIS", "• Data geometri → batas fisik blok kaveling TPK Cabak", "• Data atribut → stok kayu jati (jenis, grade, volume) per kaveling"] },
  { layout: "c", title: "LANDASAN TEORI: TECH STACK", subtitle: "", content: ["FRONTEND:", "• Next.js — SSR untuk waktu muat cepat (Hanafi et al., 2024)", "• React.js — Komponen UI reaktif & modular", "• TypeScript — Static type-checking untuk keandalan kode", "• Tailwind CSS — Desain responsif di semua perangkat", "", "PEMETAAN:", "• Leaflet.js — Peta interaktif, marker, polygon (Uzlah et al., 2025)", "• GeoJSON — Format standar data spasial", "• QGIS — Digitasi batas kaveling → ekspor GeoJSON", "", "BACKEND & DATABASE:", "• Supabase (BaaS) — Auth, Realtime WebSocket, RLS", "• PostgreSQL — Database enterprise-grade (Nugraha et al., 2026)"] },
  { layout: "c", title: "PENELITIAN TERDAHULU & RESEARCH GAP", subtitle: "", content: ["1. Agustine & Handayani (2025) — Inventaris kayu web → Tidak ada WebGIS", "2. Okyusmarianto et al. (2024) — WebGIS evaluasi lahan → Tidak ada inventaris", "3. Nugraha et al. (2026) — React + Supabase Realtime → Tidak ada SIG/peta", "4. Aprilisa & Aulia (2024) — WDLC efektif → Tidak ada tech modern/WebGIS", "5. Ramadhan et al. (2022) — QGIS pemetaan poligon → Objek statis", "", "RESEARCH GAP:", "Belum ada penelitian yang MENGGABUNGKAN:", "✓ Inventarisasi kayu + WebGIS real-time", "✓ Tech stack modern (Next.js + Supabase)", "✓ Metode WDLC", "→ Penelitian ini MENGISI celah tersebut secara komprehensif"] },
  { layout: "c", title: "METODOLOGI: PENGUMPULAN DATA", subtitle: "Pendekatan: Research and Development (R&D)", content: ["1. OBSERVASI LANGSUNG", "    Kunjungan ke TPK Cabak — mengamati pencatatan stok & tata letak kaveling", "", "2. WAWANCARA SEMI-TERSTRUKTUR", "    Narasumber: Kepala TPK (Bp. Purwanto) & staf lapangan", "    Menggali kebutuhan fungsional & non-fungsional sistem", "", "3. STUDI DOKUMEN", "    Kajian catatan stok manual (buku besar & spreadsheet)", "    Kajian jurnal ilmiah nasional & internasional", "", "■ Bukti: Surat Izin Penelitian No. 151/KPH/CBK/IV/2026"] },
  { layout: "c", title: "METODOLOGI: 6 TAHAP WDLC", subtitle: "Web Development Life Cycle", content: ["1. PLANNING → Ruang lingkup, target pengguna, tech stack", "2. ANALYSIS → Kebutuhan fungsional & non-fungsional", "3. DESIGN → Flowchart, UML, ERD, Wireframe", "4. DEVELOPMENT → Coding: Next.js, Leaflet, Supabase", "5. TESTING → Usability Testing dengan SUS (skor ≥ 68)", "6. DEPLOYMENT → Hosting di Netlify + CD dari GitHub", "", "MEKANISME ITERASI:", "→ Jika skor SUS < 68 → kembali ke tahap Design/Development", "→ Perbaikan dilakukan → Testing diulang", "→ Ini yang membedakan WDLC dari Waterfall tradisional", "", "    (Aprilisa & Aulia, 2024; Asfari, 2024)"] },
  { layout: "c", title: "RANCANGAN SISTEM: FITUR & PERAN PENGGUNA", subtitle: "", content: ["ADMIN (Kepala TPK):", "• Dashboard statistik (total stok & pergerakan kayu)", "• Peta WebGIS interaktif semua blok (A–I)", "• Manajemen inventaris (input, edit, hapus data kayu)", "• Manajemen akun Staff & Unduh laporan (PDF/CSV)", "• Log histori perubahan data dengan timestamp", "", "STAFF (Petugas Lapangan):", "• Peta kaveling real-time (sesuai tugasnya)", "• Input data kayu masuk (jenis, grade, volume)", "• Pencatatan mutasi lokasi antar kaveling", "• Akses dibatasi oleh Row Level Security (RLS)", "", "■ Semua fitur diakses via browser (laptop/smartphone) — real-time via WebSocket"] },
  { layout: "c", title: "PROFIL OBJEK PENELITIAN: TPK CABAK", subtitle: "", content: ["■ Nama: Tempat Penimbunan Kayu (TPK) Cabak", "■ Alamat: Jl. Cabak–Nglobo Km 0,7, Ds. Cabak, Kec. Jiken, Kab. Blora, Jateng", "■ Di bawah: KPH Cepu, Divisi Regional Jateng, Perum Perhutani", "■ Luas area: ± 9,7 hektar, 15 blok kaveling (A–I)", "", "Alur Operasional Kayu:", "1. Kayu masuk dari petak tebangan hutan produksi KPH Cepu", "2. Pengukuran volume kubikasi oleh Penguji", "3. Klasifikasi grade mutu (AI / AII / AIII)", "4. Penomoran dan pelabelan barcode", "5. Pencatatan administrasi di SISHK", "6. Penempatan fisik ke blok kaveling", "7. Distribusi / penjualan kepada konsumen", "", "■ Izin Penelitian: No. 151/KPH/CBK/IV/2026 dari Bp. Purwanto"] },
  { layout: "c", title: "STRUKTUR ORGANISASI TPK CABAK", subtitle: "", content: ["■ Kepala TPK (Bp. Purwanto) ← ADMIN SIPETA", "    ├── Penguji (Bp. Mustamarin & Mautono)", "    ├── Mandor Penyerahan", "    ├── SP TU Keuangan", "    ├── Operator SISHK ← STAFF SIPETA", "    ├── Operator Komputer ← STAFF SIPETA", "    ├── Mandor Penerimaan ← STAFF SIPETA", "    ├── Mandor Barcode ← STAFF SIPETA", "    ├── Mandor AI ← STAFF SIPETA", "    ├── Mandor AII ← STAFF SIPETA", "    ├── Mandor Angkutan", "    └── Penjaga", "", "■ Total Responden SUS: 7 orang (Sampling Jenuh / Sensus)"] },
  { layout: "c", title: "RENCANA PENGUJIAN: SYSTEM USABILITY SCALE (SUS)", subtitle: "", content: ["■ Instrumen: Kuesioner SUS (John Brooke) — 10 pernyataan, skala 1–5", "■ Responden: 7 orang (2 Admin + 5 Staff) — Sampling Jenuh", "", "Rumus SUS per responden:", "    Skor = {(Q1-1)+(5-Q2)+(Q3-1)+(5-Q4)+(Q5-1)+(5-Q6)", "           +(Q7-1)+(5-Q8)+(Q9-1)+(5-Q10)} × 2,5", "", "Grade SUS:", "    84,1–100 → Grade A (Best Imaginable) — Acceptable", "    72,6–78,8 → Grade B (Excellent) — Acceptable", "    62,6–71,0 → Grade C (Good) — Acceptable", "    38,9–62,6 → Grade D (Ok) — Marginal", "", "■ Ambang batas keberhasilan: Skor rata-rata ≥ 68 (Acceptable)"] },
  { layout: "c", title: "MANFAAT PENELITIAN", subtitle: "", content: ["MANFAAT TEORITIS:", "• Memperkaya keilmuan SIG & integrasi inventaris kehutanan dengan pemetaan spasial", "• Referensi akademis: efektivitas Supabase Realtime + WDLC", "• Data empiris SUS pada WebGIS kehutanan Indonesia", "", "MANFAAT PRAKTIS:", "• Bagi TPK Cabak: Mempermudah administrasi, mempercepat pencarian lokasi kayu", "• Bagi Petugas: Pengelolaan data efisien via smartphone, transparansi meningkat", "• Bagi Penulis: Implementasi ilmu perkuliahan & kontribusi digitalisasi kehutanan"] },
  { layout: "c", title: "KESIMPULAN & KONTRIBUSI", subtitle: "", content: ["1. SOLUSI WebGIS TERINTEGRASI", "    → Peta Leaflet.js + inventaris kayu jati real-time, mengisi keterbatasan SISHK", "", "2. TEKNOLOGI WEB MODERN", "    → Next.js + Supabase + Leaflet = cepat, aman, skalabel", "    → Data tersinkron real-time via WebSocket", "", "3. METODE WDLC TERSTRUKTUR", "    → Pengembangan iteratif berbasis kebutuhan pengguna nyata", "", "4. VALIDASI USABILITY EMPIRIS", "    → Pengujian SUS dengan 7 responden sampling jenuh", "    → Memastikan sistem diterima pengguna secara kuantitatif"] },
  { layout: "cover", title: "TERIMA KASIH", subtitle: "Sesi Tanya Jawab", content: ["Yolan Ibnu Prasetya", "1222002009", "", "Program Studi Sistem Informasi", "Fakultas Teknik dan Ilmu Komputer", "Universitas Bakrie", "", "Dosen Pembimbing:", "Zakiul Fahmi Jailani, S.Kom.", "", "Wassalamualaikum Warahmatullahi Wabarakatuh"] },
];

SLIDES.forEach((d, i) => {
  const n = i + 1;
  if (d.layout === "cover") cover(d, n);
  else content(d, n);
  console.log(`  ✓ Slide ${n}: ${d.title}`);
});

const out = path.join("D:\\idm download\\SEMESTER 8 YOLAN\\TA YOLAN\\SKRIPSI ASLI YOLAN", "Seminar_Proposal_SIPETA_TPK.pptx");
prs.writeFile({ fileName: out }).then(() => {
  console.log(`\n✅ PPT berhasil disimpan di:\n   ${out}`);
}).catch(e => console.error("Error:", e));
