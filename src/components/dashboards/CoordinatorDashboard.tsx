"use client"

import { useState, useEffect } from "react"
import { useApp } from "../../context/AppContext"
import { supabase } from "../../../lib/supabaseClient"
import { toast } from "../../../lib/toast";
import {
  UserPlus, AlertTriangle, FileText, Clock,
  CheckCircle, Search, Eye, LogOut, Send, XCircle, Calendar,
  Check, X, Download,
} from "lucide-react"
// Pastikan SUB_SERVICES_MAP dan SERVICES diimport dari types
import { Report, SERVICES, SUB_SERVICES_MAP } from "../../types"
import { ReportDetailsModal } from "../modals/ReportDetailsModal"
import { AddStaffModal } from "../modals/AddStaffModal"
import { RevisionModal } from "../modals/RevisionModal"

// --- KONFIGURASI SPESIALISASI KOORDINATOR ---
// Menentukan kategori utama berdasarkan nama akun yang login
const COORDINATOR_SPECIALIZATION: Record<string, string> = {
  "Suwarti": "Administrasi Kepegawaian",
  "Ahmad Toto": "Pengelolaan Jabatan Fungsional",
  "Achmad Evianto": "Pengelolaan Jabatan Fungsional", // Alternatif jika nama di DB berbeda
  "Yosi Yosandi": "Perencanaan dan pengembangan SDM",
  "Adi Sulaksono": "Organisasi dan Tata Laksana",
};

// --- Tipe data lokal untuk TaskAssignment ---
type TaskAssignment = {
  id: string;
  status: 'in-progress' | 'revision-required' | 'completed' | 'pending-review';
  staff_id: string;
  revised_file_path?: string;
  staff_revision_notes?: string;
  Staff_notes?: string;
  file_path?: string;
}

// --- Gunakan TaskAssignment lokal di tipe Report ---
type LocalReport = Omit<Report, 'task_assignments'> & {
  task_assignments: TaskAssignment[];
}

// ====================================================================
// === KOMPONEN: SignedFileDownloader (Untuk link aman) ===
// ====================================================================
function SignedFileDownloader({ filePath, bucketName = 'revised_documents' }: { filePath: string, bucketName?: string }) {
  const [signedUrl, setSignedUrl] = useState<string>('#');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) {
      setIsLoading(false);
      return;
    }

    async function getSignedUrl() {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, 3600, {
          download: true
        });

      if (error) {
        console.error("Error creating signed URL:", error);
        setError("Gagal memuat file.");
        setSignedUrl('#');
      } else {
        setSignedUrl(data.signedUrl);
      }
      setIsLoading(false);
    }

    getSignedUrl();
  }, [filePath, bucketName]);

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-2 mt-3 text-sm bg-gray-100 text-gray-500 rounded-lg">
        <Clock className="w-4 h-4 animate-spin" />
        Memuat link...
      </span>
    );
  }

  if (error) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-2 mt-3 text-sm bg-red-50 text-red-600 rounded-lg">
        <AlertTriangle className="w-4 h-4" />
        {error}
      </span>
    );
  }

  return (
    <a
      href={signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-2 mt-3 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
    >
      <Download className="w-4 h-4" />
      Download File
    </a>
  );
}

