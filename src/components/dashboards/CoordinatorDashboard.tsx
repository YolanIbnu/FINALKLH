"use client"

import { useState, useEffect } from "react"
import { useApp } from "../../context/AppContext"
import { supabase } from "../../../lib/supabaseClient"
import { toast } from "../../../lib/toast";
import {
  Filter, UserPlus, AlertTriangle, FileText, Clock,
  CheckCircle, Search, Eye, LogOut, Send, XCircle, Calendar,
  Check, X, Download,
} from "lucide-react"
import { Report, SERVICES } from "../../types"
import { ReportDetailsModal } from "../modals/ReportDetailsModal"
import { AddStaffModal } from "../modals/AddStaffModal"
import { RevisionModal } from "../modals/RevisionModal"

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
function SignedFileDownloader({ filePath, cleanPath }: { filePath: string, cleanPath: string }) {
  const [signedUrl, setSignedUrl] = useState<string>('#');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) {
      setIsLoading(false);
      setError("No file path provided.");
      return;
    }

    async function getSignedUrl() {
      setIsLoading(true);
      setError(null);

      // Membuat link yang aman dan valid selama 60 detik
      const { data, error } = await supabase.storage
        .from('revised_documents')
        .createSignedUrl(cleanPath, 60, {
          download: true // Paksa URL untuk mengunduh
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
  }, [filePath, cleanPath]); // Jalankan ulang jika path berubah

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-2 mt-3 text-sm bg-gray-400 text-white rounded-lg">
        <Clock className="w-4 h-4 animate-spin" />
        Memuat link...
      </span>
    );
  }

  if (error) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-2 mt-3 text-sm bg-red-100 text-red-700 rounded-lg">
        <AlertTriangle className="w-4 h-4" />
        {error}
      </span>
    );
  }

  // Ekstrak nama file dari path untuk atribut download
  const fileName = cleanPath.split('/').pop() || 'file_revisi';

  return (
    <a
      href={signedUrl}
      rel="noopener noreferrer"
      download={fileName} // Tambahkan atribut 'download'
      className="inline-flex items-center gap-2 px-3 py-2 mt-3 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      <Download className="w-4 h-4" />
      Lihat File Revisi
    </a>
  );
}

