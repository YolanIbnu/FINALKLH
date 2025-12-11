// File: components/forms/ForwardForm.tsx

import React, { useState, useMemo } from 'react';
import { X, Send } from 'lucide-react';

// Asumsi: profiles adalah array of user objects: { id: string, full_name: string, role: string, ... }
// Asumsi: report memiliki properti no_surat dan hal

export function ForwardForm({ report, onSubmit, onCancel, profiles }) {
  // Hanya simpan ID Koordinator yang dipilih (string)
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState('');
  const [notes, setNotes] = useState('');

  // 🔑 PERBAIKAN: Menggunakan filter yang benar ('koordinator')
  const coordinators = useMemo(() => {
    return profiles
      .filter(p => p.role && p.role.toLowerCase() === 'koordinator')
      .sort((a, b) => (a.full_name || a.name || '').localeCompare(b.full_name || b.name || ''));
  }, [profiles]);

  const handleCoordinatorChange = (id) => {
    setSelectedCoordinatorId(id);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedCoordinatorId) {
      alert('Pilih Koordinator tujuan.');
      return;
    }

    // MENGIRIM DATA DALAM FORMAT YANG DITERIMA TUDashboard.tsx
    onSubmit({
      notes: notes,
      coordinatorId: selectedCoordinatorId
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-900">
            Teruskan Laporan
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-1">{report?.no_surat || "N/A"}</h3>
            <p className="text-sm text-gray-600">{report?.hal || "N/A"}</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Field Catatan */}
            <div className="mb-4">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Catatan Tambahan (Opsional)</label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Contoh: Mohon segera ditindaklanjuti."
              ></textarea>
            </div>

            {/* Pilihan Koordinator (Radio Buttons) */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Pilih Koordinator:
              </label>
              <div className="space-y-2 border border-gray-200 p-3 rounded-lg bg-white">
                {coordinators.length > 0 ? (
                  coordinators.map(coordinator => (
                    <label key={coordinator.id} className="flex items-center p-1 cursor-pointer hover:bg-gray-50 rounded-md transition-colors">
                      <input
                        type="radio"
                        name="coordinator"
                        value={coordinator.id}
                        checked={selectedCoordinatorId === coordinator.id}
                        onChange={() => handleCoordinatorChange(coordinator.id)}
                        className="rounded-full border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-800">{coordinator.full_name || coordinator.name || 'Koordinator Tanpa Nama'}</span>
                    </label>
                  ))
                ) : (
                  // Feedback yang lebih akurat
                  <p className="text-sm text-red-500 p-2">⚠️ Tidak ada Koordinator yang terdaftar atau dimuat. Harap periksa data pengguna.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Send className="w-4 h-4" />
                Teruskan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}