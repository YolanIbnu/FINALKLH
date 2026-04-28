// File: src/components/forms/ForwardForm.tsx

import React, { useState, useMemo } from 'react';
import { X, Send, CheckSquare, Square } from 'lucide-react';

// Props yang diharapkan
interface ForwardFormProps {
  report: any;
  onSubmit: (data: { notes: string; coordinatorIds: string[] }) => void;
  onCancel: () => void;
  profiles: any[];
}

export function ForwardForm({ report, onSubmit, onCancel, profiles }: ForwardFormProps) {
  // 1. UBAH STATE JADI ARRAY (Untuk menampung banyak ID)
  const [selectedCoordinatorIds, setSelectedCoordinatorIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Filter hanya user dengan role 'koordinator'
  const coordinators = useMemo(() => {
    return profiles
      .filter(p => p.role && p.role.toLowerCase() === 'koordinator')
      .sort((a, b) => (a.full_name || a.name || '').localeCompare(b.full_name || b.name || ''));
  }, [profiles]);

  // 2. LOGIKA TOGGLE (Centang/Hapus Centang)
  const handleToggleCoordinator = (id: string) => {
    if (selectedCoordinatorIds.includes(id)) {
      // Jika sudah ada, hapus dari array
      setSelectedCoordinatorIds(prev => prev.filter(coordId => coordId !== id));
    } else {
      // Jika belum ada, tambahkan ke array
      setSelectedCoordinatorIds(prev => [...prev, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 3. VALIDASI: Cek panjang array
    if (selectedCoordinatorIds.length === 0) {
      alert('Pilih setidaknya satu Koordinator tujuan.');
      return;
    }

    // MENGIRIM DATA (Perhatikan kuncinya sekarang 'coordinatorIds' jamak)
    onSubmit({
      notes: notes,
      coordinatorIds: selectedCoordinatorIds
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto transform transition-all">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-900">
            Teruskan Laporan
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Detail Surat Singkat */}
          <div className="mb-5 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-1">{report?.no_surat || "Tanpa No. Surat"}</h3>
            <p className="text-sm text-blue-700 line-clamp-2">{report?.hal || "Tanpa Perihal"}</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Field Catatan */}
            <div className="mb-5">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Catatan Tambahan (Opsional)
              </label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Contoh: Mohon segera ditindaklanjuti untuk disposisi."
              ></textarea>
            </div>

            {/* Pilihan Koordinator (Checkbox) */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3 flex justify-between">
                <span>Pilih Koordinator:</span>
                <span className="text-xs text-gray-500 font-normal">
                  {selectedCoordinatorIds.length} terpilih
                </span>
              </label>
              
              <div className="space-y-2 border border-gray-200 p-3 rounded-lg bg-white max-h-60 overflow-y-auto">
                {coordinators.length > 0 ? (
                  coordinators.map(coordinator => {
                    const isSelected = selectedCoordinatorIds.includes(coordinator.id);
                    return (
                      <label 
                        key={coordinator.id} 
                        className={`flex items-center p-2 cursor-pointer rounded-md transition-colors border ${
                          isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50 border-transparent'
                        }`}
                      >
                        {/* 4. INPUT CHECKBOX */}
                        <input
                          type="checkbox"
                          name="coordinator"
                          value={coordinator.id}
                          checked={isSelected}
                          onChange={() => handleToggleCoordinator(coordinator.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        
                        <span className={`ml-3 text-sm ${isSelected ? 'font-semibold text-blue-800' : 'text-gray-700'}`}>
                          {coordinator.full_name || coordinator.name || 'Koordinator Tanpa Nama'}
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <p className="text-sm text-red-500 font-medium">⚠️ Data Koordinator Kosong</p>
                    <p className="text-xs text-gray-400 mt-1">Pastikan user dengan role 'koordinator' sudah ada.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 border-t pt-5">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={selectedCoordinatorIds.length === 0}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  selectedCoordinatorIds.length === 0 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Send className="w-4 h-4" />
                Teruskan ({selectedCoordinatorIds.length})
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}