// ====================================================================
// === KOMPONEN MODAL REVIEW REVISI ===
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
    task => task.status === 'pending-review'
  );

  const getProfileName = (staffId: string) => {
    const profile = profiles.find(p => p.id === staffId);
    return profile?.full_name || "Staff Tidak Dikenali";
  }
  const getCleanPath = (filePath: string) => {
    if (!filePath) return '';
    return filePath; // Langsung kembalikan path apa adanya
  }
  // --- Fungsi ini sekarang HANYA membersihkan path ---

  const handleApprove = async () => {
    setIsApproving(true);
    await onApprove(report);
    setIsApproving(false);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <CheckCircle className="text-blue-500" /> Review Hasil Revisi Staff
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="mb-2">
            <p className="font-medium text-gray-900">{report.hal}</p>
            <p className="text-sm text-gray-500">{report.no_surat}</p>
          </div>

          <h4 className="font-semibold text-gray-700">File Revisi dari Staff:</h4>

          {tasksToReview.length > 0 ? (
            <div className="space-y-4">
              {tasksToReview.map(task => {
                // Dapatkan path yang bersih
                const cleanFilePath = getCleanPath(task.revised_file_path || '');

                return (
                  <div key={task.id} className="border rounded-lg p-4 bg-gray-50">
                    <p className="text-sm font-medium text-gray-800">
                      Oleh: {getProfileName(task.staff_id)}
                    </p>

                    {/* Catatan dari Staff */}
                    {task.staff_revision_notes && (
                      <div className="mt-2">
                        <label className="text-xs font-medium text-gray-500">Catatan Staff:</label>
                        <p className="text-sm text-gray-700 p-2 bg-white border rounded-md whitespace-pre-wrap">
                          {task.staff_revision_notes}
                        </p>
                      </div>
                    )}

                    {/* --- Link File (Menggunakan komponen baru) --- */}
                    {task.revised_file_path ? (
                      <SignedFileDownloader
                        filePath={task.revised_file_path}
                        cleanPath={cleanFilePath}
                      />
                    ) : (
                      <p className="text-sm text-red-500 mt-2">Staff tidak melampirkan file.</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">Tidak ada file revisi yang ditemukan.</p>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 bg-gray-50 border-t">
          <button
            onClick={() => onReject(report)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" /> Tolak & Kirim Revisi Ulang
          </button>
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {isApproving ? 'Menyetujui...' : 'Setujui Revisi Ini'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ====================================================================
// === KOMPONEN MODAL REVIEW TUGAS (BARU) ===
// ====================================================================
function ReviewTaskModal({ report, profiles, onClose, onApprove, onReject }: {
  report: LocalReport,
  profiles: any[],
  onClose: () => void,
  onApprove: (report: LocalReport) => void,
  onReject: (report: LocalReport) => void
}) {

  const [isApproving, setIsApproving] = useState(false);

  // Filter tugas yang statusnya 'completed' (karena ini review untuk tugas yang baru selesai dikerjakan staff)
  // Atau bisa juga kita anggap semua tugas di report ini perlu direview jika status reportnya 'pending-review-baru'
  const tasksToReview = report.task_assignments.filter(
    task => task.status === 'completed'
  );

  const getProfileName = (staffId: string) => {
    const profile = profiles.find(p => p.id === staffId);
    return profile?.full_name || "Staff Tidak Dikenali";
  }
  const getCleanPath = (filePath: string) => {
    if (!filePath) return '';
    return filePath;
  }

  const handleApprove = async () => {
    setIsApproving(true);
    await onApprove(report);
    setIsApproving(false);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <CheckCircle className="text-blue-500" /> Review Hasil Pekerjaan Staff
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="mb-2">
            <p className="font-medium text-gray-900">{report.hal}</p>
            <p className="text-sm text-gray-500">{report.no_surat}</p>
          </div>

          <h4 className="font-semibold text-gray-700">File Pekerjaan dari Staff:</h4>

          {tasksToReview.length > 0 ? (
            <div className="space-y-4">
              {tasksToReview.map(task => {
                const isRevision = !!task.revised_file_path;
                const displayFilePath = isRevision ? task.revised_file_path : task.file_path;
                const displayNotes = isRevision ? task.staff_revision_notes : task.Staff_notes;
                const cleanFilePath = getCleanPath(displayFilePath || '');

                return (
                  <div key={task.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium text-gray-800">
                        Oleh: {getProfileName(task.staff_id)}
                      </p>
                      {isRevision && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                          Hasil Revisi
                        </span>
                      )}
                    </div>

                    {/* Catatan */}
                    {displayNotes && (
                      <div className="mt-2">
                        <label className="text-xs font-medium text-gray-500">
                          {isRevision ? "Catatan Revisi Staff:" : "Catatan Staff:"}
                        </label>
                        <p className="text-sm text-gray-700 p-2 bg-white border rounded-md whitespace-pre-wrap">
                          {displayNotes}
                        </p>
                      </div>
                    )}

                    {/* --- Link File --- */}
                    {displayFilePath ? (
                      <div className="mt-3">
                        {isRevision ? (
                          <SignedFileDownloader
                            filePath={displayFilePath}
                            cleanPath={cleanFilePath}
                          />
                        ) : (
                          <a
                            href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${cleanFilePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            <Download className="w-4 h-4" /> Download File Pekerjaan
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-red-500 mt-2">Staff tidak melampirkan file.</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">Tidak ada pekerjaan yang ditemukan.</p>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 bg-gray-50 border-t">
          <button
            onClick={() => onReject(report)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" /> Tolak & Minta Revisi
          </button>
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {isApproving ? 'Menyetujui...' : 'Setujui & Teruskan ke TU'}
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
        .filter(a => a.status === 'pending-review')
        .map(a => a.id);

      if (tasksToApprove.length === 0) {
        toast.warning("Tidak ada revisi untuk disetujui.");
        return;
      }

      const { error } = await supabase
        .from('task_assignments')
        .update({ status: 'completed' })
        .in('id', tasksToApprove);

      if (error) throw error;

      await supabase.from('workflow_history').insert({
        report_id: report.id,
        action: 'Revisi Staff Disetujui',
        user_id: currentUser?.id,
        status: 'completed',
        notes: `Koordinator menyetujui ${tasksToApprove.length} revisi tugas.`,
      });

      toast.success("Revisi staff berhasil disetujui!");
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
    // Logic ini mirip dengan handleQuickForwardToTU
    // Setujui tugas staff (sudah completed), lalu forward ke TU
    if (!report || !currentUser) return;

    try {
      // 1. Update status report jadi pending-approval-tu
      const { error: updateError } = await supabase
        .from('reports')
        .update({ status: 'pending-approval-tu', current_holder: null })
        .eq('id', report.id);
      if (updateError) throw updateError;

      // 2. Catat history
      await supabase.from('workflow_history').insert({
        report_id: report.id,
        action: 'Pekerjaan Staff Disetujui & Diteruskan ke TU',
        user_id: currentUser?.id,
        status: 'pending-approval-tu',
        notes: `Koordinator menyetujui hasil kerja staff dan meneruskan ke TU.`,
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
    if (report.task_assignments && report.task_assignments.some(a => a.status === 'revision-required')) {
      return { text: 'Perlu Revisi', value: 'revision-required', color: 'text-red-600', icon: XCircle };
    }
    if (report.task_assignments && report.task_assignments.some(a => a.status === 'pending-review')) {
      return { text: 'Menunggu Review (Revisi)', value: 'pending-review-revisi', color: 'text-cyan-600', icon: Eye };
    }
    if (report.task_assignments && report.task_assignments.length > 0 && report.task_assignments.every(a => a.status === 'completed')) {
      return { text: 'Menunggu Review (Baru)', value: 'pending-review-baru', color: 'text-orange-600', icon: Eye };
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

  const filteredReports = localReports.filter(report => {
    const matchesService = !serviceFilter || report.layanan === serviceFilter;
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
      <div className="flex items-center justify-center h-screen">
        <p>Memuat data koordinator...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        {/* --- Header --- */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Dashboard Koordinator</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
              <Calendar className="w-4 h-4" />
              <span>{date}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{currentUser.name || currentUser.full_name || "Koordinator"}</div>
                <div className="text-xs text-blue-600">Online</div>
              </div>
              <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-medium">
                {(currentUser.name || currentUser.full_name)?.charAt(0).toUpperCase() || "K"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Tugas dan Laporan Masuk</h2>
          <p className="text-sm sm:text-base text-gray-600">Monitor dan kelola laporan yang ditugaskan kepada Anda</p>
        </div>

        {/* --- Statistik --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full text-blue-600"><FileText className="w-6 h-6" /></div>
            <div><div className="text-2xl font-bold text-gray-900">{stats.totalLaporan}</div><div className="text-sm text-gray-500">Total Laporan</div></div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-full text-yellow-600"><AlertTriangle className="w-6 h-6" /></div>
            <div><div className="text-2xl font-bold text-gray-900">{stats.perluTindakan}</div><div className="text-sm text-gray-500">Perlu Tindakan</div></div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 flex items-center gap-4">
            <div className="p-3 bg-cyan-100 rounded-full text-cyan-600"><Eye className="w-6 h-6" /></div>
            <div><div className="text-2xl font-bold text-gray-900">{stats.menungguReview}</div><div className="text-sm text-gray-500">Menunggu Review</div></div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-full text-red-600"><XCircle className="w-6 h-6" /></div>
            <div><div className="text-2xl font-bold text-gray-900">{stats.revisi}</div><div className="text-sm text-gray-500">Revisi</div></div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full text-green-600"><CheckCircle className="w-6 h-6" /></div>
            <div><div className="text-2xl font-bold text-gray-900">{stats.selesai}</div><div className="text-sm text-gray-500">Selesai</div></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          {/* --- Filter --- */}
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="relative sm:col-span-2 lg:col-span-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Cari laporan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
              </div>
              <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                <option value="">Semua Layanan</option>
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Laporan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Dari</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map(report => {
                  const status = getStatusInfo(report);
                  const progress = getReportProgress(report);
                  return (
                    <tr key={(report as any).id}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{report.hal}</div>
                        <div className="text-sm text-gray-500">{report.no_surat}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">{getProfileName((report as any).created_by)}</td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-2 text-sm font-medium ${status.color}`}>
                          <status.icon className="w-4 h-4" />
                          {status.text}
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-gray-200 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${progress === 100 ? 'bg-green-600' : 'bg-blue-600'}`} style={{ width: `${progress}%` }}></div></div>
                          <span className="text-sm font-medium text-gray-600">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex items-center gap-2">

                          {status.value === 'pending-review-revisi' && (
                            <button
                              onClick={() => setReviewRevisionReport(report)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-full hover:bg-blue-700"
                              title="Review Revisi Staff"
                            >
                              <CheckCircle className="w-4 h-4" /> Review Revisi
                            </button>
                          )}

                          {status.value !== 'pending-review-revisi' && (
                            <>
                              <button onClick={() => setSelectedReport(report)} className="text-blue-600 hover:text-blue-900" title="Lihat Detail"><Eye className="w-5 h-5" /></button>
                              <button onClick={() => setAddStaffReport(report)} className="text-gray-600 hover:text-gray-900" title="Tambah Staff"><UserPlus className="w-5 h-5" /></button>
                              <button onClick={() => setRevisionReport(report)} className="text-red-600 hover:text-red-900" title="Revisi / Kembalikan"><AlertTriangle className="w-5 h-5" /></button>

                            </>
                          )}

                          {progress === 100 && status.value === 'pending-review-baru' && (
                            <button
                              onClick={() => setReviewTaskReport(report)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-orange-600 text-white rounded-full hover:bg-orange-700"
                              title="Review Tugas Staff"
                            >
                              <CheckCircle className="w-4 h-4" /> Review Tugas
                            </button>
                          )}

                          {progress === 100 && status.value === 'pending-review-baru' && (
                            <button
                              onClick={() => handleQuickForwardToTU(report)}
                              disabled={forwardingId === (report as any).id}
                              className="text-green-600 hover:text-green-900 disabled:text-gray-300 disabled:cursor-wait"
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
                  <tr><td colSpan={5} className="text-center py-10 text-gray-500">Tidak ada laporan yang cocok.</td></tr>
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