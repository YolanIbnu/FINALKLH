// Tipe dasar untuk User Profile
export interface User {
  id: string;           // Primary Key dari tabel 'profiles'
  user_id?: string;      // Foreign Key ke tabel 'auth.users' (UUID)
  name: string;
  full_name?: string;    // Ditambahkan untuk konsistensi
  password?: string;     // Sebaiknya tidak disimpan di state client
  role: "Admin" | "TU" | "Koordinator" | "Staff";
}

// 🔥 PERBAIKAN: Menambahkan 'forwarded-to-coordinator' dan 'returned'
export type ReportStatus = "draft" | "forwarded-to-coordinator" | "in-progress" | "completed" | "revision-required" | "returned";

// Tipe untuk lampiran file
export interface FileAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  uploadedBy: string;
  type?: "original" | "response" | "revision";
}

// Tipe untuk penugasan
export interface TaskAssignment {
  id: string;
  staffName: string;
  todoList: string[];
  completedTasks: string[];
  progress: number;
  originalFiles: FileAttachment[];
  assignments: TaskAssignment[];
  workflow_history: Array<{
    id: string;
    action: string;
    notes?: string;
    user: string;
    timestamp: string;
    status: string;
  }>;
}

// Tipe untuk Report
export interface Report {
  id: string;
  no_surat: string;
  hal: string;
  layanan: string;
  sub_layanan?: string;
  created_by: string;
  created_at: string;
  status: ReportStatus;
  link_documents?: string;
  task_assignments?: TaskAssignment[];
  document_verification?: Record<string, string>;
  current_holder?: string;
}

// --- MODIFIKASI: Daftar Layanan Utama ---
// Ini sekarang adalah daftar KATEGORI layanan utama
export const SERVICES = [
  "Administrasi Kepegawaian",
  "Pengelolaan Jabatan Fungsional",
  "Perencanaan dan pengembangan SDM",
  "Organisasi dan Tata Laksana",
  "Non Layanan"
]

// --- TAMBAHAN: Peta Sub-Layanan ---
// Objek ini memetakan Kategori Utama ke daftar Detail Layanannya
export const SUB_SERVICES_MAP: { [key: string]: string[] } = {
  "Administrasi Kepegawaian": [
    "Layanan Perpanjangan Hubungan Kerja PPPK",
    "Layanan Pemutusan Hubungan Kerja PPPK",
    "Layanan Peninjauan Masa Kerja PNS",
    "Layanan Pengangkatan PNS",
    "Layanan Pemensiunan dan Pemberhentian PNS",
    "Layanan Penerbitan SK Tugas Belajar",
    "Layanan Kenaikan Pangkat",
    "Layanan Perpindahan Kelas Jabatan Pelaksana",
    "Layanan Pencantuman Gelar",
    "Layanan Mutasi/Alih Tugas Lingkup KLH/BPLH",
    "Layanan Penugasan PNS pada Instansi Pemerintah dan di Luar Instansi",
    "Layanan Izin untuk Melakukan Perceraian PNS",
    "Layanan Fasilitasi Penganugerahan Tanda Kehormatan oleh Presiden",
    "Layanan Cuti di Luar Tanggungan Negara (CLTN)",
    "Layanan Kartu Istri/Kartu Suami",
    "Layanan Permintaan Data Kepegawaian SIMPEG",
    "Layanan Ralat Nama/NIP pada Aplikasi SIMPEG/SIASN",
    "Layanan Pelatihan Kepemimpinan",
    "Layanan Pengelolaan LHKPN",
    "Layanan Perpindahan Jabatan",
    "Layanan Permohonan Pengambilan Sumpah PNS untuk Koordinator UPT"
  ],
  "Pengelolaan Jabatan Fungsional": [
    "Layanan Uji Kompetensi dan Perpindahan Jabatan Fungsional",
    "Layanan Penerbitan Rekomendasi Jabatan Fungsional Binaan KLH/BPLH",
    "Layanan Kenaikan Jenjang Jabatan Fungsional",
    "Layanan Pengangkatan Kembali ke dalam Jabatan Fungsional",
    "Layanan Pemberhentian Jabatan Fungsional",
    "Layanan Pelantikan Jabatan Fungsional"
  ],
  "Perencanaan dan pengembangan SDM": [
    "Layanan Sosialisasi Kebijakan Bidang SDM dan Organisasi",
    "Penerimaan CPNS"
  ],
  "Organisasi dan Tata Laksana": [
    "Proses Bisnis",
    "SOTK",
    "NSPK"
  ],
};
// --- AKHIR MODIFIKASI ---


export const COORDINATORS = ["Suwarti", "Achmad Evianto", "Adi Sulaksono", "Yosi Yosandi"]

