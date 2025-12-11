"use client"

import {
  useState,
  useEffect,
  useCallback
} from "react"
import { useApp } from "../../context/AppContext"
import { supabase } from "../../../lib/supabaseClient"
import {
  Send,
  LogOut,
  FileText,
  ClipboardList,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Check,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  User,
} from "lucide-react"
import { useDropzone } from 'react-dropzone'
import { FileViewer } from "../FileViewer"
import { toast } from "../../../lib/toast"
import { StaffTaskCard } from "../StaffTaskCard"
// Asumsi ini didefinisikan di "../../types" atau perlu didefinisikan di sini
import { DOCUMENT_REQUIREMENTS, FileAttachment, Report } from "../../types"

// --- Tipe Data (Diperbarui dengan coordinator_id) ---
type Profile = {
  user_id: string;
  full_name: string;
};

type TaskAssignment = {
  id: string;
  staff_id: string;
  coordinator_id: string; // <-- PERUBAHAN UTAMA: ID Koordinator yang menugaskan
  todo_list: string[];
  notes: string;
  status: 'in-progress' | 'revision-required' | 'completed' | 'pending-review';
  revision_notes?: string;
  completed_tasks?: string[];
  reports: Report;
  revised_file_path?: string;
  staff_revision_notes?: string;
  Staff_notes?: string;
  file_path?: string;
  progress?: number;
  completed_at?: string;
};

// --- Komponen Helper: SimpleCard (Tidak Berubah) ---
const SimpleCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
    {children}
  </div>
);

