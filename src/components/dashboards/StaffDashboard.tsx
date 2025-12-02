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
  X
} from "lucide-react"
import { useDropzone } from 'react-dropzone'
import { FileViewer } from "../FileViewer"
import { toast } from "../../../lib/toast"
import { StaffTaskCard } from "../StaffTaskCard"
import { DOCUMENT_REQUIREMENTS, FileAttachment, Report } from "../../types"

// --- Tipe Data ---
type Profile = {
  user_id: string;
  full_name: string;
};

type TaskAssignment = {
  id: string;
  staff_id: string;
  todo_list: string[];
  notes: string;
  status: 'in-progress' | 'revision-required' | 'completed' | 'pending-review';
  revision_notes?: string;
  completed_tasks?: string[];
  reports: Report;
  revised_file_path?: string;
  staff_revision_notes?: string;
  Staff_notes?: string;
};

// === Komponen Helper: Header Info ===
const ReportHeaderInfo = ({ report, profiles }: { report: Report, profiles: Profile[] }) => {
  const getProfileName = (userId: string) => {
    if (!userId || !profiles) return "Sistem";
    const profile = profiles.find((p) => p.user_id === userId);
    return profile?.full_name || "Tidak Dikenali";
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <FileText className="text-blue-500" /> Detail Laporan
      </h3>
      <div className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-4 text-sm">
        <div className="text-gray-500 font-medium">No. Surat:</div>
        <div className="font-semibold text-gray-900">{report?.no_surat || "-"}</div>

        <div className="text-gray-500 font-medium">Perihal:</div>
        <div className="font-medium text-gray-900">{report?.hal || "-"}</div>

        <div className="text-gray-500 font-medium">Jenis Layanan:</div>
        <div className="font-medium text-gray-900">{report?.layanan || "-"}</div>

        <div className="text-gray-500 font-medium">Dari:</div>
        <div className="font-medium text-gray-900">{getProfileName(report?.created_by)}</div>
      </div>
    </div>
  );
};

// === Komponen Helper: File Upload ===
interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  acceptedTypes?: { [key: string]: string[] };
  maxSize?: number;
}