export const STAFF_MEMBERS = [
  "Roza Erlinda",
  "Rita Juwita",
  "Fanni Arlina Sutia",
  "Hendi Inda Karnia",
  "Ainaya Oktaviyanti",
  "Fajar Aris K",
  "Arum Kusuma D",
  "Andryansyah",
  "Ersha R",
  "Ardani Hasan",
  "Wahyudin",
  "Fanny Febrianto",
  "Nina Romapurnama sari",
  "M. Arif Wijayanto",
  "Laili Fadilah",
  "M. Faris",
  "Cindy Kirana M",
  "Daniaty Roulina S",
  "Mutia Sezia Nur A",
  "Sigit ES Teget",
  "Siti Maesaroh",
  "Ari Kurnia Wati",
  "Salzabila Buana",
  "Dede Winarta Putra",
]

export const TODO_ITEMS = [
  "Jadwalkan/Agendakan",
  "Bahas dengan saya",
  "Untuk ditindaklanjuti",
  "Untuk diketahui",
  "Siapkan Bahan",
  "Siapkan Jawaban",
  "Diskusikan dengan saya",
  "Hadir Mewakili",
  "Copy Untuk saya",
  "Arsip/File",
]

// Konstanta DOCUMENT_REQUIREMENTS Anda tetap sama (tidak ditampilkan di sini agar ringkas)
export const DOCUMENT_REQUIREMENTS: { [key: string]: string[] } = {
  'Layanan Perpanjangan Hubungan Kerja PPPK': [
    'SK PPPK', 'Perjanjian Kerja PPPK', 'SKP 1 tahun terakhir', 'Surat Pertimbangan Perpanjangan dari Unit Kerja'
  ],
  'Layanan Pemutusan Hubungan Kerja PPPK': [
    'SK Pengangkatan PPPK', 'Perjanjian Kerja PPPK', 'SKP 1 tahun terakhir', 'Surat pernyataan (disiplin & pidana)', 'Dokumen tambahan sesuai alasan'
  ],
  'Layanan Peninjauan Masa Kerja PNS': [
    'Surat usul Kabag TU/KSBTU', 'SK CPNS', 'SK PNS', 'SK Pangkat terakhir', 'SK kontrak/angkat', 'paklaring', 'Slip gaji/pengalaman kerja', 'Ijazah saat melamar'
  ],
  'Layanan Pengangkatan PNS': [
    'SK CPNS', 'SK PNS', 'SK Pangkat terakhir', 'Ijazah & transkrip', 'DRH', 'Rekomendasi teknis'
  ],
  'Layanan Pemensiunan dan Pemberhentian PNS': [
    'SK CPNS', 'SK PNS', 'SK Pangkat terakhir', 'SKP terakhir', 'Surat permohonan & persetujuan atasan', 'Dokumen pensiun (format BKN)', 'Surat bebas tanggungan'
  ],
  'Layanan Penerbitan SK Tugas Belajar': [
    'Surat usulan', 'SK CPNS', 'SK PNS', 'SK Pangkat & Jabatan terakhir', 'SKP 2 tahun terakhir', 'Ijazah & transkrip', 'akreditasi prodi', 'Surat penerimaan kampus/sponsor', 'perjanjian belajar'
  ],
  'Layanan Kenaikan Pangkat': [
    'Surat usul unit', 'SK CPNS', 'SK PNS', 'SK Pangkat terakhir', 'SKP 2 tahun terakhir', 'Ijazah (untuk penyesuaian)', 'Daftar riwayat hidup', 'Dokumen sesuai jenis KP'
  ],
  'Layanan Uji Kompetensi dan Perpindahan Jabatan Fungsional': [
    'Surat usulan unit kerja', 'Daftar riwayat pekerjaan', 'Penilaian kinerja', 'Sertifikat kompetensi'
  ],
  'Layanan Penerbitan Rekomendasi Jabatan Fungsional Binaan KLH/BPLH': [
    'Surat usulan', 'SK terakhir', 'Bukti pengalaman kerja', 'Dokumen kompetensi'
  ],
  'Layanan Kenaikan Jenjang Jabatan Fungsional': [
    'Surat usulan', 'SK jabatan & pangkat terakhir', 'PAK'
  ],
  'Layanan Pengangkatan Kembali ke dalam Jabatan Fungsional': [
    'Surat permohonan', 'SK jabatan sebelumnya', 'Bukti pengalaman', 'PAK terakhir', 'Rekomendasi teknis'
  ],
  'Layanan Perpindahan Kelas Jabatan Pelaksana': [
    'Surat usulan unit', 'SK Pangkat & Jabatan terakhir', 'SKP 2 tahun terakhir', 'Ijazah & transkrip', 'Matriks usulan'
  ],
  'Layanan Pencantuman Gelar': [
    'Surat permohonan', 'SK CPNS', 'SK PNS', 'SK Pangkat terakhir', 'Ijazah & transkrip', 'akreditasi prodi', 'SK izin belajar/tugas belajar', 'SK penempatan kembali'
  ],
  'Layanan Mutasi/Alih Tugas Lingkup KLH/BPLH': [
    'Surat usul unit', 'SK CPNS', 'SK PNS', 'SK Pangkat & Jabatan terakhir', 'SKP 2 tahun terakhir', 'Surat pernyataan tidak dalam hukuman/tugas belajar', 'Persetujuan instansi asal & tujuan'
  ],
  'Layanan Penugasan PNS pada Instansi Pemerintah dan di Luar Instansi': [
    'Surat usul unit', 'SK Pangkat & Jabatan terakhir', 'Kartu pegawai', 'SKP 1 tahun terakhir', 'Surat persetujuan instansi penerima', 'Surat pernyataan tidak dalam hukuman disiplin'
  ],
  'Layanan Izin untuk Melakukan Perceraian PNS': [
    'Surat permohonan', 'Fotokopi akta nikah', 'Surat rekomendasi (BKKBN/KUA/Pemuka agama)', 'Berita acara pemeriksaan', 'Bukti alasan perceraian', 'Surat pernyataan pembagian gaji'
  ],
  'Layanan Fasilitasi Penganugerahan Tanda Kehormatan oleh Presiden': [
    'Surat usul ke Menteri', 'Daftar riwayat hidup', 'Uraian jasa', 'Publikasi/naskah akademik', 'Rekomendasi unit kerja', 'Dokumen bebas masalah hukum'
  ],
  'Layanan Cuti di Luar Tanggungan Negara (CLTN)': [
    'Surat permohonan CLTN', 'SK CPNS & PNS', 'SK Pangkat & Jabatan terakhir', 'SKP 2 tahun terakhir', 'Surat pengantar Eselon I', 'Surat keterangan alasan CLTN'
  ],
  'Layanan Kartu Istri/Kartu Suami': [
    'Foto pasangan', 'Akte nikah', 'Laporan perkawinan', 'Akte cerai (Jika pernikahan Ke-2)', 'Akta Kematian Pasangan (Jika Menikah Kembali)'
  ],
  'Layanan Permintaan Data Kepegawaian SIMPEG': [
    'Surat permohonan resmi', 'Format & jenis data diminta', 'Maksud & tujuan penggunaan data', 'Pejabat penanggung jawab'
  ],
  'Layanan Ralat Nama/NIP pada Aplikasi SIMPEG/SIASN': [
    'Surat permohonan KSBTU/Bagian TU', 'Soft file ijazah', 'SK CPNS', 'SK PNS', 'SK Pangkat terakhir', 'Pertek BKN konversi NIP'
  ],
  'Layanan Pelatihan Kepemimpinan': [
    'Surat usul unit', 'SK Jabatan', 'Surat pemberitahuan Diklat dari LAN', 'Syarat tambahan dari penyelenggara', 'Surat tugas & penunjukan mentor'
  ],
  'Layanan Pengelolaan LHKPN': [
    'Surat permohonan', 'Formulir LHKPN', 'Daftar harta kekayaan', 'Dokumen pendukung'
  ],
  'Layanan Sosialisasi Kebijakan Bidang SDM dan Organisasi': [
    'Surat permintaan sosialisasi dari unit kerja', 'Daftar peserta', 'Jadwal kegiatan'
  ],
  'Layanan Perpindahan Jabatan': [
    'Surat usul unit', 'SK Jabatan terakhir', 'SK Pangkat terakhir', 'PAK', 'Surat pernyataan tidak dalam hukuman disiplin', 'Rekomendasi pejabat pembina'
  ],
  'Layanan Pemberhentian Jabatan Fungsional': [
    'Surat usul pemberhentian', 'SK Jabatan terakhir', 'SK Pangkat terakhir', 'PAK terakhir', 'Pertimbangan teknis dari BKN'
  ],
  'Layanan Permohonan Pengambilan Sumpah PNS untuk Koordinator UPT': [
    'Surat permohonan', 'SK Pengangkatan terakhir', 'Dokumen identitas', 'Surat tugas'
  ],
  'Layanan Pelantikan Jabatan Fungsional': [
    'Surat Usul Pelantikan', 'SK Jabatan Terakhir', 'SK Pangkat Terakhir', 'PAK Terakhir', 'Pertimbangan Teknis Dari BKN'
  ]
};