// === Komponen Helper: Key Detail Card (Tidak Berubah) ===
const KeyDetailCard = ({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
    <div className="flex-shrink-0 text-blue-600">{icon}</div>
    <div className="min-w-0">
      <p className="text-xs font-medium text-gray-500 truncate">{title}</p>
      <p className="text-sm font-semibold text-gray-800 break-all">{value}</p>
    </div>
  </div>
);

// === Komponen Helper: ReportHeaderInfo (Tidak Berubah) ===
const ReportHeaderInfo = ({ report, profiles }: { report: Report, profiles: Profile[], status: TaskAssignment['status'] }) => {
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="text-sm">
      {/* GRID DETAIL */}
      <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-gray-700 pt-2">
        <div className="flex justify-between">
          <span className="text-gray-500">Kategori Layanan:</span>
          <span className="font-medium text-gray-800">{report?.layanan || "-"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Sub Layanan:</span>
          <span className="font-medium text-gray-800">{report?.sub_layanan || "-"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Tanggal Dibuat:</span>
          <span className="font-medium text-gray-800">{formatDate(report?.created_at || new Date().toISOString())}</span>
        </div>
      </div>
      <hr className="my-4 border-gray-200" />
    </div>
  );
};

// === Komponen Helper: File Upload (Tidak Berubah) ===
interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  removeFile: () => void;
  acceptedTypes?: { [key: string]: string[] };
  maxSize?: number;
}

function FileUploadComponent({
  onFileSelect,
  selectedFile,
  removeFile,
  acceptedTypes = {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  },
  maxSize = 10 * 1024 * 1024
}: FileUploadProps) {

  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    setError(null)

    if (fileRejections.length > 0) {
      const firstError = fileRejections[0].errors[0];
      if (firstError.code === 'file-too-large') {
        setError(`File terlalu besar. Maksimal ${maxSize / 1024 / 1024}MB.`)
      } else if (firstError.code === 'file-invalid-type') {
        setError('Tipe file tidak diizinkan.')
      } else {
        setError(firstError.message)
      }
      onFileSelect(null)
      return;
    }

    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0])
    }
  }, [onFileSelect, maxSize])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    maxSize: maxSize,
    multiple: false
  })

  const acceptedExtensions = Object.values(acceptedTypes).flat().join(', ').toUpperCase()

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-5 w-full cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${error ? 'border-red-500 bg-red-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center text-center">
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              {isDragActive ? 'Jatuhkan file di sini...' : 'Klik atau tarik file'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {acceptedExtensions} (MAX. {maxSize / 1024 / 1024}MB)
            </p>
            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          </div>
        </div>
      ) : (
        <div className="border border-gray-300 rounded-lg p-3 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-800 truncate">{selectedFile.name}</span>
          </div>
          <button onClick={removeFile} className="text-gray-500 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// === Komponen Helper: Paginasi (Tidak Berubah) ===
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const PaginationControls = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center space-x-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 text-sm text-gray-700 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm font-medium text-gray-700 px-2">
        Halaman {currentPage} dari {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 text-sm text-gray-700 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};


// --- FUNGSI: Hitung Progress (Tidak berubah) ---
const calculateProgress = (task: TaskAssignment): number => {
  if (task.status === 'completed' || task.status === 'pending-review') return 100;
  if (task.todo_list.length === 0) {
    return (task.file_path || task.revised_file_path) ? 50 : 0;
  }

  const completedCount = task.completed_tasks?.length || 0;
  const totalCount = task.todo_list.length;

  const checklistProgress = (completedCount / totalCount) * 80;
  const uploadProgress = (task.file_path || task.revised_file_path) ? 20 : 0;

  return Math.min(Math.round(checklistProgress + uploadProgress), 99);
};


export function StaffDashboard() {
  const { state, dispatch } = useApp();
  const { currentUser } = state;

  // === State ===
  const [assignedTasks, setAssignedTasks] = useState<TaskAssignment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskAssignment | null>(null);
  const [completedTodos, setCompletedTodos] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  // State untuk Verifikasi Dokumen
  const [staffDocVerification, setStaffDocVerification] = useState<Record<string, string>>({});

  const [revisionFile, setRevisionFile] = useState<File | null>(null);
  const [staffNotes, setStaffNotes] = useState("");
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [workNotes, setWorkNotes] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const TASKS_PER_PAGE = 10;
  const totalPages = Math.ceil(assignedTasks.length / TASKS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setSelectedTask(null);
    }
  };

  // FUNGSI HELPER BARU
  const getProfileName = (userId: string | null | undefined) => {
    if (!userId || !profiles) return "";
    const profile = profiles.find((p) => p.user_id === userId);
    return profile?.full_name ? `${profile.full_name}, S.H` : "";
  };

  const getStatusText = (currentStatus: TaskAssignment['status']) => {
    if (currentStatus === 'in-progress') return 'Dalam Pengerjaan';
    if (currentStatus === 'revision-required') return 'Membutuhkan Revisi';
    if (currentStatus === 'pending-review') return 'Menunggu Review';
    return 'Status Tidak Dikenal';
  };

  const getStatusColor = (currentStatus: TaskAssignment['status']) => {
    if (currentStatus === 'in-progress') return 'bg-blue-100 text-blue-800';
    if (currentStatus === 'revision-required') return 'bg-red-100 text-red-800';
    if (currentStatus === 'pending-review') return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  }

  const fetchData = async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Fetch Profiles
      if (profiles.length === 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, full_name");

        if (profilesError) throw profilesError;
        setProfiles((profilesData as Profile[]) || []);
      }

      // Fetch Tasks
      // PASTIKAN task_assignments di Supabase memiliki kolom coordinator_id
      const { data: tasksData, error: tasksError } = await supabase
        .from("task_assignments")
        .select("*, reports(*)")
        .eq("staff_id", currentUser.id)
        .in('status', ['in-progress', 'revision-required'])
        .order("created_at", { ascending: false });

      if (tasksError) throw tasksError;
      setAssignedTasks((tasksData as TaskAssignment[]) || []);

      if (tasksData && tasksData.length > 0 && (!selectedTask || !tasksData.some(t => t.id === selectedTask.id))) {
        handleSelectTask(tasksData[0] as TaskAssignment);
      } else if (tasksData && tasksData.length === 0) {
        setSelectedTask(null);
      }

    } catch (error: any) {
      console.error("Gagal mengambil data tugas:", error);
      toast.error("Gagal memuat tugas. Pastikan koneksi dan konfigurasi Supabase sudah benar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchData();
    }
  }, [currentUser?.id]);

  useEffect(() => {
    const fetchAttachments = async () => {
      if (!selectedTask || !selectedTask.reports?.id) {
        setAttachments([]);
        return;
      }
      setLoadingAttachments(true);

      try {
        const { data, error } = await supabase
          .from("file_attachments")
          .select("*")
          .eq("report_id", selectedTask.reports.id);
        if (error) throw error;

        const formattedData: FileAttachment[] = (data || []).map(file => ({
          id: file.id,
          fileName: file.file_name,
          fileUrl: file.file_url,
          uploadedBy: "Sistem",
          uploadedAt: file.created_at,
        }));
        setAttachments(formattedData);

      } catch (error) {
        console.error("Gagal memuat lampiran file:", error);
        toast.error("Gagal memuat lampiran file.");
        setAttachments([]);
      } finally {
        setLoadingAttachments(false);
      }
    };
    fetchAttachments();
  }, [selectedTask]);

  const handleSelectTask = (task: TaskAssignment) => {
    setSelectedTask(task);
    setCompletedTodos(task.completed_tasks || []);
    // Reset Verifikasi Dokumen saat tugas baru dipilih
    setStaffDocVerification({});
    setRevisionFile(null);
    setStaffNotes("");
    setIsSubmittingRevision(false);
    setOriginalFile(null);
    setWorkNotes("");
  };

  const handleToggleTodo = (taskName: string) => {
    const newCompleted = completedTodos.includes(taskName)
      ? completedTodos.filter(t => t !== taskName)
      : [...completedTodos, taskName];
    setCompletedTodos(newCompleted);
  };

  // FUNGSI: Handle Verifikasi Dokumen (Diaktifkan kembali)
  const handleStaffDocumentChange = (doc: string, status: string) => {
    setStaffDocVerification(prev => ({
      ...prev,
      [doc]: status
    }));
  };

  const handleRemoveOriginalFile = () => setOriginalFile(null);
  const handleRemoveRevisionFile = () => setRevisionFile(null);


  const handleSubmitWork = async () => {
    if (!selectedTask || !originalFile) {
      toast.error("Harap lengkapi semua persyaratan (Checklist & Unggah File).");
      return;
    }

    const allTodosCompleted = todoListItems.every(t => completedTodos.includes(t));
    if (!allTodosCompleted) {
      toast.error("Harap selesaikan semua To-Do List sebelum mengirim.");
      return;
    }

    if (requiredDocs.length > 0 && !allDocsVerifiedByStaff) {
      toast.error("Harap selesaikan Verifikasi Dokumen Klien.");
      return;
    }

    try {
      // Logika upload file ke Supabase storage
      const cleanName = originalFile.name.replace(/[^a-zA-Z0-9.]/g, '_').toLowerCase();
      const filePath = `public/${Date.now()}_${cleanName}`;
      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, originalFile);
      if (uploadError) throw uploadError;

      // Update task_assignments
      const { error } = await supabase
        .from("task_assignments")
        .update({
          status: "pending-review",
          progress: 100,
          completed_tasks: completedTodos,
          completed_at: new Date().toISOString(),
          file_path: filePath,
          Staff_notes: workNotes
        })
        .eq("id", selectedTask.id);

      if (error) throw error;

      // Insert workflow_history
      await supabase
        .from('workflow_history')
        .insert({
          report_id: selectedTask.reports.id,
          action: 'Pekerjaan Selesai',
          user_id: currentUser?.id,
          status: 'pending-review',
          notes: `Staff mengirimkan hasil pekerjaan awal. Catatan: ${workNotes || '-'}`,
        });

      toast.success("Pekerjaan berhasil dikirim untuk review!");
      setSelectedTask(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error("Terjadi kesalahan saat mengirim pekerjaan: " + err.message);
    }
  };


  const handleSubmitRevision = async () => {
    if (!revisionFile) {
      toast.error("Silakan unggah berkas revisi Anda.");
      return;
    }
    if (!currentUser || !selectedTask) {
      toast.error("Sesi tidak valid atau tugas tidak dipilih.");
      return;
    }

    setIsSubmittingRevision(true);

    try {
      const cleanName = revisionFile.name.replace(/[^a-zA-Z0-9.]/g, '_').toLowerCase();
      const fileName = `${Date.now()}_${cleanName}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('revised_documents')
        .upload(filePath, revisionFile);

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("task_assignments")
        .update({
          status: "pending-review",
          progress: 100,
          revised_file_path: filePath,
          staff_revision_notes: staffNotes,
          completed_at: new Date().toISOString()
        })
        .eq("id", selectedTask.id);

      if (updateError) throw updateError;

      await supabase
        .from('workflow_history')
        .insert({
          report_id: selectedTask.reports.id,
          action: 'Revisi Selesai',
          user_id: currentUser.id,
          status: 'pending-review',
          notes: `Staff mengirimkan hasil revisi. File: ${fileName}. Catatan: ${staffNotes || '-'}`,
        })

      toast.success("Hasil revisi berhasil dikirim!");

      setSelectedTask(null);
      setRevisionFile(null);
      setStaffNotes("");

      fetchData();

    } catch (error: any) {
      console.error("Error submitting revision:", error);
      toast.error(error.message || "Gagal mengirim revisi.");
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  const handleLogout = () => {
    dispatch({ type: "LOGOUT" });
    toast.success("Anda berhasil logout.");
  };

  // --- Logika Render (Untuk Pengecekan Kriteria Submission) ---
  const getNormalizedTodoList = () => {
    if (!selectedTask || !selectedTask.todo_list || !Array.isArray(selectedTask.todo_list)) {
      return ["Jadwalkan/Agendakan"];
    }
    return selectedTask.todo_list;
  };

  const todoListItems = getNormalizedTodoList();
  const allTodosCompleted = todoListItems.every(task => completedTodos.includes(task));

  // LOGIKA PAGINASI
  const indexOfLastTask = currentPage * TASKS_PER_PAGE;
  const indexOfFirstTask = indexOfLastTask - TASKS_PER_PAGE;
  const currentTasks = assignedTasks.slice(indexOfFirstTask, indexOfLastTask);

  // Cek jika sedang revisi (untuk menentukan tampilan submission)
  const isRevisionMode = selectedTask?.status === 'revision-required';

  // LOGIKA REQUIRED DOCS
  let requiredDocs: string[] = [];
  if (selectedTask && selectedTask.reports) {
    const serviceKey = selectedTask.reports.sub_layanan || selectedTask.reports.layanan;
    // Menggunakan DOCUMENT_REQUIREMENTS yang diimpor
    requiredDocs = (DOCUMENT_REQUIREMENTS as any)[serviceKey] || [];
  }

  // Semua dokumen harus diverifikasi "Ada"
  const allDocsVerifiedByStaff = requiredDocs.length === 0 ||
    requiredDocs.every(doc => staffDocVerification[doc] === "Ada");


  if (loading) {
    return <div className="flex h-screen items-center justify-center text-gray-500">Memuat tugas Anda...</div>;
  }


  // === JSX (TAMPILAN AKHIR) ===
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Kolom Kiri: Daftar Tugas (W-80) */}
      <div className="w-80 flex-shrink-0 bg-white border-r flex flex-col shadow-xl">
        <div className="p-4 border-b bg-blue-600 text-white">
          <h2 className="text-xl font-bold">📝 Tugas Aktif ({assignedTasks.length})</h2>
        </div>
        <div className="overflow-y-auto flex-grow">
          {currentTasks.map(task => (
            <StaffTaskCard
              key={task.id}
              task={task}
              onClick={() => handleSelectTask(task)}
              isSelected={selectedTask?.id === task.id}
            />
          ))}
          {assignedTasks.length === 0 && <p className="text-center text-gray-500 p-6 text-sm">Tidak ada tugas aktif.</p>}
        </div>
        <div className="p-4 border-t bg-gray-50">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
          <button onClick={handleLogout} className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 rounded-lg transition-colors border">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      {/* Kolom Kanan: Detail Tugas */}
      <div className="flex-grow overflow-y-auto p-6 lg:p-8">
        {selectedTask ? (
          <div className="max-w-4xl mx-auto space-y-6 bg-white p-6 rounded-xl shadow-lg border">

            {/* JUDUL UTAMA */}
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">{selectedTask.reports?.hal || "Detail Tugas"}</h1>

            {/* 1. INFORMASI KUNCI (NOMOR SURAT, KOORDINATOR, STATUS) - LEBIH INFORMATIF */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-gray-200">
              <KeyDetailCard
                title="Status Tugas"
                value={getStatusText(selectedTask.status)}
                icon={<div className={`${getStatusColor(selectedTask.status)} p-1 rounded-full`}><Info className="w-4 h-4" /></div>}
              />
              <KeyDetailCard
                title="Nomor Surat Referensi"
                value={selectedTask.reports?.no_surat || "D0/XXXX"}
                icon={<FileText className="w-5 h-5 text-purple-600" />}
              />
              <KeyDetailCard
                title="Ditugaskan Oleh Koordinator"
                // PERBAIKAN: Mengambil ID Koordinator langsung dari task_assignments
                value={getProfileName(selectedTask.coordinator_id) || "Koordinator Tidak Diketahui"}
                icon={<User className="w-5 h-5 text-green-600" />}
              />
            </div>

            {/* 2. Detail Laporan (Grid Detail) */}
            <ReportHeaderInfo
              report={selectedTask.reports}
              profiles={profiles}
              status={selectedTask.status}
            />

            {/* 3. Konten Utama (Dua Kolom) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

              {/* === KOLOM KIRI (To-Do List, Catatan, Verifikasi) === */}
              <div className="space-y-4">

                {/* --- TO-DO LIST --- */}
                <h3 className="text-base font-semibold text-purple-700 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" /> To-Do List
                </h3>
                <SimpleCard className="shadow-inner bg-gray-50 border-gray-300">
                  <div className="space-y-2">
                    {todoListItems.map((todo, idx) => (
                      <label key={idx} className="flex items-start gap-3 text-sm cursor-pointer">
                        <div className={`mt-1 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${completedTodos.includes(todo) ? 'bg-green-500 border-green-500' : 'border-gray-400 bg-white'}`}>
                          {completedTodos.includes(todo) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={completedTodos.includes(todo)}
                          onChange={() => handleToggleTodo(todo)}
                        />
                        <span className={`${completedTodos.includes(todo) ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                          {todo}
                        </span>
                      </label>
                    ))}
                  </div>
                </SimpleCard>

                {/* --- CATATAN KOORDINATOR --- */}
                <h3 className="text-base font-semibold text-gray-700 flex items-center gap-2 pt-4">
                  <MessageSquare className="w-5 h-5 text-gray-500" /> Catatan Koordinator
                </h3>
                <SimpleCard>
                  <textarea
                    value={selectedTask.notes || "Tidak ada catatan dari Koordinator."}
                    readOnly
                    rows={3}
                    className="w-full p-0 border-0 focus:ring-0 text-sm bg-white resize-none text-gray-700"
                  />
                </SimpleCard>

                {/* --- BLOK VERIFIKASI DOKUMEN (DIPERBAIKI) --- */}
                {requiredDocs.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-green-700 flex items-center gap-2 pt-4">
                      <CheckCircle className="w-5 h-5" /> Verifikasi Dokumen Klien
                    </h3>
                    <SimpleCard className="shadow-inner bg-green-50 border-green-300">
                      <div className="space-y-3">
                        {requiredDocs.map(doc => (
                          <div key={doc} className={`p-3 rounded-lg border ${staffDocVerification[doc] === "Ada" ? 'bg-white border-green-200' : 'bg-white border-gray-200'}`}>
                            <p className="font-medium text-sm text-gray-800">{doc}</p>
                            <div className="flex gap-4 mt-2">
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="radio"
                                  name={`staff-${doc}-${selectedTask.id}`}
                                  value="Ada"
                                  onChange={() => handleStaffDocumentChange(doc, "Ada")}
                                  checked={staffDocVerification[doc] === "Ada"}
                                  className="w-4 h-4 text-green-600 focus:ring-green-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">Ada</span>
                              </label>
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="radio"
                                  name={`staff-${doc}-${selectedTask.id}`}
                                  value="Tidak Ada"
                                  onChange={() => handleStaffDocumentChange(doc, "Tidak Ada")}
                                  checked={staffDocVerification[doc] === "Tidak Ada"}
                                  className="w-4 h-4 text-red-600 focus:ring-red-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">Tidak Ada</span>
                              </label>
                            </div>
                          </div>
                        ))}
                        <p className={`text-xs text-right font-medium pt-2 ${allDocsVerifiedByStaff ? 'text-green-700' : 'text-red-700'}`}>
                          Status Verifikasi: {allDocsVerifiedByStaff ? 'Semua dokumen diverifikasi ada' : 'Verifikasi dokumen klien diperlukan'}
                        </p>
                      </div>
                    </SimpleCard>
                  </div>
                )}
              </div>

              {/* === KOLOM KANAN (Lampiran) === */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-purple-700 flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Dokumen Lampiran
                </h3>

                {/* --- LINK DOKUMEN EKSTERNAL --- */}
                <SimpleCard className="bg-yellow-50 border-yellow-300 shadow-inner">
                  <p className="text-sm font-medium text-purple-800">Link Dokumen Eksternal</p>
                  <hr className="my-2 border-yellow-200" />
                  {selectedTask.reports.link_documents ? (
                    <a
                      href={selectedTask.reports.link_documents}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all text-sm font-medium"
                    >
                      Buka Link Dokumen
                    </a>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Tidak ada link dokumen eksternal.</p>
                  )}
                </SimpleCard>

                {/* --- LAMPIRAN FILE AWAL (DIPERBAIKI) --- */}
                <SimpleCard>
                  <p className="text-sm font-medium text-purple-800">Lampiran File Awal (Pelapor/TU)</p>
                  <hr className="my-2 border-gray-200" />

                  {loadingAttachments ? (
                    <p className="text-gray-500 text-sm flex items-center gap-1">
                      <Info className="w-4 h-4" /> Memuat dokumen...
                    </p>
                  ) : attachments.length > 0 ? (
                    <FileViewer files={attachments} />
                  ) : (
                    // Jika tidak ada lampiran
                    <div className="p-3 bg-gray-100 border border-gray-300 rounded-md">
                      <p className="text-sm text-gray-500 italic">Tidak ada dokumen lampiran dari pelapor/TU.</p>
                    </div>
                  )}

                  {/* Tempat File Pekerjaan yang Diunggah Staff (History) */}
                  {(selectedTask.file_path || selectedTask.revised_file_path) && (
                    <div className="p-3 mt-4 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800 font-medium flex items-center gap-1">
                        <Check className="w-4 h-4" /> File Pekerjaan Terakhir Diunggah
                      </p>
                      <p className="text-xs text-blue-600 truncate pt-1">
                        {selectedTask.file_path || selectedTask.revised_file_path}
                      </p>
                    </div>
                  )}
                </SimpleCard>
              </div>
            </div>

            {/* 4. BLOK SUBMISSION (Full Width di Bawah) */}
            <div className="pt-4 mt-6 border-t border-green-500">
              <h3 className="text-lg font-bold text-green-700 flex items-center gap-2">
                <Check className="w-6 h-6" /> Serahkan Pekerjaan Anda
              </h3>

              <SimpleCard className="mt-4 p-5">
                {/* Tampilan Submit Pekerjaan Awal (Jika bukan revisi) */}
                {!isRevisionMode && (
                  <div className="space-y-4">
                    <FileUploadComponent
                      onFileSelect={setOriginalFile}
                      selectedFile={originalFile}
                      removeFile={handleRemoveOriginalFile}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Catatan untuk Koordinator (Opsional):</label>
                      <textarea
                        value={workNotes}
                        onChange={(e) => setWorkNotes(e.target.value)}
                        placeholder="Tulis catatan tambahan..."
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>

                    <button
                      onClick={handleSubmitWork}
                      // Tombol aktif jika Checklist SELESAI, DOKUMEN DIVERIFIKASI, dan file diunggah
                      disabled={!allTodosCompleted || !originalFile || !allDocsVerifiedByStaff}
                      className="w-full inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      <Send className="w-5 h-5" /> Selesai & Kirim untuk Review
                    </button>
                    <p className="mt-2 text-xs text-gray-500 text-center">
                      Tombol akan aktif setelah semua persyaratan (**Checklist**, **Verifikasi Dokumen**, dan **Upload File**) selesai.
                    </p>
                  </div>
                )}

                {/* Tampilan Submit Revisi (Jika status revision-required) */}
                {isRevisionMode && (
                  <div className="space-y-4">
                    <p className="text-sm text-red-600 font-medium">⚠️ {selectedTask.revision_notes || "Silakan lakukan revisi sesuai instruksi Koordinator."}</p>
                    <FileUploadComponent
                      onFileSelect={setRevisionFile}
                      selectedFile={revisionFile}
                      removeFile={handleRemoveRevisionFile}
                    />
                    <textarea
                      value={staffNotes}
                      onChange={(e) => setStaffNotes(e.target.value)}
                      placeholder="Catatan Staff tentang revisi yang dilakukan..."
                      rows={2}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={handleSubmitRevision}
                      disabled={isSubmittingRevision || !revisionFile}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-sm hover:bg-red-700 disabled:bg-gray-400 transition-colors text-sm"
                    >
                      <Send className="w-5 h-5" />
                      {isSubmittingRevision ? 'Mengirim Revisi...' : 'Kirim Hasil Revisi'}
                    </button>
                  </div>
                )}
              </SimpleCard>

            </div>

          </div>
        ) : (
          // Tampilan Awal (Belum Memilih Tugas)
          <div className="flex h-full items-center justify-center text-center text-gray-500">
            <div>
              <FileText size={48} className="mx-auto text-gray-300" />
              <h3 className="mt-2 text-lg font-medium">👋 Selamat Datang, {currentUser?.full_name || "Staff"}!</h3>
              <p className="mt-1 text-sm">Pilih laporan dari daftar **Tugas Aktif** di sebelah kiri untuk mulai bekerja.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}