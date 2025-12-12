"use client"
import { useState, useEffect, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { supabase } from "../../../lib/supabaseClient";
import { toast } from "../../../lib/toast";
import {
  X, Users, Info, Send, FileText, Calendar, Clock, Download,
  CornerDownRight, ListChecks, CheckCircle, Loader2
} from "lucide-react";
import { TODO_ITEMS, FileAttachment } from "../../types";
import { FileViewer } from "../FileViewer";

// Fungsi utilitas untuk memformat tanggal
const formatDate = (dateString: string | null, includeTime: boolean = true) => {
  if (!dateString) return "-";
  try {
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta'
    };

    // Tambahkan jam dan menit jika includeTime adalah true
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }

    return new Date(dateString).toLocaleDateString('id-ID', options);
  } catch {
    return dateString;
  }
};

export function ReportDetailsModal({ report, profiles, onClose }) {
  const { state } = useApp();
  const { currentUser } = state;

  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);

  // State untuk penugasan staff baru
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [selectedTodos, setSelectedTodos] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);

  // Mengambil data To-Do dan Notes dari tugas yang sudah ada (jika ada)
  useEffect(() => {
    if (report) {
      const existingAssignments = report.task_assignments || [];
      // Gunakan To-Do dan Notes dari tugas pertama yang sudah ada sebagai default
      if (existingAssignments.length > 0) {
        setSelectedTodos(existingAssignments[0].todo_list || []);
        setNotes(existingAssignments[0].notes || "");
      } else {
        setSelectedTodos([]);
        setNotes("");
      }
    }
  }, [report]);

  // Mengambil lampiran file dari database
  useEffect(() => {
    const fetchAttachments = async () => {
      if (!report?.id) return;
      setIsLoadingFiles(true);
      try {
        const { data, error } = await supabase.from("file_attachments").select("*").eq("report_id", report.id);
        if (error) throw error;
        const formattedData: FileAttachment[] = data.map(file => ({
          id: file.id,
          fileName: file.file_name,
          fileUrl: file.file_url,
          uploadedBy: "Pengunggah", // Data ini mungkin perlu diambil dari tabel profiles
          uploadedAt: file.created_at,
        }));
        setAttachments(formattedData || []);
      } catch (error) {
        toast.error("Gagal memuat lampiran file.");
      } finally {
        setIsLoadingFiles(false);
      }
    };
    fetchAttachments();
  }, [report?.id]);

  if (!report || !profiles) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-xl shadow-2xl">Memuat data...</div>
      </div>
    );
  }

  const getProfileName = (profileId: string | undefined) => {
    if (!profileId) return "Sistem/TU";
    const profile = profiles.find((p: any) => p.id === profileId || p.user_id === profileId);
    return profile?.full_name || "ID Tidak Dikenali";
  };

  const handleStaffChange = (staffProfileId: string, checked: boolean) => setSelectedStaffIds(prev => checked ? [...prev, staffProfileId] : prev.filter(id => id !== staffProfileId));
  const handleTodoChange = (todoTask: string, checked: boolean) => setSelectedTodos(prev => checked ? [...prev, todoTask] : prev.filter(t => t !== todoTask));

  const handleAssignTasks = async () => {
    if (selectedStaffIds.length === 0) {
      toast.error("Pilih minimal satu staff baru untuk ditugaskan.");
      return;
    }
    if (selectedTodos.length === 0) {
      toast.error("Pilih minimal satu To-Do untuk ditugaskan.");
      return;
    }

    setIsSubmitting(true);
    try {
      const coordinatorProfile = profiles.find((p: any) => p.user_id === currentUser?.id);
      if (!coordinatorProfile) throw new Error("Gagal memverifikasi profil koordinator.");

      const taskAssignmentsData = selectedStaffIds.map(staffProfileId => ({
        report_id: report.id,
        staff_id: staffProfileId,
        coordinator_id: coordinatorProfile.id,
        todo_list: selectedTodos,
        status: 'in-progress',
        notes: notes,
      }));

      const { error: taskInsertError } = await supabase.from('task_assignments').insert(taskAssignmentsData);
      if (taskInsertError) throw new Error(`Gagal menyimpan tugas: ${taskInsertError.message}`);

      const selectedStaffNames = profiles.filter((p: any) => selectedStaffIds.includes(p.id)).map((p: any) => p.full_name).join(', ');
      await supabase.from('workflow_history').insert({
        report_id: report.id,
        action: 'Laporan ditugaskan (Baru)',
        user_id: currentUser?.id,
        status: 'in-progress',
        notes: `Ditugaskan kepada: ${selectedStaffNames}.`,
      });

      // Update status laporan menjadi 'in-progress'
      await supabase.from('reports').update({
        status: 'in-progress',
        current_holder: currentUser.id,
      }).eq('id', report.id);

      toast.success("Tugas berhasil ditugaskan!");

      // --- PENYESUAIAN 1: Reset kolom penugasan ---
      setSelectedStaffIds([]);
      setSelectedTodos([]);
      setNotes("");
      // Tidak perlu onClose() di sini agar modal tetap terbuka dan user bisa menugaskan staff lain jika diperlukan

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForwardToTU = async () => {
    if (!confirm("Anda yakin ingin menyetujui dan meneruskan laporan ini ke Tata Usaha (TU)?")) {
      return;
    }
    setIsForwarding(true);
    try {
      const { error: updateError } = await supabase
        .from('reports')
        .update({ status: 'pending-approval-tu', current_holder: null })
        .eq('id', report.id);
      if (updateError) throw updateError;

      await supabase.from('workflow_history').insert({
        report_id: report.id,
        action: 'Laporan disetujui dan diteruskan ke TU',
        user_id: currentUser?.id,
        status: 'pending-approval-tu',
        notes: 'Semua tugas staff telah selesai, koordinator meneruskan untuk persetujuan TU.',
      });

      toast.success("Laporan berhasil diteruskan ke TU!");
      onClose();

    } catch (error: any) {
      toast.error("Gagal meneruskan laporan: " + error.message);
    } finally {
      setIsForwarding(false);
    }
  };

  // --- LOGIC DETAIL & PENUGASAN ---
  const assignedTasks = report.task_assignments || [];
  const alreadyAssignedStaffIds = assignedTasks.map((a: any) => a.staff_id);
  const availableStaff = useMemo(() => profiles.filter((p: any) => p.role === 'Staff' && p.id && !alreadyAssignedStaffIds.includes(p.id)), [profiles, alreadyAssignedStaffIds]);
  const allTasksCompleted = assignedTasks.length > 0 && assignedTasks.every((task: any) => task.status === 'completed' || task.status === 'pending-review');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header Modal */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Info className="w-6 h-6 text-blue-600" /> Detail Laporan: <span className="text-blue-700">{report.no_surat || report.trackingNumber}</span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">

          {/* Section 1: Detail Surat & Dokumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Kolom Kiri: Informasi Dokumen */}
            <div>
              <h3 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" /> Informasi Dokumen
              </h3>
              <div className="space-y-3 text-sm p-4 bg-gray-50 rounded-lg border">
                <div className="grid grid-cols-[1fr_2fr] gap-x-4">
                  <span className="text-gray-500">No. Surat:</span>
                  <span className="font-medium text-gray-900 break-words">{report.no_surat || "-"}</span>
                  <span className="text-gray-500">Perihal:</span>
                  <span className="font-medium text-gray-900 break-words">{report.hal || "-"}</span>
                  <span className="text-gray-500">Dari:</span>
                  <span className="font-medium text-gray-900 break-words">{report.dari || "-"}</span>

                  {/* --- PENYESUAIAN 2: Hilangkan jam pada tanggal surat --- */}
                  <span className="text-gray-500">Tanggal Surat:</span>
                  <span className="font-medium text-gray-900 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(report.tanggal_surat, false)}</span>

                  <span className="text-gray-500">Diterima TU:</span>
                  <span className="font-medium text-gray-900 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDate(report.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Kolom Kanan: Layanan & Status */}
            <div>
              <h3 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
                <CornerDownRight className="w-5 h-5 text-gray-600" /> Informasi Penugasan
              </h3>
              <div className="space-y-3 text-sm p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="grid grid-cols-[1fr_2fr] gap-x-4">
                  <span className="text-blue-700 font-medium">Layanan:</span>
                  <span className="font-bold text-blue-900">{report.layanan || "-"}</span>
                  {report.sub_layanan && (
                    <>
                      <span className="text-blue-700 font-medium">Sub Layanan:</span>
                      <span className="font-bold text-blue-900">{report.sub_layanan}</span>
                    </>
                  )}
                  <span className="text-blue-700 font-medium">Status Saat Ini:</span>
                  <span className={`font-bold capitalize ${report.status === 'completed' ? 'text-green-600' : report.status.includes('revision') ? 'text-red-600' : 'text-orange-600'}`}>
                    {report.status.replace('-', ' ')}
                  </span>
                  <span className="text-blue-700 font-medium">Dipegang Oleh:</span>
                  <span className="font-bold text-gray-900">{getProfileName(report.current_holder)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Section 2: File Lampiran */}
          <div>
            <h3 className="text-lg font-semibold mb-3 border-b pb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" /> File Terlampir (Awal)
            </h3>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              {isLoadingFiles ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Memuat file...
                </div>
              ) : attachments.length > 0 ? (
                <FileViewer files={attachments} canDownload={true} title="" />
              ) : (
                <p className="text-sm text-gray-500 italic py-2">Tidak ada file terlampir</p>
              )}
              {report.link_documents && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Download className="w-4 h-4 text-blue-500" /> Link Dokumen Eksternal
                  </h4>
                  <a
                    href={report.link_documents}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all text-sm block bg-gray-100 p-2 rounded"
                  >
                    {report.link_documents}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Penugasan Staff */}
          <div>
            <h3 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" /> Penugasan & Status Tugas
            </h3>

            {/* Status Tugas yang Sudah Ditugaskan */}
            {assignedTasks.length > 0 && (
              <div className="mb-6 bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="font-bold mb-3 text-purple-900 flex items-center gap-2">
                  <ListChecks className="w-4 h-4" /> Staff yang Sudah Ditugaskan:
                </h4>
                <ul className="space-y-2">
                  {assignedTasks.map((task: any) => (
                    <li key={task.id} className="text-sm flex justify-between items-center bg-white p-3 rounded shadow-sm border border-purple-100">
                      <span className="font-medium text-gray-900">{getProfileName(task.staff_id)}</span>
                      <span className={`font-semibold capitalize text-xs px-2 py-1 rounded-full ${task.status === 'completed' || task.status === 'pending-review' ? 'bg-green-100 text-green-700' : task.status === 'revision-required' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {task.status.replace('-', ' ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Penugasan Staff Baru & To-Do List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Pilih Staff Baru */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-800">Pilih Staff Baru:</h4>
                <div className="max-h-56 overflow-y-auto space-y-1 p-3 border rounded-md bg-white shadow-inner">
                  {availableStaff.length > 0 ? (
                    availableStaff.map((staff: any) => (
                      <label key={staff.id} className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer transition-colors">
                        <input type="checkbox" onChange={(e) => handleStaffChange(staff.id, e.target.checked)} checked={selectedStaffIds.includes(staff.id)} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                        <span className="ml-3 text-sm font-medium">{staff.full_name}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 p-2 italic">Semua staff yang relevan sudah ditugaskan.</p>
                  )}
                </div>
              </div>

              {/* Daftar To-Do */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-800">Daftar To-Do (Instruksi Kerja):</h4>
                <div className="space-y-1 max-h-56 overflow-y-auto p-3 border rounded-md bg-white shadow-inner">
                  {TODO_ITEMS.map((todo) => (
                    <label key={todo} className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer transition-colors">
                      <input type="checkbox" onChange={(e) => handleTodoChange(todo, e.target.checked)} checked={selectedTodos.includes(todo)} className="form-checkbox h-4 w-4 text-purple-600 rounded" />
                      <span className="ml-3 text-sm">{todo}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Catatan untuk Staff */}
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2 text-gray-700" htmlFor="notes-textarea">Catatan Tambahan (untuk staff):</label>
              <textarea id="notes-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm" placeholder="Tambahkan instruksi spesifik di sini..." />
            </div>

            {/* Tombol Aksi */}
            <div className="mt-8 flex flex-wrap items-center justify-end gap-4 border-t pt-4">
              <button
                onClick={handleAssignTasks}
                disabled={isSubmitting || selectedStaffIds.length === 0 || selectedTodos.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-md"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users size={16} />}
                {isSubmitting ? "Menugaskan..." : `Tugaskan Staff Baru (${selectedStaffIds.length})`}
              </button>

              {allTasksCompleted && (
                <button
                  onClick={handleForwardToTU}
                  disabled={isForwarding}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-md"
                >
                  <Send size={16} />
                  {isForwarding ? "Meneruskan..." : "Setujui & Teruskan ke TU"}
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Footer Modal (untuk penutupan yang lebih jelas) */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors shadow-sm">Tutup Detail</button>
        </div>

      </div>
    </div>
  );
}