// ====================================================================
// === KOMPONEN MODAL: REVIEW REVISI (TAHAP 1 - CYAN) ===
// ====================================================================
function ReviewRevisionModal({ report, profiles, onClose, onApprove, onReject }: {
  report: LocalReport,
  profiles: any[],
  onClose: () => void,
  onApprove: (report: LocalReport) => void,
  onReject: (report: LocalReport) => void
}) {

  const [isApproving, setIsApproving] = useState(false);

  const tasksToReview = report.task_assignments.filter(
    task => task.status === 'completed' && task.revised_file_path
  );

  const getProfileName = (staffId: string) => {
    const profile = profiles.find(p => p.id === staffId);
    return profile?.full_name || "Staff Tidak Dikenali";
  }

  const handleApprove = async () => {
    setIsApproving(true);
    await onApprove(report);
    setIsApproving(false);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <CheckCircle className="text-blue-600 w-5 h-5" /> Review Hasil Revisi Staff
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <p className="font-semibold text-blue-900">{report.hal}</p>
            <p className="text-sm text-blue-700 mt-1">No. Surat: {report.no_surat}</p>
          </div>

          <h4 className="font-semibold text-gray-800 border-b pb-2">File Revisi Terbaru:</h4>

          {tasksToReview.length > 0 ? (
            <div className="space-y-4">
              {tasksToReview.map(task => (
                <div key={task.id} className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-sm font-semibold text-gray-900">
                      Oleh: {getProfileName(task.staff_id)}
                    </p>
                    <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full border border-purple-200 font-medium">
                      Revisi Masuk
                    </span>
                  </div>

                  {task.staff_revision_notes && (
                    <div className="mb-4">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Catatan Staff:</label>
                      <p className="text-sm text-gray-700 mt-1 p-3 bg-gray-50 border rounded-md whitespace-pre-wrap">
                        {task.staff_revision_notes}
                      </p>
                    </div>
                  )}

                  <div className="mt-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Lampiran File:</label>
                    {task.revised_file_path ? (
                      <SignedFileDownloader
                        filePath={task.revised_file_path}
                        bucketName="revised_documents"
                      />
                    ) : (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> Staff tidak melampirkan file.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
              <p className="text-gray-500">Tidak ada file revisi yang ditemukan.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 bg-gray-50 border-t">
          <button
            onClick={() => onReject(report)}
            className="px-5 py-2.5 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 font-medium transition-colors flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" /> Tolak & Revisi Ulang
          </button>

          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm flex items-center gap-2 disabled:bg-blue-400"
          >
            {isApproving ? <Clock className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isApproving ? 'Memproses...' : 'Setujui Revisi (Lanjut Review Akhir)'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ====================================================================
// === KOMPONEN MODAL: REVIEW TUGAS REGULAR/AKHIR (TAHAP 2 - ORANGE) ===
// ====================================================================
function ReviewTaskModal({ report, profiles, onClose, onApprove, onReject }: {
  report: LocalReport,
  profiles: any[],
  onClose: () => void,
  onApprove: (report: LocalReport) => void,
  onReject: (report: LocalReport) => void
}) {

  const [isApproving, setIsApproving] = useState(false);

  // LOGIC FILTER: Tampilkan tugas yang 'completed' (kerjaan biasa) ATAU 'pending-review' (revisi yang sudah disetujui)
  const tasksToReview = report.task_assignments.filter(
    task => task.status === 'completed' || task.status === 'pending-review'
  );

  const getProfileName = (staffId: string) => {
    const profile = profiles.find(p => p.id === staffId);
    return profile?.full_name || "Staff Tidak Dikenali";
  }

  const handleApprove = async () => {
    setIsApproving(true);
    await onApprove(report);
    setIsApproving(false);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <CheckCircle className="text-green-600 w-5 h-5" /> Review Akhir Hasil Pekerjaan
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <p className="font-semibold text-green-900">{report.hal}</p>
            <p className="text-sm text-green-700 mt-1">No. Surat: {report.no_surat}</p>
          </div>

          <h4 className="font-semibold text-gray-800 border-b pb-2">Semua File Pekerjaan:</h4>

          {tasksToReview.length > 0 ? (
            <div className="space-y-4">
              {tasksToReview.map(task => {
                const isRevision = !!task.revised_file_path;
                const displayFilePath = isRevision ? task.revised_file_path : task.file_path;
                const displayNotes = isRevision ? task.staff_revision_notes : task.Staff_notes;
                // Jika isRevision, pakai bucket revisi, jika tidak, pakai documents
                const bucketName = isRevision ? "revised_documents" : "documents";

                return (
                  <div key={task.id} className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <p className="text-sm font-semibold text-gray-900">
                        Oleh: {getProfileName(task.staff_id)}
                      </p>
                      {isRevision ? (
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                          Hasil Revisi (Disetujui)
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full border border-green-200">
                          Pekerjaan Original
                        </span>
                      )}
                    </div>

                    {displayNotes && (
                      <div className="mb-4">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                          {isRevision ? "Catatan Revisi:" : "Catatan Staff:"}
                        </label>
                        <p className="text-sm text-gray-700 p-3 bg-gray-50 border rounded-md whitespace-pre-wrap">
                          {displayNotes}
                        </p>
                      </div>
                    )}

                    <div className="mt-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Lampiran File:</label>
                      {displayFilePath ? (
                        <SignedFileDownloader
                          filePath={displayFilePath}
                          bucketName={bucketName}
                        />
                      ) : (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" /> Staff tidak melampirkan file.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
              <p className="text-gray-500">Tidak ada pekerjaan yang ditemukan.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 bg-gray-50 border-t">
          <button
            onClick={() => onReject(report)}
            className="px-5 py-2.5 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 font-medium transition-colors flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" /> Tolak & Minta Revisi
          </button>
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors shadow-sm flex items-center gap-2 disabled:bg-green-400"
          >
            {isApproving ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isApproving ? 'Memproses...' : 'Setujui & Teruskan ke TU'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ====================================================================
// === KOMPONEN UTAMA: CoordinatorDashboard ===
// ====================================================================
export function CoordinatorDashboard() {
  const { state, dispatch } = useApp()
  const { currentUser } = state || {}

  const [localReports, setLocalReports] = useState<LocalReport[]>([])
  const [localProfiles, setLocalProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [serviceFilter, setServiceFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const [selectedReport, setSelectedReport] = useState<LocalReport | null>(null)
  const [addStaffReport, setAddStaffReport] = useState<LocalReport | null>(null)
  const [revisionReport, setRevisionReport] = useState<LocalReport | null>(null)

  const [reviewRevisionReport, setReviewRevisionReport] = useState<LocalReport | null>(null)
  const [reviewTaskReport, setReviewTaskReport] = useState<LocalReport | null>(null)

  const [currentTime, setCurrentTime] = useState(new Date())
  const [forwardingId, setForwardingId] = useState<string | null>(null);

  const fetchData = async (showLoadingSpinner = false) => {
    if (!currentUser?.id) return;
    if (showLoadingSpinner) setLoading(true);

    try {
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*, task_assignments(*)')
        .or(`status.eq.forwarded-to-coordinator,current_holder.eq.${currentUser.id},status.eq.in-progress,status.eq.revision-required`)
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      setLocalReports((reportsData as LocalReport[]) || []);

      if (localProfiles.length === 0) {
        const { data: profilesData, error: profilesError } = await supabase.from("profiles").select("*");
        if (profilesError) throw profilesError;
        setLocalProfiles(profilesData || []);
      }
    } catch (error) {
      console.error("Gagal mengambil data:", error);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  const handleQuickForwardToTU = async (report: LocalReport) => {
    if (!report || !currentUser) return;

    if (!window.confirm(`Anda yakin ingin meneruskan laporan "${report.hal}" ke TU?`)) {
      return;
    }

    setForwardingId((report as any).id);
    try {
      const { error: updateError } = await supabase
        .from('reports')
        .update({ status: 'pending-approval-tu', current_holder: null })
        .eq('id', (report as any).id);
      if (updateError) throw updateError;

      await supabase.from('workflow_history').insert({
        report_id: (report as any).id,
        action: 'Laporan disetujui dan diteruskan ke TU via Aksi Cepat',
        user_id: currentUser?.id,
        status: 'pending-approval-tu',
        notes: `Laporan disetujui oleh Koordinator dari dashboard.`,
      });

      toast.success("Laporan berhasil diteruskan ke TU!");
      fetchData(false);

    } catch (error: any) {
      toast.error("Gagal meneruskan laporan: " + error.message);
    } finally {
      setForwardingId(null);
    }
  };

  const handleApproveRevisions = async (report: LocalReport) => {
    try {
      const tasksToApprove = report.task_assignments
        .filter(a => a.status === 'completed' && a.revised_file_path)
        .map(a => a.id);

      if (tasksToApprove.length === 0) {
        toast.warning("Data revisi tidak ditemukan valid.");
        return;
      }

      const { error: updateTaskError } = await supabase
        .from('task_assignments')
        .update({ status: 'pending-review' })
        .in('id', tasksToApprove);

      if (updateTaskError) throw updateTaskError;

      await supabase.from('workflow_history').insert({
        report_id: report.id,
        action: 'Revisi Disetujui (Menunggu Review Akhir)',
        user_id: currentUser?.id,
        status: 'pending-review',
        notes: `Koordinator menyetujui revisi. Laporan masuk ke tahap review akhir sebelum ke TU.`,
      });

      toast.success("Revisi disetujui! Laporan masuk ke tahap Review Akhir.");
      setReviewRevisionReport(null);
      fetchData();

    } catch (error: any) {
      toast.error("Gagal menyetujui revisi: " + error.message);
    }
  };

  const handleRejectRevisions = (report: LocalReport) => {
    setReviewRevisionReport(null);
    setRevisionReport(report);
  };

  const handleApproveTask = async (report: LocalReport) => {
    if (!report || !currentUser) return;

    try {
      const { error: updateError } = await supabase
        .from('reports')
        .update({ status: 'pending-approval-tu', current_holder: null })
        .eq('id', report.id);
      if (updateError) throw updateError;

      await supabase.from('workflow_history').insert({
        report_id: report.id,
        action: 'Pekerjaan Staff Disetujui & Diteruskan ke TU',
        user_id: currentUser?.id,
        status: 'pending-approval-tu',
        notes: `Koordinator menyetujui hasil kerja staff (termasuk revisi jika ada) dan meneruskan ke TU.`,
      });

      toast.success("Laporan berhasil disetujui dan diteruskan ke TU!");
      setReviewTaskReport(null);
      fetchData(false);

    } catch (error: any) {
      toast.error("Gagal memproses laporan: " + error.message);
    }
  };

  const handleRejectTask = (report: LocalReport) => {
    setReviewTaskReport(null);
    setRevisionReport(report);
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchData(true);
      const pollingInterval = setInterval(() => {
        fetchData(false);
      }, 15000);
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => {
        clearInterval(pollingInterval);
        clearInterval(timer);
      };
    }
  }, [currentUser]);

  const getProfileName = (profileId: string) => {
    if (!profileId || !localProfiles) return "Sistem";
    const profile = localProfiles.find((p) => p.id === profileId || (p as any).user_id === profileId)
    return profile?.full_name || profile?.name || "ID Tidak Dikenali"
  }

  const getStatusInfo = (report: LocalReport) => {
    if (report.task_assignments?.some(a => a.status === 'revision-required')) {
      return { text: 'Perlu Revisi', value: 'revision-required', color: 'text-red-600', icon: XCircle };
    }
    if (report.task_assignments?.some(a => a.status === 'completed' && a.revised_file_path)) {
      return { text: 'Revisi Masuk (Perlu Review)', value: 'pending-review-revisi', color: 'text-cyan-600', icon: Eye };
    }
    const allTasksDone = report.task_assignments?.length > 0 &&
      report.task_assignments.every(a => a.status === 'completed' || a.status === 'pending-review');

    if (allTasksDone) {
      return { text: 'Tugas Selesai (Review Akhir)', value: 'pending-review-baru', color: 'text-orange-600', icon: CheckCircle };
    }

    if (report.status === 'completed') return { text: 'Selesai', value: 'completed', color: 'text-green-600', icon: CheckCircle };
    if (report.status === 'forwarded-to-coordinator') return { text: 'Perlu Tindakan', value: 'forwarded-to-coordinator', color: 'text-purple-600', icon: Send };
    if (report.status === 'in-progress') return { text: 'Dikerjakan Staff', value: 'in-progress', color: 'text-blue-600', icon: Clock };

    return { text: report.status, value: report.status, color: 'text-gray-600', icon: AlertTriangle };
  };

  const getReportProgress = (report: LocalReport) => {
    if (!report.task_assignments || report.task_assignments.length === 0) {
      if (report.status === 'completed') return 100;
      return 0;
    }
    const completedCount = report.task_assignments.filter(
      a => a.status === 'completed' || a.status === 'pending-review'
    ).length;
    return Math.round((completedCount / report.task_assignments.length) * 100);
  };

  // --- LOGIC FILTER DROPDOWN DINAMIS ---
  // 1. Tentukan Spesialisasi berdasarkan nama user
  const currentCoordinatorName = currentUser?.full_name || currentUser?.name || "";
  const specializedCategory = COORDINATOR_SPECIALIZATION[currentCoordinatorName];

  // 2. Tentukan Opsi Dropdown (Jika spesialisasi ada, ambil sub-layanan. Jika tidak, ambil Main Services)
  const serviceOptions = specializedCategory
    ? SUB_SERVICES_MAP[specializedCategory] || []
    : SERVICES;

  // 3. Filter Reports
  const filteredReports = localReports.filter(report => {
    // Logic: Jika user memilih opsi filter, cocokkan dengan sub_layanan ATAU layanan utama
    const matchesService = !serviceFilter ||
      report.sub_layanan === serviceFilter ||
      report.layanan === serviceFilter;

    const matchesSearch =
      !searchQuery ||
      report.hal?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.no_surat?.toLowerCase().includes(searchQuery.toLowerCase());
    const displayStatusValue = getStatusInfo(report).value;
    const matchesStatus = !statusFilter || displayStatusValue === statusFilter;
    return matchesService && matchesStatus && matchesSearch;
  });

  const stats = {
    totalLaporan: localReports.length,
    perluTindakan: localReports.filter(r => r.status === 'forwarded-to-coordinator').length,
    selesai: localReports.filter(r => r.status === 'completed').length,
    revisi: localReports.filter(r => getStatusInfo(r).value === 'revision-required').length,
    menungguReview: localReports.filter(r =>
      getStatusInfo(r).value === 'pending-review-revisi' ||
      getStatusInfo(r).value === 'pending-review-baru'
    ).length,
  };

  const handleLogout = () => dispatch({ type: "LOGOUT" });

  const { date } = (() => {
    const d = new Date(currentTime);
    return { date: d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) };
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Clock className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-500 font-medium">Memuat data koordinator...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40 shadow-sm">
        {/* --- Header --- */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Dashboard Koordinator</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{date}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium">
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
            <div className="flex items-center gap-3 border-l pl-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-gray-900">{currentUser.name || currentUser.full_name || "Koordinator"}</div>
                <div className="text-xs text-green-600 font-medium flex items-center justify-end gap-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Online
                </div>
              </div>
              <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                {(currentUser.name || currentUser.full_name)?.charAt(0).toUpperCase() || "K"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-7xl mx-auto">

        {/* --- Statistik Cards --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 transition-transform hover:scale-[1.02]">
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><FileText className="w-6 h-6" /></div>
            <div><div className="text-2xl font-bold text-gray-900">{stats.totalLaporan}</div><div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Laporan</div></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 transition-transform hover:scale-[1.02]">
            <div className="p-3 bg-purple-50 rounded-lg text-purple-600"><AlertTriangle className="w-6 h-6" /></div>
            <div><div className="text-2xl font-bold text-gray-900">{stats.perluTindakan}</div><div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Perlu Tindakan</div></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 transition-transform hover:scale-[1.02]">
            <div className="p-3 bg-cyan-50 rounded-lg text-cyan-600"><Eye className="w-6 h-6" /></div>
            <div><div className="text-2xl font-bold text-gray-900">{stats.menungguReview}</div><div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Menunggu Review</div></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 transition-transform hover:scale-[1.02]">
            <div className="p-3 bg-red-50 rounded-lg text-red-600"><XCircle className="w-6 h-6" /></div>
            <div><div className="text-2xl font-bold text-gray-900">{stats.revisi}</div><div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Sedang Revisi</div></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 transition-transform hover:scale-[1.02]">
            <div className="p-3 bg-green-50 rounded-lg text-green-600"><CheckCircle className="w-6 h-6" /></div>
            <div><div className="text-2xl font-bold text-gray-900">{stats.selesai}</div><div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Selesai</div></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* --- Filter Bar --- */}
          <div className="p-5 border-b border-gray-200 bg-gray-50/50">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Daftar Laporan</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="relative sm:col-span-2 lg:col-span-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Cari perihal atau no. surat..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow" />
              </div>

              {/* --- DROPDOWN LAYANAN DINAMIS --- */}
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">
                  {specializedCategory ? `Semua Layanan ${specializedCategory}` : "Semua Layanan"}
                </option>
                {/* Menampilkan Opsi berdasarkan Spesialisasi Koordinator */}
                {serviceOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white">
                <option value="">Semua Status</option>
                <option value="forwarded-to-coordinator">Perlu Tindakan</option>
                <option value="revision-required">Perlu Revisi</option>
                <option value="pending-review-revisi">Menunggu Review (Revisi)</option>
                <option value="pending-review-baru">Menunggu Review (Baru)</option>
                <option value="in-progress">Dikerjakan Staff</option>
                <option value="completed">Selesai</option>
              </select>
            </div>
          </div>

          {/* --- Tabel Laporan --- */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Laporan</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Dari</th>
                  {/* KOLOM BARU: LAYANAN */}
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Layanan</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Progress</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map(report => {
                  const status = getStatusInfo(report);
                  const progress = getReportProgress(report);
                  return (
                    <tr key={(report as any).id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 line-clamp-2">{report.hal}</div>
                        <div className="text-xs text-gray-500 mt-1 font-mono">{report.no_surat}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">{getProfileName((report as any).created_by)}</td>

                      {/* ISI KOLOM LAYANAN */}
                      <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                        {report.sub_layanan || report.layanan}
                      </td>

                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.color.replace('text-', 'bg-').replace('600', '50')} ${status.color.replace('text-', 'border-').replace('600', '200')} ${status.color}`}>
                          <status.icon className="w-3.5 h-3.5" />
                          {status.text}
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell align-middle">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2"><div className={`h-2 rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div></div>
                          <span className="text-xs font-semibold text-gray-600">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex items-center gap-2">

                          {/* TOMBOL KHUSUS: Review Revisi (Cyan) */}
                          {status.value === 'pending-review-revisi' && (
                            <button
                              onClick={() => setReviewRevisionReport(report)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cyan-600 text-white rounded-md hover:bg-cyan-700 shadow-sm transition-all"
                              title="Tinjau hasil revisi dari staff"
                            >
                              <Eye className="w-3.5 h-3.5" /> Tinjau Revisi
                            </button>
                          )}

                          {/* TOMBOL UMUM */}
                          {status.value !== 'pending-review-revisi' && (
                            <>
                              <button onClick={() => setSelectedReport(report)} className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors" title="Lihat Detail"><Eye className="w-5 h-5" /></button>
                              <button onClick={() => setAddStaffReport(report)} className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors" title="Atur Staff"><UserPlus className="w-5 h-5" /></button>
                              <button onClick={() => setRevisionReport(report)} className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors" title="Kembalikan / Revisi"><AlertTriangle className="w-5 h-5" /></button>
                            </>
                          )}

                          {/* TOMBOL REVIEW TUGAS REGULAR/AKHIR (Orange) */}
                          {status.value === 'pending-review-baru' && (
                            <button
                              onClick={() => setReviewTaskReport(report)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-orange-500 text-white rounded-md hover:bg-orange-600 shadow-sm transition-all ml-1"
                              title="Review tugas staff sebelum ke TU"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Review Akhir
                            </button>
                          )}

                          {/* SHORTCUT: Langsung Forward ke TU jika sudah clear */}
                          {status.value === 'pending-review-baru' && (
                            <button
                              onClick={() => handleQuickForwardToTU(report)}
                              disabled={forwardingId === (report as any).id}
                              className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
                              title="Setujui & Teruskan ke TU"
                            >
                              {forwardingId === (report as any).id ? <Clock className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredReports.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-500">Tidak ada laporan yang cocok dengan filter Anda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- Render Modal --- */}
      {selectedReport && <ReportDetailsModal report={selectedReport} profiles={localProfiles} onClose={() => { setSelectedReport(null); fetchData(); }} />}
      {addStaffReport && <AddStaffModal report={addStaffReport} profiles={localProfiles} onClose={() => { setAddStaffReport(null); fetchData(); }} />}
      {revisionReport && <RevisionModal report={revisionReport} profiles={localProfiles} onClose={() => { setRevisionReport(null); fetchData(); }} />}

      {reviewRevisionReport && (
        <ReviewRevisionModal
          report={reviewRevisionReport}
          profiles={localProfiles}
          onClose={() => setReviewRevisionReport(null)}
          onApprove={handleApproveRevisions}
          onReject={handleRejectRevisions}
        />
      )}

      {reviewTaskReport && (
        <ReviewTaskModal
          report={reviewTaskReport}
          profiles={localProfiles}
          onClose={() => setReviewTaskReport(null)}
          onApprove={handleApproveTask}
          onReject={handleRejectTask}
        />
      )}
    </div>
  )
}