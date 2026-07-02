"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useApp } from "../../context/AppContext"
import { SERVICES, SUB_SERVICES_MAP, Report } from "../../types"
import { supabase } from "@/lib/supabaseClient.js"
import { toast } from "../../../lib/toast";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  FileText,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Clock,
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2,
  Send,
  Package,
  Archive,
  Eye,
  X,
  File,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Undo2,
  PieChart as PieChartIcon,
  BarChart3,
  Users
} from "lucide-react"
import { ReportForm } from "../forms/ReportForm"
import { ForwardForm } from "../forms/ForwardForm"

// Jumlah item per halaman
const ITEMS_PER_PAGE = 25;

// Warna untuk donut chart koordinator
const DONUT_COLORS = [
  '#3B82F6', // blue
  '#F97316', // orange
  '#6366F1', // indigo
  '#EAB308', // yellow
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#10B981', // emerald
  '#8B5CF6', // violet
];

// Helper: tentukan triwulan dari bulan
function getTriwulan(month: number): number {
  if (month >= 1 && month <= 3) return 1;
  if (month >= 4 && month <= 6) return 2;
  if (month >= 7 && month <= 9) return 3;
  return 4;
}

// Helper: dapatkan range tanggal triwulan
function getTriwulanDateRange(triwulan: number, year: number): { start: string; end: string } {
  const ranges: Record<number, { start: string; end: string }> = {
    1: { start: `${year}-01-01`, end: `${year}-03-31` },
    2: { start: `${year}-04-01`, end: `${year}-06-30` },
    3: { start: `${year}-07-01`, end: `${year}-09-30` },
    4: { start: `${year}-10-01`, end: `${year}-12-31` },
  };
  return ranges[triwulan];
}

// Tipe data chart koordinator
type CoordinatorChartData = {
  name: string;
  value: number;
  percentage: number;
};

// Tipe data detail per koordinator
type CoordinatorDetail = {
  id: string;
  name: string;
  initial: string;
  color: string;
  totalLaporan: number;
  perluTindakan: number;
  menungguReview: number;
  sedangRevisi: number;
  selesai: number;
};

// Warna avatar koordinator
const COORD_AVATAR_COLORS = [
  'bg-emerald-500', 'bg-pink-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-cyan-500'
];

// Ubah definisi state untuk staffTasks agar menyertakan 'isRevised'
export type StaffTask = {
  id: string;
  staffName: string;
  fileUrl: string | null;
  isRevised: boolean; // Menambahkan penanda revisi
};

