"use client"

import { useState } from "react"
import { useApp } from "../../context/AppContext"
import { supabase } from "../../../lib/supabaseClient"
import { toast } from "../../../lib/toast"
import { X, Users } from "lucide-react"
import { TODO_ITEMS } from "../../types"

export function AddStaffModal({ report, profiles, onClose }) {
  const { state } = useApp()
  const { currentUser } = state
  
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([])
  const [selectedTodos, setSelectedTodos] = useState<string[]>([])
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const alreadyAssignedStaffIds = report.task_assignments?.map(a => a.staff_id) || []
  const availableStaff = profiles.filter(p => p.role === 'Staff' && p.id && !alreadyAssignedStaffIds.includes(p.id))

  const handleStaffChange = (staffId, checked) => {
    setSelectedStaffIds(prev => checked ? [...prev, staffId] : prev.filter(id => id !== staffId))
  }
  const handleTodoChange = (todoTask, checked) => {
    setSelectedTodos(prev => checked ? [...prev, todoTask] : prev.filter(t => t !== todoTask))
  }

  const handleAddStaff = async () => {
    if (selectedStaffIds.length === 0) {
      toast.error("Pilih minimal satu staff untuk ditambahkan.");
      return;
    }
    setIsSubmitting(true);
    try {
        const coordinatorProfile = profiles.find(p => p.user_id === currentUser.id);
        if (!coordinatorProfile) throw new Error("Profil koordinator tidak ditemukan.");

        const newAssignmentsData = selectedStaffIds.map(staffId => ({
          report_id: report.id,
          staff_id: staffId,
          coordinator_id: coordinatorProfile.id,
          todo_list: selectedTodos,
          status: 'in-progress',
          notes: notes,
        }))
        
        const { error: taskInsertError } = await supabase.from('task_assignments').insert(newAssignmentsData)
        if (taskInsertError) throw new Error(`Gagal menambah tugas: ${taskInsertError.message}`)

        const { error: reportUpdateError } = await supabase
            .from('reports')
            .update({
                current_holder: currentUser.id
            })
            .eq('id', report.id);

        if (reportUpdateError) throw new Error(`Gagal mengupdate laporan: ${reportUpdateError.message}`);

        const selectedStaffNames = profiles.filter(p => selectedStaffIds.includes(p.id)).map(p => p.full_name).join(', ')
        await supabase.from('workflow_history').insert({
            report_id: report.id,
            action: 'Staff tambahan ditugaskan',
            user_id: currentUser?.id,
            status: 'in-progress',
            notes: `Menambahkan staff: ${selectedStaffNames}.`,
        })

        toast.success("Staff tambahan berhasil ditugaskan!")
        onClose()

    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ✅ Helper function untuk mendapatkan nama dari ID
  const getProfileName = (profileId) => {
    const profile = profiles.find(p => p.id === profileId);
    return profile?.full_name || "Nama tidak ditemukan";
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><Users /> Tambah Staff untuk Laporan #{report.no_surat}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X /></button>
        </div>
        
        <div className="p-6 space-y-5">
          {/* ✅ SARAN PENINGKATAN: Menampilkan staff yang sudah ditugaskan */}
          {alreadyAssignedStaffIds.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg border">
                <h4 className="font-semibold text-gray-700 text-sm mb-2">Sudah Dikerjakan Oleh:</h4>
                <ul className="list-disc list-inside text-sm text-gray-600">
                    {alreadyAssignedStaffIds.map(id => (
                        <li key={id}>{getProfileName(id)}</li>
                    ))}
                </ul>
            </div>
          )}
          {/* ✅ AKHIR SARAN */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Pilih Staff Tersedia:</h4>
              <div className="max-h-40 overflow-y-auto space-y-2 p-2 border rounded-md">
                {availableStaff.map((staff) => (
                  <label key={staff.id} className="flex items-center p-1 hover:bg-gray-100 rounded cursor-pointer">
                    <input type="checkbox" onChange={(e) => handleStaffChange(staff.id, e.target.checked)} />
                    <span className="ml-2 text-sm text-gray-700">{staff.full_name}</span>
                  </label>
                ))}
                {availableStaff.length === 0 && <p className="text-sm text-gray-500 p-2">Semua staff yang relevan sudah ditugaskan.</p>}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Daftar To-Do (Opsional):</h4>
              <div className="max-h-40 overflow-y-auto space-y-2 p-2 border rounded-md">
                {TODO_ITEMS.map((todo) => (
                  <label key={todo} className="flex items-center p-1 hover:bg-gray-100 rounded cursor-pointer">
                    <input type="checkbox" onChange={(e) => handleTodoChange(todo, e.target.checked)} />
                    <span className="ml-2 text-sm text-gray-700">{todo}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Catatan:</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 rounded-lg" />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 bg-gray-50 border-t">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">Batal</button>
          <button onClick={handleAddStaff} disabled={isSubmitting || selectedStaffIds.length === 0} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
            {isSubmitting ? 'Menambahkan...' : 'Tambah & Tugaskan'}
          </button>
        </div>
      </div>
    </div>
  )
}