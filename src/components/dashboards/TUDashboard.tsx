"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useApp } from "../../context/AppContext"
import { SERVICES, SUB_SERVICES_MAP, Report } from "../../types"
import { supabase } from "@/lib/supabaseClient.js"
import { toast } from "../../../lib/toast";
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
  Layers
} from "lucide-react"
import { ReportForm } from "../forms/ReportForm"
import { ForwardForm } from "../forms/ForwardForm"

// Jumlah item per halaman
const ITEMS_PER_PAGE = 25;

export function TUDashboard() {
  const { state, dispatch } = useApp()
  const { reports, users: profiles, currentUser } = state

  // State untuk Modals/Forms
  const [showReportForm, setShowReportForm] = useState(false)
  const [showForwardForm, setShowForwardForm] = useState(false)
  const [editingReport, setEditingReport] = useState<Report | null>(null)
  const [forwardingReport, setForwardingReport] = useState<Report | null>(null)
  const [viewingReport, setViewingReport] = useState<Report | null>(null);

  // State untuk Filter & Search
  const [searchQuery, setSearchQuery] = useState("")
  const [serviceFilter, setServiceFilter] = useState("")

  // State UI
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [finalizingId, setFinalizingId] = useState<string | null>(null);
  const [isFileLoading, setIsFileLoading] = useState(false);

  // State Data Detail
  const [staffTasks, setStaffTasks] = useState<{ id: string, staffName: string, fileUrl: string | null }[]>([]);
  const [originalAttachments, setOriginalAttachments] = useState<any[]>([]);

  // State Paginasi
  const [currentPage, setCurrentPage] = useState(1);

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
        const loadedTasks = tasksData.map(task => {
          const staffProfile = profiles.find(p => p.id === task.staff_id);
          const staffName = staffProfile?.full_name || staffProfile?.name || "Staff Tidak Dikenali";

          let rawPath = null;
          let targetBucket = '';

          // Prioritas Revised File Path
          if (task.revised_file_path) {
            rawPath = task.revised_file_path;
            targetBucket = 'revised_documents';
          } else if (task.file_path) {
            rawPath = task.file_path;
            targetBucket = 'documents';
          }

          let fileUrl = null;
          if (rawPath) {
            let cleanPath = rawPath.replace('revised_documents/', '').replace('documents/', '');
            if (cleanPath.startsWith('/')) { cleanPath = cleanPath.substring(1); }

            const { data: storageData } = supabase.storage.from(targetBucket).getPublicUrl(cleanPath);
            fileUrl = storageData.publicUrl;
          }

          return { id: task.id, staffName, fileUrl };
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

  const handleReportSubmit = () => {
    setShowReportForm(false);
    setEditingReport(null);
    // Memicu fetch laporan, yang akan memperbarui filteredReports.length
    if (dispatch) { dispatch({ type: 'FETCH_REPORTS' }); }
  };

  const handleForwardSubmit = async (formData: any) => {
    if (!forwardingReport || !forwardingReport.id) {
      toast.error("Terjadi kesalahan: ID Laporan tidak ditemukan.");
      return;
    }

    const reportId = forwardingReport.id;
    const notes = formData.notes || "";

    try {
      const response = await fetch("/api/reports", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reportId,
          status: "forwarded-to-coordinator",
          action: "Diteruskan ke Koordinator",
          notes: notes,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Gagal meneruskan laporan");
      }

      toast.success("✅ Laporan berhasil diteruskan ke Koordinator");
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
  // Pastikan ini didefinisikan sebelum digunakan oleh useEffect di bawah.
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

        return matchesSearch && matchesService;
      })
      // PERUBAHAN: Urutkan dari yang TERLAMA ke TERBARU (ASC)
      // Laporan baru (timestamp lebih besar) akan berada di AKHIR daftar.
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [reports, searchQuery, serviceFilter]);

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
  }, [searchQuery, serviceFilter]);

  // --- LOGIKA PINDAH KE HALAMAN TERAKHIR SETELAH SUBMIT ---
  // Hook ini dijalankan SETELAH useMemo di atas selesai.
  useEffect(() => {
    // Kondisi: Jika form ditutup (setelah submit) DAN ada data laporan
    if (!showReportForm && filteredReports.length > 0) {
      // Hitung ulang total halaman dan pindah ke halaman terakhir
      const newTotalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);

      // Pindahkan ke halaman terakhir jika saat ini bukan halaman terakhir
      if (currentPage !== newTotalPages) {
        setCurrentPage(newTotalPages);
      }
    }
  }, [showReportForm, filteredReports.length]); // Dependency pada length untuk memicu saat data berubah
  // Catatan: currentPage dihapus dari dependency di sini untuk mencegah loop tak terbatas, 
  // karena hook ini yang mengatur currentPage.

  // Statistik
  const stats = [
    { label: "Total Laporan", value: reports.length, icon: Layers, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Draft/Menunggu Review", value: reports.filter((r) => r.status === "draft").length, icon: Clock, color: "text-orange-600", bg: "bg-orange-100" },
    { label: "Perlu Revisi/Dikembalikan", value: reports.filter((r) => r.status === "revision-required" || r.status === "returned").length, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100" },
    { label: "Selesai", value: reports.filter((r) => r.status === "completed").length, icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
  ];

  return (
    <div className="space-y-8 p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Dashboard Tata Usaha 🏢</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {currentTime.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} | {currentTime.toLocaleTimeString("id-ID")}
          </p>
        </div>
        <button
          onClick={() => { setShowReportForm(true); setEditingReport(null); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg font-semibold text-sm"
        >
          <Plus className="w-5 h-5" />
          Buat Laporan Baru
        </button>
      </div>

      {/* Statistik Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

      <hr className="border-gray-200" />

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
                                {report.status === 'pending-approval-tu' && (
                                  <button onClick={() => handleFinalizeReport(report)} disabled={finalizingId === report.id} className="w-full flex items-center px-4 py-2.5 text-sm text-green-700 hover:bg-green-50 transition-colors border-t border-gray-100">
                                    {finalizingId === report.id ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <Archive className="w-4 h-4 mr-3" />} Selesaikan & Arsipkan
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
                      <DetailItem label="Tgl. Masuk" value={new Date(viewingReport.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                    <h3 className="text-md font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2"><Layers className="w-4 h-4 text-blue-500" /> Detail Dokumen</h3>
                    <div className="space-y-3 text-sm">
                      <DetailItem label="Dari" value={viewingReport.dari} />
                      <DetailItem label="Tanggal Surat" value={new Date(viewingReport.tanggal_surat).toLocaleDateString('id-ID')} />
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
                    title="Hasil Pengerjaan Staff"
                    isLoading={isFileLoading}
                    files={staffTasks.filter(t => t.fileUrl).map(t => ({
                      name: `${t.staffName} (Hasil)`,
                      url: t.fileUrl
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

const FileSection = ({ title, isLoading, files, emptyMessage, icon: Icon, iconColor, bgColor = 'bg-gray-50', borderColor = 'border-gray-100', downloadText = 'Download' }: {
  title: string;
  isLoading: boolean;
  files: { name: string; url: string | null; }[];
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