function FileUploadComponent({
  onFileSelect,
  acceptedTypes = {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
  },
  maxSize = 10 * 1024 * 1024
}: FileUploadProps) {

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
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
      setSelectedFile(null)
      onFileSelect(null)
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setSelectedFile(file)
      onFileSelect(file)
    }
  }, [onFileSelect, maxSize])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    maxSize: maxSize,
    multiple: false
  })

  const removeFile = () => {
    setSelectedFile(null)
    onFileSelect(null)
    setError(null)
  }

  const acceptedExtensions = Object.values(acceptedTypes).flat().join(', ').toUpperCase()

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 w-full cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${error ? 'border-red-500 bg-red-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center text-center">
            <Upload className="w-10 h-10 text-gray-400 mb-3" />
            <p className="text-gray-600">
              {isDragActive ? 'Jatuhkan file di sini...' : 'Klik untuk upload atau drag and drop'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {acceptedExtensions} (MAX. {maxSize / 1024 / 1024}MB)
            </p>
            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          </div>
        </div>
      ) : (
        <div className="border border-gray-300 rounded-lg p-4 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <span className="text-sm font-medium text-gray-800">{selectedFile.name}</span>
          </div>
          <button onClick={removeFile} className="text-gray-500 hover:text-red-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}


// === Komponen Utama Dashboard Staff ===
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
  const [staffDocVerification, setStaffDocVerification] = useState<Record<string, string>>({});

  // --- State untuk REVISI ---
  const [revisionFile, setRevisionFile] = useState<File | null>(null);
  const [staffNotes, setStaffNotes] = useState("");
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  // --- State untuk FILE ORIGINAL (AWAL) ---
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [workNotes, setWorkNotes] = useState("");

  // === Pengambilan Data ===
  const fetchData = async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from("task_assignments")
        .select("*, reports(*)")
        .eq("staff_id", currentUser.id)
        .in('status', ['in-progress', 'revision-required'])
        .order("created_at", { ascending: false });

      if (tasksError) throw tasksError;
      setAssignedTasks((tasksData as TaskAssignment[]) || []);

      if (profiles.length === 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, full_name");

        if (profilesError) throw profilesError;
        setProfiles((profilesData as Profile[]) || []);
      }
    } catch (error) {
      console.error("Gagal mengambil data tugas:", error);
      toast.error("Gagal memuat tugas.");
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
        toast.error("Gagal memuat lampiran file.");
      } finally {
        setLoadingAttachments(false);
      }
    };
    fetchAttachments();
  }, [selectedTask]);

  // === Handler ===
  const handleSelectTask = (task: TaskAssignment) => {
    setSelectedTask(task);
    setCompletedTodos(task.completed_tasks || []);
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

  const handleStaffDocumentChange = (doc: string, status: string) => {
    setStaffDocVerification((prev) => ({ ...prev, [doc]: status }));
  };

  // --- FUNGSI: Handle Submit Awal (File Original) ---
  const handleSubmitWork = async () => {
    if (!selectedTask) return;

    if (!originalFile) {
      toast.error("Silakan unggah file hasil pekerjaan Anda sebelum mengirim.");
      return;
    }

    const report = selectedTask.reports;
    const serviceKey = report.sub_layanan || report.layanan;
    const requiredDocs = DOCUMENT_REQUIREMENTS[serviceKey] || [];
    const allDocsVerifiedByStaff = requiredDocs.length === 0 ||
      requiredDocs.every(doc => staffDocVerification[doc] === "Ada");
    if (!allDocsVerifiedByStaff) {
      toast.error("Harap pastikan semua dokumen yang disyaratkan telah diverifikasi 'Ada'.");
      return;
    }

    try {
      const cleanName = originalFile.name.replace(/[^a-zA-Z0-9.]/g, '_').toLowerCase();
      const filePath = `public/${Date.now()}_${cleanName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, originalFile);

      if (uploadError) throw uploadError;

      const { error } = await supabase
        .from("task_assignments")
        .update({
          status: "completed",
          progress: 100,
          completed_tasks: completedTodos,
          completed_at: new Date().toISOString(),
          file_path: filePath,
          Staff_notes: workNotes
        })
        .eq("id", selectedTask.id);

      if (error) throw error;

      toast.success("Pekerjaan berhasil dikirim untuk review!");
      setSelectedTask(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error("Terjadi kesalahan saat mengirim pekerjaan: " + err.message);
    }
  };

  // --- FUNGSI: Handle Submit Revisi ---
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

  // === Logika Render ===
  const getNormalizedTodoList = () => {
    if (!selectedTask || !selectedTask.todo_list || !Array.isArray(selectedTask.todo_list)) {
      return [];
    }
    return selectedTask.todo_list;
  };

  const todoListItems = getNormalizedTodoList();
  const allTodosCompleted = todoListItems.length > 0 && todoListItems.every(task => completedTodos.includes(task));

  let requiredDocs: string[] = [];

  if (selectedTask && selectedTask.reports) {
    const serviceKey = selectedTask.reports.sub_layanan || selectedTask.reports.layanan;
    requiredDocs = DOCUMENT_REQUIREMENTS[serviceKey] || [];
  }
  const allDocsVerifiedByStaff = requiredDocs.length === 0 ||
    requiredDocs.every(doc => staffDocVerification[doc] === "Ada");

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-gray-500">Memuat tugas Anda...</div>;
  }

  // === JSX ===
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Kolom Kiri: Daftar Tugas */}
      <div className="w-96 flex-shrink-0 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Daftar Laporan Masuk</h2>
        </div>
        <div className="overflow-y-auto flex-grow">
          {assignedTasks.map(task => (
            <StaffTaskCard
              key={task.id}
              task={task}
              onSelect={() => handleSelectTask(task)}
              isSelected={selectedTask?.id === task.id}
            />
          ))}
          {assignedTasks.length === 0 && <p className="text-center text-gray-500 p-6">Tidak ada tugas aktif.</p>}
        </div>
        <div className="p-4 border-t bg-gray-50">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 rounded-lg">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      {/* Kolom Kanan: Detail Tugas */}
      <div className="flex-grow overflow-y-auto p-8">
        {selectedTask ? (
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border p-8">

            {/* Header Laporan */}
            <ReportHeaderInfo report={selectedTask.reports} profiles={profiles} />

            <div className="my-6 border-t" />

            {/* --- LINK DOKUMEN --- */}
            {selectedTask.reports.link_documents && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <FileText className="text-blue-500" /> Link Dokumen
                </h3>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <a
                    href={selectedTask.reports.link_documents}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {selectedTask.reports.link_documents}
                  </a>
                </div>
              </div>
            )}

            {/* --- DOKUMEN DARI TU --- */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="text-blue-500" /> Dokumen dari TU
              </h3>
              {loadingAttachments ? (
                <p className="text-gray-500">Memuat dokumen...</p>
              ) : attachments.length > 0 ? (
                <FileViewer files={attachments} />
              ) : (
                <p className="text-gray-500 italic">Tidak ada dokumen lampiran.</p>
              )}
            </div>

            {/* --- TODO LIST --- */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ClipboardList className="text-purple-500" /> Daftar Pekerjaan
              </h3>
              <div className="space-y-3">
                {todoListItems.map((todo, idx) => (
                  <label key={idx} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${completedTodos.includes(todo) ? 'bg-green-500 border-green-500' : 'border-gray-300 bg-white'
                      }`}>
                      {completedTodos.includes(todo) && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={completedTodos.includes(todo)}
                      onChange={() => handleToggleTodo(todo)}
                    />
                    <span className={`text-sm ${completedTodos.includes(todo) ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                      {todo}
                    </span>
                  </label>
                ))}
                {todoListItems.length === 0 && <p className="text-gray-500 italic">Tidak ada item pekerjaan khusus.</p>}
              </div>
            </div>

            {/* --- CATATAN KOORDINATOR --- */}
            {selectedTask.notes && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <MessageSquare className="text-orange-500" /> Catatan Koordinator
                </h3>
                <div className="p-4 bg-orange-50 text-orange-800 rounded-lg border border-orange-100 text-sm">
                  {selectedTask.notes}
                </div>
              </div>
            )}

            {/* --- BLOK VERIFIKASI DOKUMEN --- */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="text-green-500" /> Verifikasi Dokumen
              </h3>
              {requiredDocs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requiredDocs.map(doc => (
                    <div key={doc} className="p-3 rounded-lg border">
                      <p className="font-medium text-sm text-gray-800">{doc}</p>
                      <div className="flex gap-4 mt-2">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={`staff-${doc}-${selectedTask.id}`}
                            value="Ada"
                            onChange={() => handleStaffDocumentChange(doc, "Ada")}
                            checked={staffDocVerification[doc] === "Ada"}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm">Ada</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={`staff-${doc}-${selectedTask.id}`}
                            value="Tidak Ada"
                            onChange={() => handleStaffDocumentChange(doc, "Tidak Ada")}
                            checked={staffDocVerification[doc] === "Tidak Ada"}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm">Tidak Ada</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Tidak ada dokumen yang disyaratkan untuk layanan ini.</p>
              )}
            </div>

            {/* --- AREA UPLOAD REVISI (Jika Status = revision-required) --- */}
            {selectedTask.status === 'revision-required' && (
              <div className="mt-8 mb-4 border-t pt-4 bg-red-50 p-6 rounded-lg border border-red-100">
                <h3 className="text-lg font-semibold text-red-700 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" /> Revisi Diperlukan
                </h3>

                {selectedTask.revision_notes && (
                  <div className="mt-2 mb-4 p-3 bg-white border rounded-md">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Catatan dari Koordinator:</label>
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedTask.revision_notes}</p>
                  </div>
                )}

                <div className="space-y-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Unggah Berkas Revisi:</label>
                    <FileUploadComponent
                      onFileSelect={setRevisionFile}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Catatan Staff (Opsional):</label>
                    <textarea
                      value={staffNotes}
                      onChange={(e) => setStaffNotes(e.target.value)}
                      placeholder="Tulis catatan untuk koordinator jika perlu..."
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <button
                    onClick={handleSubmitRevision}
                    disabled={isSubmittingRevision || !revisionFile}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-sm hover:bg-red-700 disabled:bg-gray-400"
                  >
                    <Send className="w-5 h-5" />
                    {isSubmittingRevision ? 'Mengirim...' : 'Kirim Hasil Revisi'}
                  </button>
                </div>
              </div>
            )}


            {/* --- TOMBOL SELESAI (Untuk Bukan Revisi) --- */}
            {selectedTask.status !== 'revision-required' && (
              <>
                {/* Input Upload File Original */}
                <div className="mt-8 mb-4 border-t pt-4">
                  <h4 className="text-md font-semibold mb-2 text-gray-800">Hasil Pekerjaan</h4>
                  <p className="text-sm text-gray-600 mb-2">Silakan unggah hasil pekerjaan Anda (Word/PDF) di sini sebelum mengirim:</p>
                  <FileUploadComponent
                    onFileSelect={setOriginalFile}
                  />

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Catatan untuk Koordinator (Opsional):</label>
                    <textarea
                      value={workNotes}
                      onChange={(e) => setWorkNotes(e.target.value)}
                      placeholder="Tulis catatan tambahan..."
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="pt-4 text-right">
                  <button
                    onClick={handleSubmitWork}
                    disabled={!allTodosCompleted || !allDocsVerifiedByStaff || !originalFile}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" /> Selesai & Kirim
                  </button>
                </div>
              </>
            )}

          </div>
        ) : (
          // Tampilan Awal (Belum Memilih Tugas)
          <div className="flex h-full items-center justify-center text-center text-gray-500">
            <div>
              <FileText size={48} className="mx-auto text-gray-300" />
              <h3 className="mt-2 text-lg font-medium">Belum ada laporan yang dipilih</h3>
              <p className="mt-1 text-sm">Pilih laporan dari daftar di sebelah kiri.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}