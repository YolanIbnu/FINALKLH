"use client"

// Komponen ini hanya bertanggung jawab untuk menampilkan satu item tugas di daftar.
export function StaffTaskCard({ task, onSelect, isSelected }) {
  return (
    <div
      onClick={onSelect}
      className={`p-4 border-b cursor-pointer transition-all duration-150 ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'}`}
    >
      <div className="flex justify-between items-center">
        <p className="font-semibold text-gray-900">{task.reports?.no_surat || "Tanpa No. Surat"}</p>

        {/* Tanda REVISI hanya muncul jika statusnya revision-required */}
        {task.status === 'revision-required' && (
          <span className="text-xs font-medium px-2 py-1 bg-red-100 text-red-800 rounded-full">
            Revisi
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600 truncate mt-1">{task.reports?.hal || "Tanpa perihal"}</p>
    </div>
  );
}