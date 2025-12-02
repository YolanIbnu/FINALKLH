"use client"

import { useState } from "react"
import { useApp } from "../../context/AppContext"
import { supabase } from "../../../lib/supabaseClient"
import { toast } from "../../../lib/toast"
import { X, AlertTriangle } from "lucide-react"

export function RevisionModal({ report, profiles, onClose }) {
  const { state } = useApp()
  const { currentUser } = state

  const [selectedAssignmentId, setSelectedAssignmentId] = useState("")
  const [revisionNotes, setRevisionNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getStaffName = (staffId) => {
    if (!profiles || profiles.length === 0) {
      return 'Memuat nama...';
    }
    const profile = profiles.find(p => p.id === staffId);
    return profile?.full_name || 'Nama Staff Tidak Ditemukan';
  };

  const handleSubmitRevision = async () => {
    if (!selectedAssignmentId || !revisionNotes.trim()) {
      toast.error("Pilih staff dan berikan catatan revisi!")
      return
    }
    setIsSubmitting(true)

    try {
      // Langkah 1: Update tugas spesifik menjadi 'revision-required'. Ini satu-satunya update status.
      await supabase
        .from('task_assignments')
        .update({ 
          status: "revision-required", 
          revision_notes: revisionNotes.trim(), 
          completed_tasks: [] // Reset to-do list staff
        })
        .eq('id', selectedAssignmentId)

      // ✅ Perubahan Utama: Blok kode untuk update tabel 'reports' sudah dihapus dari sini.

      // Langkah 2: Catat di riwayat (tetap dilakukan untuk pelacakan)
      const selectedAssignment = report.task_assignments.find(a => a.id.toString() === selectedAssignmentId);
      const staffName = getStaffName(selectedAssignment?.staff_id);

      await supabase
        .from('workflow_history')
        .insert({
          report_id: report.id,
          action: 'Permintaan Revisi',
          user_id: currentUser?.id,
          status: 'revision-required', // Status di riwayat tetap untuk pelacakan
          notes: `Revisi diminta untuk staff: ${staffName}. Catatan: ${revisionNotes.trim()}`,
        })

      toast.warning(`Permintaan revisi dikirim!`)
      onClose()

    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const assignedStaffList = report.task_assignments || []

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><AlertTriangle className="text-red-500" /> Kirim Revisi</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X /></button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Staff untuk Direvisi:</label>
            <select value={selectedAssignmentId} onChange={(e) => setSelectedAssignmentId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg">
              <option value="">-- Pilih Staff --</option>
              {assignedStaffList.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {getStaffName(assignment.staff_id)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Catatan Revisi:</label>
            <textarea value={revisionNotes} onChange={(e) => setRevisionNotes(e.target.value)} placeholder="Tulis catatan revisi yang jelas..." rows={4} className="w-full p-2 border border-gray-300 rounded-lg" />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 bg-gray-50 border-t">
          <button onClick={onClose} className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-100">Batal</button>
          <button onClick={handleSubmitRevision} disabled={isSubmitting || !selectedAssignmentId || !revisionNotes.trim()} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400">
            {isSubmitting ? 'Mengirim...' : 'Kirim Revisi'}
          </button>
        </div>
      </div>
    </div>
  )
}