export function TUDashboard() {
  const { state, dispatch } = useApp()
  const { reports, users: profiles, currentUser } = state

  // State untuk Tab Navigation
  const [activeTab, setActiveTab] = useState<'laporan' | 'statistik'>('laporan')

  // State untuk Modals/Forms
  const [showReportForm, setShowReportForm] = useState(false)
  const [showForwardForm, setShowForwardForm] = useState(false)
  const [editingReport, setEditingReport] = useState<Report | null>(null)
  const [forwardingReport, setForwardingReport] = useState<Report | null>(null)
  const [viewingReport, setViewingReport] = useState<Report | null>(null);

  // State untuk Filter & Search
  const [searchQuery, setSearchQuery] = useState("")
  const [serviceFilter, setServiceFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  // State UI
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [finalizingId, setFinalizingId] = useState<string | null>(null);
  const [pullingBackId, setPullingBackId] = useState<string | null>(null);
  const [isFileLoading, setIsFileLoading] = useState(false);

  // State Data Detail - Menggunakan tipe StaffTask yang baru
  const [staffTasks, setStaffTasks] = useState<StaffTask[]>([]);
  const [originalAttachments, setOriginalAttachments] = useState<any[]>([]);

  // State Paginasi
  const [currentPage, setCurrentPage] = useState(1);

  // State untuk Triwulan Chart
  const [selectedTriwulan, setSelectedTriwulan] = useState(() => getTriwulan(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [triwulanData, setTriwulanData] = useState<CoordinatorChartData[]>([]);
  const [triwulanTotalReports, setTriwulanTotalReports] = useState(0);
  const [multiCoordinatorCount, setMultiCoordinatorCount] = useState(0);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [coordinatorDetails, setCoordinatorDetails] = useState<CoordinatorDetail[]>([]);

  const statusMap: { [key: string]: string } = {
    'draft': 'Draft',
    'in-progress': 'Dalam Proses',
    'completed': 'Selesai',
    'revision-required': 'Perlu Revisi',
    'pending-approval-tu': 'Review Koordinator Selesai',
    'forwarded-to-coordinator': 'Diteruskan ke Koordinator',
    'returned': 'Dikembalikan'
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'revision-required':
      case 'returned':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'pending-approval-tu':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'forwarded-to-coordinator':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'in-progress':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const allServiceDetails = useMemo(() => {
    const details = Object.values(SUB_SERVICES_MAP).flat();
    return details.sort((a, b) => a.localeCompare(b));
  }, []);

  // Timer untuk waktu
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Logika Fetch Data Detail
  const fetchReportDetails = useCallback(async () => {
    setStaffTasks([]);
    setOriginalAttachments([]);

    if (!viewingReport) return;

    setIsFileLoading(true);
    try {
      // 1. AMBIL FILE LAMPIRAN ASLI (Original Files)
      const { data: filesData } = await supabase
        .from('file_attachments')
        .select('*')
        .eq('report_id', viewingReport.id)
        .order('created_at', { ascending: false });

      if (filesData) {
        setOriginalAttachments(filesData);
      }

      // 2. AMBIL TASK STAFF
      const { data: tasksData } = await supabase
        .from('task_assignments')
        .select('id, staff_id, file_path, revised_file_path')
        .eq('report_id', viewingReport.id)
        .order('created_at', { ascending: false });

      if (tasksData && tasksData.length > 0) {
        const loadedTasks: StaffTask[] = tasksData.map(task => {
          const staffProfile = profiles.find(p => p.id === task.staff_id);
          const staffName = staffProfile?.full_name || staffProfile?.name || "Staff Tidak Dikenali";

          let rawPath = null;
          let targetBucket = '';
          let isRevised = false; // Inisialisasi status revisi

          // Prioritas Revised File Path
          if (task.revised_file_path) {
            rawPath = task.revised_file_path;
            targetBucket = 'revised_documents';
            isRevised = true; // Set true jika menggunakan revised_file_path
          } else if (task.file_path) {
            rawPath = task.file_path;
            targetBucket = 'documents';
            isRevised = true;
          }

          let fileUrl = null;
          if (rawPath) {
            let cleanPath = rawPath.replace('revised_documents/', '').replace('documents/', '');
            if (cleanPath.startsWith('/')) { cleanPath = cleanPath.substring(1); }

            const { data: storageData } = supabase.storage.from(targetBucket).getPublicUrl(cleanPath);
            fileUrl = storageData.publicUrl;
          }

          return { id: task.id, staffName, fileUrl, isRevised }; // Mengembalikan status revisi
        });
        setStaffTasks(loadedTasks);
      }
    } catch (err) {
      console.error("Unexpected error fetching details:", err);
      toast.error("Gagal memuat detail file.");
    } finally {
      setIsFileLoading(false);
    }
  }, [viewingReport, profiles]);

  useEffect(() => {
    fetchReportDetails();
  }, [viewingReport, fetchReportDetails]);
  // --- AKHIR LOGIKA FETCH DATA DETAIL ---

  const handleFinalizeReport = async (report: Report) => {
    if (!report || !currentUser) return;
    if (!window.confirm(`Anda yakin ingin menyelesaikan dan mengarsipkan laporan "${report.hal}"?`)) return;

    setFinalizingId(report.id);
    try {
      const { error: updateError } = await supabase
        .from('reports')
        .update({ status: 'completed', current_holder: null })
        .eq('id', report.id);

      if (updateError) throw updateError;

      await supabase.from('workflow_history').insert({
        report_id: report.id,
        action: 'Laporan diselesaikan oleh TU',
        user_id: (currentUser as any).user_id || currentUser.id,
        status: 'completed',
        notes: 'Laporan telah final dan diarsipkan.'
      });

      toast.success("Laporan telah diselesaikan dan diarsipkan.");
      if (dispatch) dispatch({ type: 'FETCH_REPORTS' });
    } catch (error: any) {
      toast.error("Gagal menyelesaikan laporan: " + error.message);
    } finally {
      setFinalizingId(null);
    }
  };

  // --- HANDLE TARIK KEMBALI (PULL BACK) LAPORAN DARI KOORDINATOR ---
  const handlePullBackReport = async (report: Report, mode: 'draft' | 'delete') => {
    if (!report || !currentUser) return;

    const confirmMsg = mode === 'draft'
      ? `Anda yakin ingin MENARIK KEMBALI laporan "${report.hal}" ke status Draft? Disposisi ke Koordinator akan dibatalkan.`
      : `Anda yakin ingin MENGHAPUS laporan "${report.hal}"? Data disposisi juga akan dihapus. Tindakan ini tidak dapat dibatalkan.`;

    if (!window.confirm(confirmMsg)) return;

    setPullingBackId(report.id);
    try {
      if (mode === 'draft') {
        // 1. Hapus disposisi terkait laporan ini
        await supabase.from('disposisi').delete().eq('report_id', report.id);

        // 2. Update status laporan kembali ke draft
        const { error: updateError } = await supabase
          .from('reports')
          .update({ status: 'draft', current_holder: (currentUser as any).user_id || currentUser.id })
          .eq('id', report.id);

        if (updateError) throw updateError;

        // 3. Catat di workflow_history
        await supabase.from('workflow_history').insert({
          report_id: report.id,
          action: 'Laporan ditarik kembali ke Draft oleh TU',
          user_id: (currentUser as any).user_id || currentUser.id,
          status: 'draft',
          notes: 'Surat yang sudah diteruskan ke Koordinator ditarik kembali untuk diedit ulang.'
        });

        toast.success("Laporan berhasil ditarik kembali ke Draft.");
      } else {
        // Mode hapus: hapus disposisi lalu hapus laporan
        await supabase.from('disposisi').delete().eq('report_id', report.id);
        await supabase.from('workflow_history').delete().eq('report_id', report.id);
        await supabase.from('file_attachments').delete().eq('report_id', report.id);
        await supabase.from('task_assignments').delete().eq('report_id', report.id);

        const { error: deleteError } = await supabase
          .from('reports')
          .delete()
          .eq('id', report.id);

        if (deleteError) throw deleteError;

        toast.success("Laporan berhasil dihapus.");
      }

      if (dispatch) dispatch({ type: 'FETCH_REPORTS' });
    } catch (error: any) {
      console.error("Error pull-back/delete report:", error);
      toast.error("Gagal memproses: " + error.message);
    } finally {
      setPullingBackId(null);
      setOpenActionMenu(null);
    }
  };

  const handleReportSubmit = () => {
    setShowReportForm(false);
    setEditingReport(null);
    // Memicu fetch laporan, yang akan memperbarui filteredReports.length
    if (dispatch) { dispatch({ type: 'FETCH_REPORTS' }); }
  };

  // --- 🔥 PERBAIKAN UTAMA: HANDLE FORWARD MULTIPLE COORDINATORS 🔥 ---
  const handleForwardSubmit = async (formData: { notes: string; coordinatorIds: string[] }) => {
    if (!forwardingReport || !forwardingReport.id) {
      toast.error("Terjadi kesalahan: ID Laporan tidak ditemukan.");
      return;
    }

    try {
      const response = await fetch("/api/reports", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: forwardingReport.id,
          status: "forwarded-to-coordinator",
          action: "Diteruskan ke Koordinator",
          notes: formData.notes,

          // 🔑 MENGIRIM ARRAY ID, BUKAN SINGLE ID
          coordinatorIds: formData.coordinatorIds,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Gagal meneruskan laporan");
      }

      toast.success(`✅ Laporan berhasil diteruskan ke ${formData.coordinatorIds.length} Koordinator`);
      setShowForwardForm(false);
      setForwardingReport(null);
      if (dispatch) dispatch({ type: 'FETCH_REPORTS' });

    } catch (error: any) {
      console.error("Error forwarding report:", error);
      toast.error("❌ Gagal meneruskan laporan: " + error.message);
    }
  }

  const handleEditClick = (report: Report) => {
    setEditingReport(report)
    setShowReportForm(true)
    setOpenActionMenu(null)
  }

  const handleDeleteClick = async (reportId: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus laporan ini?")) {
      try {
        const { error } = await supabase.from("reports").delete().eq("id", reportId)
        if (error) throw error
        toast.success("Laporan berhasil dihapus")
        if (dispatch) dispatch({ type: 'FETCH_REPORTS' })
      } catch (error) {
        console.error("Error deleting report:", error)
        toast.error("Gagal menghapus laporan")
      }
    }
    setOpenActionMenu(null)
  }

  // --- DEFINISI filteredReports MENGGUNAKAN useMemo ---
  const filteredReports = useMemo(() => {
    return reports
      .filter((report) => {
        const matchesSearch =
          report.hal.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.no_surat?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.layanan.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (report.sub_layanan && report.sub_layanan.toLowerCase().includes(searchQuery.toLowerCase()))

        const matchesService = serviceFilter ?
          (report.layanan === serviceFilter || report.sub_layanan === serviceFilter)
          : true;

        const matchesStatus = statusFilter ? report.status === statusFilter : true;

        return matchesSearch && matchesService && matchesStatus;
      })
      // Urutkan dari yang TERLAMA ke TERBARU (ASC)
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [reports, searchQuery, serviceFilter, statusFilter]);

  // Logika Paginasi
  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedReports = filteredReports.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Reset halaman ke 1 saat filter/search berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, serviceFilter, statusFilter]);

  // --- LOGIKA PINDAH KE HALAMAN TERAKHIR SETELAH SUBMIT ---
  useEffect(() => {
    if (!showReportForm && filteredReports.length > 0) {
      const newTotalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
      if (currentPage !== newTotalPages) {
        setCurrentPage(newTotalPages);
      }
    }
  }, [showReportForm, filteredReports.length]);

  // Statistik
  const stats = [
    { label: "Total Laporan", value: reports.length, icon: Layers, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Draft", value: reports.filter((r) => r.status === "draft" || r.status === "pending-approval-tu").length, icon: Clock, color: "text-orange-600", bg: "bg-orange-100" },
    { label: "Diteruskan ke Koordinator", value: reports.filter((r) => r.status === "forwarded-to-coordinator" || r.status === "in-progress" || r.status === "revision-required" || r.status === "returned").length, icon: Send, color: "text-purple-600", bg: "bg-purple-100" },
    { label: "Dalam Proses", value: reports.filter((r) => r.status === "in-progress").length, icon: FileText, color: "text-indigo-600", bg: "bg-indigo-100" },
    { label: "Selesai", value: reports.filter((r) => r.status === "completed").length, icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
  ];

  // --- FETCH DATA TRIWULAN CHART ---
  useEffect(() => {
    const fetchTriwulanData = async () => {
      setIsLoadingChart(true);
      try {
        const { start, end } = getTriwulanDateRange(selectedTriwulan, selectedYear);

        // 1. Ambil laporan di range triwulan ini berdasarkan tanggal_agenda
        const { data: reportsInRange, error: reportsErr } = await supabase
          .from('reports')
          .select('id, tanggal_agenda, status')
          .not('tanggal_agenda', 'is', null)
          .gte('tanggal_agenda', start)
          .lte('tanggal_agenda', end + 'T23:59:59');

        if (reportsErr) throw reportsErr;
        if (!reportsInRange || reportsInRange.length === 0) {
          setTriwulanData([]);
          setTriwulanTotalReports(0);
          setMultiCoordinatorCount(0);
          setCoordinatorDetails([]);
          setIsLoadingChart(false);
          return;
        }

        const reportIds = new Set(reportsInRange.map(r => r.id));
        const reportStatusMap: Record<string, string> = {};
        reportsInRange.forEach(r => { reportStatusMap[r.id] = r.status; });
        setTriwulanTotalReports(reportsInRange.length);

        // 2. Ambil SEMUA disposisi (tanpa .in() yang bisa Bad Request)
        const { data: allDispoData, error: dispoErr } = await supabase
          .from('disposisi')
          .select('report_id, target_user_id');

        if (dispoErr) throw dispoErr;

        // Filter disposisi hanya untuk laporan di triwulan ini
        const dispoData = (allDispoData || []).filter((d: any) => reportIds.has(d.report_id));

        // 3. Ambil profil koordinator
        const { data: coordProfiles, error: coordErr } = await supabase
          .from('profiles')
          .select('id, full_name, name, role')
          .eq('role', 'Koordinator');

        if (coordErr) throw coordErr;

        // 4. Hitung laporan yang dikirim ke lebih dari 1 koordinator
        const reportCoordMap: Record<string, Set<string>> = {};
        dispoData.forEach((d: any) => {
          if (!reportCoordMap[d.report_id]) reportCoordMap[d.report_id] = new Set();
          reportCoordMap[d.report_id].add(d.target_user_id);
        });
        const multiCount = Object.values(reportCoordMap).filter(s => s.size > 1).length;
        setMultiCoordinatorCount(multiCount);

        // 5. Hitung jumlah laporan per koordinator
        const coordCount: Record<string, number> = {};
        dispoData.forEach((d: any) => {
          coordCount[d.target_user_id] = (coordCount[d.target_user_id] || 0) + 1;
        });

        // Tambahkan TU (laporan tanpa disposisi = milik TU)
        const reportsWithDispo = new Set(dispoData.map((d: any) => d.report_id));
        let tuCount = 0;
        reportIds.forEach(id => {
          if (!reportsWithDispo.has(id)) tuCount++;
        });

        // Tambahkan hanya koordinator (tanpa TU)
        const totalDispoCount = Object.values(coordCount).reduce((a, b) => a + b, 0);
        const chartData: CoordinatorChartData[] = [];

        Object.entries(coordCount)
          .sort((a, b) => b[1] - a[1])
          .forEach(([userId, count]) => {
            const profile = (coordProfiles || []).find((p: any) => p.id === userId);
            const name = profile?.full_name || profile?.name || 'Koordinator';
            chartData.push({
              name,
              value: count,
              percentage: totalDispoCount > 0 ? Math.round((count / totalDispoCount) * 100) : 0,
            });
          });

        setTriwulanData(chartData);

        // 7. Build detail per koordinator (seperti di foto)
        // Kelompokkan report_id per koordinator
        const coordReportIds: Record<string, Set<string>> = {};
        dispoData.forEach((d: any) => {
          if (!coordReportIds[d.target_user_id]) coordReportIds[d.target_user_id] = new Set();
          coordReportIds[d.target_user_id].add(d.report_id);
        });

        const details: CoordinatorDetail[] = (coordProfiles || []).map((profile: any, idx: number) => {
          const myReportIds = coordReportIds[profile.id] || new Set<string>();
          const myReports = Array.from(myReportIds).map(rid => reportStatusMap[rid]).filter(Boolean);

          return {
            id: profile.id,
            name: profile.full_name || profile.name || 'Koordinator',
            initial: (profile.full_name || profile.name || 'K').charAt(0).toUpperCase(),
            color: COORD_AVATAR_COLORS[idx % COORD_AVATAR_COLORS.length],
            totalLaporan: myReports.length,
            perluTindakan: myReports.filter(s => s === 'forwarded-to-coordinator').length,
            menungguReview: myReports.filter(s => s === 'pending-approval-koordinator').length,
            sedangRevisi: myReports.filter(s => s === 'revision-required' || s === 'returned').length,
            selesai: myReports.filter(s => s === 'completed' || s === 'pending-approval-tu').length,
          };
        });

        setCoordinatorDetails(details.filter(d => d.totalLaporan > 0 || true)); // show all coordinators
      } catch (err) {
        console.error('Error fetching triwulan data:', err);
        toast.error('Gagal memuat data triwulan.');
      } finally {
        setIsLoadingChart(false);
      }
    };

    fetchTriwulanData();
  }, [selectedTriwulan, selectedYear]);

  return (
    <div className="space-y-8 p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Dashboard Tata Usaha 🏢</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {currentTime.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} | {currentTime.toLocaleTimeString("id-ID")}
          </p>
        </div>
        {activeTab === 'laporan' && (
          <button
            onClick={() => { setShowReportForm(true); setEditingReport(null); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg font-semibold text-sm"
          >
            <Plus className="w-5 h-5" />
            Buat Laporan Baru
          </button>
        )}
      </div>

      {/* Statistik Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 transition-all hover:ring-2 hover:ring-blue-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg} shadow-md`}>
                <stat.icon className={`w-7 h-7 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* === TAB NAVIGATION === */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-1.5 flex gap-1">
        <button
          onClick={() => setActiveTab('laporan')}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === 'laporan'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
        >
          <FileText className="w-4 h-4" />
          Daftar Laporan Masuk
        </button>
        <button
          onClick={() => setActiveTab('statistik')}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === 'statistik'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
        >
          <PieChartIcon className="w-4 h-4" />
          Statistik Koordinator
        </button>
      </div>

      {/* === TAB CONTENT: STATISTIK KOORDINATOR === */}
      {activeTab === 'statistik' && (
        <div className="space-y-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-100 rounded-xl shadow-md">
                    <PieChartIcon className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Distribusi Laporan per Koordinator</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Statistik berdasarkan triwulan dan tahun</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedTriwulan}
                    onChange={(e) => setSelectedTriwulan(Number(e.target.value))}
                    className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm font-medium"
                  >
                    <option value={1}>Triwulan 1 (Jan-Mar)</option>
                    <option value={2}>Triwulan 2 (Apr-Jun)</option>
                    <option value={3}>Triwulan 3 (Jul-Sep)</option>
                    <option value={4}>Triwulan 4 (Okt-Des)</option>
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm font-medium"
                  >
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6">
              {isLoadingChart ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  <span className="ml-3 text-gray-500 font-medium">Memuat data triwulan...</span>
                </div>
              ) : triwulanData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <BarChart3 className="w-14 h-14 mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-500">Tidak Ada Data</p>
                  <p className="text-sm text-gray-400 mt-1">Belum ada laporan di Triwulan {selectedTriwulan} Tahun {selectedYear}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  {/* Donut Chart */}
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={triwulanData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={140}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="#fff"
                          strokeWidth={3}
                          label={({ percentage }) => `${percentage}%`}
                        >
                          {triwulanData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string) => [`${value} Laporan`, name]}
                          contentStyle={{
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                            padding: '10px 16px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-sm text-gray-500 font-medium">Triwulan {selectedTriwulan}</span>
                      <span className="text-lg font-extrabold text-gray-900 uppercase tracking-wide">BIRO SDMO</span>
                    </div>
                  </div>

                  {/* Legend + Summary */}
                  <div className="space-y-5">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Layers className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-600 uppercase">Total Laporan</span>
                        </div>
                        <p className="text-3xl font-extrabold text-gray-900">{triwulanTotalReports}</p>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4 text-orange-600" />
                          <span className="text-xs font-semibold text-orange-600 uppercase">Multi Koordinator</span>
                        </div>
                        <p className="text-3xl font-extrabold text-gray-900">{multiCoordinatorCount}</p>
                        <p className="text-xs text-gray-500 mt-1">ditujukan ke &gt;1 koordinator</p>
                      </div>
                    </div>

                    {/* Coordinator Breakdown */}
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                      <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-indigo-500" /> Rincian per Koordinator
                      </h4>
                      <div className="space-y-3">
                        {triwulanData.map((item, index) => (
                          <div key={item.name} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-full shadow-sm flex-shrink-0"
                                style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                              />
                              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-gray-900">{item.value}</span>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 min-w-[48px] text-center">
                                {item.percentage}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {multiCoordinatorCount > 0 && (
                      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                        <p className="text-sm text-amber-800 font-medium">
                          <span className="font-bold">{multiCoordinatorCount} dari {triwulanTotalReports}</span> laporan ditujukan kepada lebih dari 1 koordinator
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* === DETAIL DASHBOARD PER KOORDINATOR === */}
          {coordinatorDetails.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 rounded-xl shadow-sm">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Dashboard per Koordinator</h2>
                  <p className="text-sm text-gray-500">Detail statistik laporan masing-masing koordinator di Triwulan {selectedTriwulan} Tahun {selectedYear}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {coordinatorDetails.map((coord) => (
                  <div key={coord.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
                    {/* Header Koordinator */}
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">Dashboard Koordinator</h3>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Triwulan {selectedTriwulan}, {selectedYear}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-xs font-semibold text-gray-700">{coord.name}</p>
                          <p className="text-[10px] text-green-600 font-medium flex items-center justify-end gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span> Online
                          </p>
                        </div>
                        <div className={`w-9 h-9 ${coord.color} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                          {coord.initial}
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="p-4 grid grid-cols-3 gap-2">
                      {/* Total Laporan */}
                      <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                        <div className="mx-auto w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <p className="text-xl font-extrabold text-gray-900">{coord.totalLaporan}</p>
                        <p className="text-[10px] text-gray-500 font-medium uppercase mt-1">Total Laporan</p>
                      </div>

                      {/* Perlu Tindakan */}
                      <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100">
                        <div className="mx-auto w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />
                        </div>
                        <p className="text-xl font-extrabold text-gray-900">{coord.perluTindakan}</p>
                        <p className="text-[10px] text-gray-500 font-medium uppercase mt-1">Perlu Tindakan</p>
                      </div>

                      {/* Menunggu Review */}
                      <div className="bg-cyan-50 rounded-xl p-3 text-center border border-cyan-100">
                        <div className="mx-auto w-7 h-7 bg-cyan-100 rounded-lg flex items-center justify-center mb-2">
                          <Eye className="w-3.5 h-3.5 text-cyan-600" />
                        </div>
                        <p className="text-xl font-extrabold text-gray-900">{coord.menungguReview}</p>
                        <p className="text-[10px] text-gray-500 font-medium uppercase mt-1">Menunggu Review</p>
                      </div>

                      {/* Sedang Revisi */}
                      <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100 col-span-1">
                        <div className="mx-auto w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center mb-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        </div>
                        <p className="text-xl font-extrabold text-gray-900">{coord.sedangRevisi}</p>
                        <p className="text-[10px] text-gray-500 font-medium uppercase mt-1">Sedang Revisi</p>
                      </div>

                      {/* Selesai */}
                      <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100 col-span-2">
                        <div className="mx-auto w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                          <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                        </div>
                        <p className="text-xl font-extrabold text-gray-900">{coord.selesai}</p>
                        <p className="text-[10px] text-gray-500 font-medium uppercase mt-1">Selesai</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === TAB CONTENT: DAFTAR LAPORAN === */}
      {activeTab === 'laporan' && (
        <div className="space-y-6">

          {/* Tabel Laporan */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Daftar Laporan Masuk</h2>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Cari No. Surat, Hal, Layanan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="text-gray-400 w-5 h-5 hidden sm:block" />
                  <select
                    value={serviceFilter}
                    onChange={(e) => setServiceFilter(e.target.value)}
                    className="border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                  >
                    <option value="">Semua Layanan</option>
                    {allServiceDetails.map((detail) => (
                      <option key={detail} value={detail}>{detail}</option>
                    ))}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                  >
                    <option value="">Semua Status</option>
                    <option value="draft">Draft</option>
                    <option value="forwarded-to-coordinator">Diteruskan ke Koordinator</option>
                    <option value="in-progress">Dalam Proses</option>
                    <option value="completed">Selesai</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase tracking-wider border-b border-gray-200">
                    <th className="px-6 py-3 w-16 text-center">No</th>
                    <th className="px-6 py-3">Layanan</th>
                    <th className="px-6 py-3">Agenda</th>
                    <th className="px-6 py-3">No. Surat</th>
                    <th className="px-6 py-3">Hal</th>
                    <th className="px-6 py-3">Tgl. Masuk</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedReports.length > 0 ? (
                    paginatedReports.map((report, index) => {
                      const displayLayanan = report.sub_layanan || report.layanan;
                      const isSubLayanan = (report.sub_layanan) && displayLayanan !== report.layanan;
                      const absoluteIndex = startIndex + index + 1;

                      return (
                        <tr key={report.id} className="hover:bg-blue-50 transition-colors group text-sm">
                          <td className="px-6 py-4 text-center text-gray-500 font-medium">{absoluteIndex}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-800">{displayLayanan}</span>
                              {isSubLayanan && <span className="text-xs text-gray-400 mt-0.5">{report.layanan}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 font-medium">{report.no_agenda || "-"}</td>
                          <td className="px-6 py-4 text-gray-600 font-mono">{report.no_surat}</td>
                          <td className="px-6 py-4 text-gray-900 font-medium max-w-xs truncate" title={report.hal}>{report.hal}</td>
                          <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                            {new Date(report.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(report.status)}`}>
                              {statusMap[report.status] || report.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="relative inline-block text-left">
                              <button onClick={() => setOpenActionMenu(openActionMenu === report.id ? null : report.id)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-700">
                                <MoreHorizontal className="w-5 h-5" />
                              </button>
                              {openActionMenu === report.id && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl z-50 border border-gray-100 transform transition-all duration-200 ease-out origin-top-right">
                                  <div className="py-1">
                                    <button onClick={() => { setViewingReport(report); setOpenActionMenu(null); }} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                                      <Eye className="w-4 h-4 mr-3" /> Lihat Detail
                                    </button>
                                    {(report.status === 'draft' || report.status === 'revision-required' || report.status === 'returned') && (
                                      <>
                                        <button onClick={() => handleEditClick(report)} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                                          <Edit className="w-4 h-4 mr-3" /> Edit Laporan
                                        </button>
                                        <button onClick={() => { setForwardingReport(report); setShowForwardForm(true); setOpenActionMenu(null); }} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                                          <Send className="w-4 h-4 mr-3" /> Teruskan ke Koordinator
                                        </button>
                                        <button onClick={() => handleDeleteClick(report.id)} className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100">
                                          <Trash2 className="w-4 h-4 mr-3" /> Hapus Laporan
                                        </button>
                                      </>
                                    )}
                                    {report.status === 'forwarded-to-coordinator' && (
                                      <>
                                        <button
                                          onClick={() => handlePullBackReport(report, 'draft')}
                                          disabled={pullingBackId === report.id}
                                          className="w-full flex items-center px-4 py-2.5 text-sm text-orange-700 hover:bg-orange-50 transition-colors border-t border-gray-100"
                                        >
                                          {pullingBackId === report.id ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <Undo2 className="w-4 h-4 mr-3" />} Tarik Kembali ke Draft
                                        </button>
                                        <button
                                          onClick={() => handlePullBackReport(report, 'delete')}
                                          disabled={pullingBackId === report.id}
                                          className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                          {pullingBackId === report.id ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <Trash2 className="w-4 h-4 mr-3" />} Hapus Laporan
                                        </button>
                                      </>
                                    )}
                                    {report.status === 'pending-approval-tu' && (
                                      <button onClick={() => handleFinalizeReport(report)} disabled={finalizingId === report.id} className="w-full flex items-center px-4 py-2.5 text-sm text-green-700 hover:bg-green-50 transition-colors border-t border-gray-100">
                                        {finalizingId === report.id ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <Archive className="w-4 h-4 mr-3" />} Selesaikan & Arsipkan
                                      </button>
                                    )}
                                    {report.status === 'completed' && (
                                      <button
                                        onClick={() => handleDeleteClick(report.id)}
                                        className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                                      >
                                        <Trash2 className="w-4 h-4 mr-3" /> Hapus Laporan
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <Package className="w-14 h-14 mb-4 text-gray-300" />
                          <p className="text-xl font-medium text-gray-500">Data Laporan Tidak Ditemukan</p>
                          <p className="text-sm text-gray-400 mt-1">Coba ubah kata kunci pencarian atau filter layanan.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Kontrol Paginasi */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Menampilkan {startIndex + 1} sampai {Math.min(startIndex + ITEMS_PER_PAGE, filteredReports.length)} dari {filteredReports.length} laporan
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-semibold text-sm">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Detail Modal (Improved) */}
      {viewingReport && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col transform transition-all duration-300 ease-out scale-100">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-blue-50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Detail Laporan: {viewingReport.hal}</h2>
                  <p className="text-sm text-blue-600 font-mono mt-0.5">Tracking ID: {viewingReport.trackingNumber}</p>
                </div>
              </div>
              <button onClick={() => setViewingReport(null)} className="text-gray-500 hover:text-gray-800 hover:bg-blue-100 p-2 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Kolom 1: Informasi Utama */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                    <h3 className="text-md font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /> Ringkasan Laporan</h3>
                    <div className="space-y-3 text-sm">
                      <DetailItem label="Layanan" value={viewingReport.sub_layanan || viewingReport.layanan} />
                      <DetailItem label="Status" status={viewingReport.status} statusMap={statusMap} getStatusColor={getStatusColor} />
                      <DetailItem label="No. Agenda" value={viewingReport.no_agenda || "-"} />
                      <DetailItem label="No. Surat" value={viewingReport.no_surat} />
                      <DetailItem label="Hal" value={viewingReport.hal} />
                      <DetailItem
                        label="Tgl. Agenda"
                        value={viewingReport.tanggal_agenda ? new Date(viewingReport.tanggal_agenda).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                    <h3 className="text-md font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2"><Layers className="w-4 h-4 text-blue-500" /> Detail Dokumen</h3>
                    <div className="space-y-3 text-sm">
                      <DetailItem label="Dari" value={viewingReport.dari} />
                      <DetailItem label="Tanggal Surat" value={viewingReport.tanggal_surat ? new Date(viewingReport.tanggal_surat).toLocaleDateString('id-ID') : "-"} />
                      <DetailItem label="Tgl. Masuk Sistem" value={new Date(viewingReport.created_at).toLocaleDateString('id-ID')} />
                      <div className="grid grid-cols-2">
                        <div className="text-gray-500">Link Dokumen</div>
                        <div className="font-medium text-blue-600 truncate">
                          {viewingReport.link_documents ? (<a href={viewingReport.link_documents} target="_blank" rel="noopener noreferrer" className="hover:underline">Buka Link</a>) : "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kolom 2 & 3: Lampiran & Hasil Kerja */}
                <div className="lg:col-span-2 space-y-6">
                  {/* File Asli */}
                  <FileSection
                    title="File Lampiran Asli"
                    isLoading={isFileLoading}
                    files={originalAttachments.map(f => ({
                      name: f.file_name || f.fileName,
                      url: f.file_url || f.fileUrl
                    }))}
                    emptyMessage="Tidak ada lampiran asli."
                    icon={File}
                    iconColor="text-blue-500"
                  />

                  {/* Hasil Kerja Staff */}
                  <FileSection
                    title="Output"
                    isLoading={isFileLoading}
                    files={staffTasks.filter(t => t.fileUrl).map(t => ({
                      name: `${t.staffName} (Hasil)`,
                      url: t.fileUrl,
                      isRevised: t.isRevised
                    }))}
                    emptyMessage="Belum ada dokumen hasil/revisi dari staff."
                    icon={FileText}
                    iconColor="text-green-600"
                    bgColor="bg-green-50"
                    borderColor="border-green-100"
                    downloadText="Unduh Hasil"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t flex justify-end">
              <button onClick={() => setViewingReport(null)} className="px-5 py-2 bg-white border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 font-medium text-sm transition-colors shadow-sm">Tutup Detail</button>
            </div>
          </div>
        </div>
      )}

      {showReportForm && <ReportForm report={editingReport} onSubmit={handleReportSubmit} onCancel={() => { setShowReportForm(false); setEditingReport(null); }} />}
      {/* ⚠️ Pastikan ForwardForm menerima profiles untuk list user */}
      {showForwardForm && <ForwardForm report={forwardingReport} profiles={profiles} onSubmit={handleForwardSubmit} onCancel={() => { setShowForwardForm(false); setForwardingReport(null); }} />}
    </div>
  )
}

// Komponen Pembantu untuk Detail
const DetailItem = ({ label, value, status, statusMap, getStatusColor }: { label: string, value?: string, status?: string, statusMap?: any, getStatusColor?: any }) => (
  <div className="grid grid-cols-2 text-sm">
    <div className="text-gray-500">{label}</div>
    {status ? (
      <div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
          {statusMap[status] || status}
        </span>
      </div>
    ) : (
      <div className="font-medium text-gray-900 break-words">{value}</div>
    )}
  </div>
);

// Komponen Pembantu untuk File Section
const FileSection = ({ title, isLoading, files, emptyMessage, icon: Icon, iconColor, bgColor = 'bg-gray-50', borderColor = 'border-gray-100', downloadText = 'Download' }: {
  title: string;
  isLoading: boolean;
  files: { name: string; url: string | null; isRevised?: boolean }[];
  emptyMessage: string;
  icon: any;
  iconColor: string;
  bgColor?: string;
  borderColor?: string;
  downloadText?: string;
}) => (
  <div>
    <h3 className="text-md font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
      <Icon className={`w-4 h-4 ${iconColor}`} /> {title}
    </h3>
    <div className={`${bgColor} rounded-xl p-5 border ${borderColor} min-h-[150px] flex flex-col justify-center`}>
      {isLoading ? (
        <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : files.length > 0 ? (
        <ul className="space-y-3">
          {files.map((file, idx) => (
            <li key={idx} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-white transition-colors">
              <div className="flex items-center gap-3 truncate">
                <Icon className={`w-4 h-4 ${iconColor} flex-shrink-0`} />
                <span className="truncate text-gray-700 font-medium">{file.name}</span>
                {file.isRevised && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200 flex-shrink-0">
                    REVISI
                  </span>
                )}
              </div>
              <a
                href={file.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm ${file.url ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                onClick={(e) => !file.url && e.preventDefault()}
              >
                <Download className="w-3 h-3" /> {file.url ? downloadText : 'N/A'}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <Clock className="w-8 h-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500 italic font-medium">{emptyMessage}</p>
        </div>
      )}
    </div>
  </div>
);