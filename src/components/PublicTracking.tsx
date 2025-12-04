"use client";

import React, { useState } from 'react';
import { Search, CheckCircle, Circle, Loader2, AlertCircle, User, Calendar, MessageSquareText, Edit3 } from "lucide-react";
import { toast } from "@/lib/toast";

// ==================================================================
// 1. TIPE DATA & KONSTANTA
// ==================================================================
interface TimelineStep {
    step: string;
    description: string;
    date: string | null;
    location: string;
    notes?: string | null;
}

interface CoordinatorNote {
    staffName: string;
    note: string | null;
    revisionNote: string | null;
}

interface Report {
    no_surat: string;
    hal: string;
    status: string;
    layanan: string;
    progress: number;
    timeline: TimelineStep[];
    lastUpdate: string;
    coordinatorNotes?: CoordinatorNote[];
}

type SearchState = {
    status: 'idle' | 'loading' | 'success' | 'error' | 'not_found';
    data: Report | null;
    error?: string | null;
}

const PROCESS_STEPS = [
    { id: 'Surat Diterima', title: 'Surat Diterima', description: 'Surat masuk dan didaftarkan dalam sistem' },
    { id: 'Verifikasi Dokumen', title: 'Verifikasi Dokumen', description: 'Pemeriksaan kelengkapan dan validitas dokumen' },
    { id: 'Penugasan Staff', title: 'Penugasan Staff', description: 'Surat diagendakan kepada staff untuk diproses' },
    { id: 'Proses Pelayanan', title: 'Proses Pelayanan', description: 'Pelaksanaan layanan sesuai jenis permohonan' },
    { id: 'Selesai', title: 'Selesai', description: 'Surat telah selesai diproses dan siap diambil' }
];

// ==================================================================
// 2. FUNGSI HELPER UNTUK MEMFORMAT DATA API
// ==================================================================
// [MODIFIKASI] Menghapus penambahan langkah 'Selesai' secara otomatis
async function formatApiDataToReport(apiData) {
    const history = apiData.workflow_history || [];

    // Fungsi ini tidak ada di file asli, tapi dibutuhkan untuk mengambil nama user dari history
    const fetchUserNames = async (history) => {
        const userIds = [...new Set(history.map(item => item.user_id).filter(Boolean))];
        let userMap = new Map();

        if (userIds.length > 0) {
            // Asumsi ada cara untuk fetch user, jika tidak, bagian ini perlu disesuaikan
            // Untuk sementara kita gunakan placeholder
            userIds.forEach(id => userMap.set(id, `User ${id.substring(0, 4)}`));
        }
        return userMap;
    };

    const userMap = await fetchUserNames(history);

    const formatHistoryToTimeline = (): TimelineStep[] => {
        return history.map((item, index) => {
            const stepDefinition = PROCESS_STEPS.find(p => p.id === item.action) || PROCESS_STEPS[index] || { id: item.action, title: item.action };

            return {
                step: stepDefinition.id,
                description: item.notes || "Proses telah dilaksanakan.",
                date: item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null,
                location: userMap.get(item.user_id) || "Sistem",
                notes: item.notes,
            };
        });
    };

    const timeline = formatHistoryToTimeline();

    const calculateProgress = () => {
        const isCompleted = apiData.status?.toLowerCase() === 'selesai' || apiData.status?.toLowerCase() === 'completed';
        if (isCompleted) return 100;
        const completedSteps = timeline.length;
        if (completedSteps === 0) return 5;
        if (completedSteps >= PROCESS_STEPS.length) return 95;
        return Math.min((completedSteps / (PROCESS_STEPS.length - 1)) * 95, 95);
    };

    const progress = calculateProgress();

    const lastUpdate = history.length > 0
        ? new Date(history[history.length - 1].created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }).replace(/\./g, '/')
        : new Date(apiData.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }).replace(/\./g, '/');

    const coordinatorNotes: CoordinatorNote[] = (apiData.task_assignments || [])
        .map(assignment => ({
            staffName: assignment.profiles?.name || 'Staff tidak diketahui',
            note: assignment.notes,
            revisionNote: assignment.revision_notes
        }))
        .filter(note => note.note || note.revisionNote);

    return {
        no_surat: apiData.no_surat,
        hal: apiData.hal || "Tidak ada data",
        status: apiData.status || "Dalam Proses",
        layanan: apiData.layanan || "Layanan Umum",
        progress: progress,
        timeline: timeline,
        lastUpdate: lastUpdate,
        coordinatorNotes: coordinatorNotes,
    };
}


// ==================================================================
// 3. KOMPONEN UTAMA
// ==================================================================
export function PublicTracking() {
    const [trackingId, setTrackingId] = useState("");
    const [searchState, setSearchState] = useState<SearchState>({ status: 'idle', data: null });

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanedTrackingId = trackingId.trim();
        if (!cleanedTrackingId) {
            toast.error("Nomor surat tidak boleh kosong.");
            return;
        }

        setSearchState({ status: 'loading', data: null });

        try {
            const params = new URLSearchParams({ search: cleanedTrackingId });
            const response = await fetch(`/api/track?${params.toString()}`);

            if (response.status === 404) {
                setSearchState({ status: 'not_found', data: null });
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Gagal mengambil data dari server.');
            }

            const data = await response.json();

            const formattedData = await formatApiDataToReport(data);
            setSearchState({ status: 'success', data: formattedData });

        } catch (error: any) {
            console.error("Tracking error:", error);
            setSearchState({ status: 'error', data: null, error: error.message });
            toast.error("Gagal terhubung ke server. Silakan coba lagi.");
        }
    };


    return (
        <div className="bg-gray-50 p-4 sm:p-8 flex flex-col items-center min-h-screen">
            <div className="w-full max-w-3xl">
                <div className="text-center mb-8">
                    <img src="/Logo SDMO x1.png" alt="Logo SDMO" className="mx-auto h-24 w-auto" />
                    <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                        Lacak Proses Administrasi
                    </h1>
                    <p className="mt-3 text-base text-gray-600">
                        Masukkan nomor surat Anda untuk melihat status dan riwayat proses.
                    </p>
                </div>

                <form onSubmit={handleSearch} className="flex gap-2 mb-8">
                    <input
                        type="text"
                        value={trackingId}
                        onChange={(e) => setTrackingId(e.target.value)}
                        placeholder="Masukkan nomor surat..."
                        className="flex-grow px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                        type="submit"
                        disabled={searchState.status === 'loading'}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                    >
                        {searchState.status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                        <span>Lacak Surat</span>
                    </button>
                </form>

                {searchState.status === 'success' && searchState.data && <TrackingResult report={searchState.data} />}
                {searchState.status === 'not_found' && <MessageState type="not_found" />}
                {searchState.status === 'error' && <MessageState type="error" message={searchState.error} />}
            </div>
        </div>
    );
}

// ==================================================================
// 4. KOMPONEN PENDUKUNG
// ==================================================================
const MessageState = ({ type, message }: { type: 'not_found' | 'error', message?: string }) => {
    const content = {
        not_found: {
            icon: <Search className="w-12 h-12 text-gray-400" />,
            title: "Surat Tidak Ditemukan",
            text: "Pastikan nomor surat yang Anda masukkan sudah benar dan coba lagi."
        },
        error: {
            icon: <AlertCircle className="w-12 h-12 text-red-400" />,
            title: "Terjadi Kesalahan",
            text: message || "Tidak dapat memproses permintaan Anda saat ini. Silakan coba lagi nanti."
        }
    };
    const current = content[type];
    return (
        <div className="text-center p-8 bg-white border rounded-lg shadow">
            <div className="mx-auto mb-4">{current.icon}</div>
            <h3 className="text-lg font-medium text-gray-800">{current.title}</h3>
            <p className="mt-1 text-sm text-gray-600">{current.text}</p>
        </div>
    );
};

const TrackingResult = ({ report }: { report: Report }) => {
    const timelineMap = new Map(report.timeline.map(item => [item.step, item]));
    const mainNotes = report.coordinatorNotes?.filter(n => n.note) || [];
    const revisionNotes = report.coordinatorNotes?.filter(n => n.revisionNote) || [];

    return (
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200 space-y-6">
            <div className="border rounded-lg p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">Progress Penanganan</h2>
                <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
                    <div
                        className="bg-blue-600 h-4 rounded-full text-center text-white text-xs font-bold transition-all duration-500 flex items-center justify-center"
                        style={{ width: `${report.progress}%` }}>
                        <span className="absolute left-0 right-0">{report.progress}%</span>
                    </div>
                </div>
            </div>

            <div className="border rounded-lg p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Informasi Surat</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <p><strong className="font-medium text-gray-500 w-28 inline-block">No. Surat</strong>: <span className="text-gray-900 font-semibold">{report.no_surat}</span></p>
                    <p><strong className="font-medium text-gray-500 w-28 inline-block">Hal</strong>: <span className="text-gray-900">{report.hal}</span></p>
                    <p><strong className="font-medium text-gray-500 w-28 inline-block">Status</strong>:
                        <span className={`font-bold px-2 py-1 rounded-full text-xs ${report.status.toLowerCase() === 'selesai' || report.status.toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {report.status}
                        </span>
                    </p>
                    <p><strong className="font-medium text-gray-500 w-28 inline-block">Layanan</strong>: <span className="text-gray-900">{report.layanan}</span></p>
                </div>
            </div>

            <div className="border rounded-lg p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-5">Timeline Proses</h2>
                <div className="space-y-6 border-l-2 border-dashed border-gray-300 ml-3">
                    {PROCESS_STEPS.map((step, index) => {
                        const isCompleted = timelineMap.has(step.id);
                        const stepData = timelineMap.get(step.id);

                        return (
                            <div key={index} className="relative pl-8">
                                <div className="absolute -left-[13px] top-1 bg-white p-1 rounded-full">
                                    {isCompleted ? (
                                        <CheckCircle className="w-5 h-5 text-blue-600" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-gray-300" />
                                    )}
                                </div>
                                <div>
                                    <p className={`font-semibold ${isCompleted ? 'text-gray-800' : 'text-gray-400'}`}>{step.title}</p>
                                    <p className={`text-sm ${isCompleted ? 'text-gray-600' : 'text-gray-400'}`}>{step.description}</p>

                                    {isCompleted && stepData && (
                                        <>
                                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                                                <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /><span>{stepData.date}</span></div>
                                                <div className="flex items-center gap-1.5"><User className="w-3 h-3" /><span>{stepData.location}</span></div>
                                            </div>

                                            {step.id === 'Penugasan Staff' && (mainNotes.length > 0 || revisionNotes.length > 0) && (
                                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900 space-y-3">
                                                    {mainNotes.length > 0 && (
                                                        <div>
                                                            <div className="flex items-center gap-2 font-semibold mb-1">
                                                                <MessageSquareText className="w-4 h-4" />
                                                                <span>Catatan Koordinator:</span>
                                                            </div>
                                                            <ul className="list-disc list-inside pl-2 space-y-1 text-xs">
                                                                {mainNotes.map((item, idx) => (
                                                                    <li key={`main-${idx}`}>
                                                                        <span className="font-semibold">{item.staffName}:</span> {item.note}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {revisionNotes.length > 0 && (
                                                        <div>
                                                            <div className="flex items-center gap-2 font-semibold mb-1 text-orange-800">
                                                                <Edit3 className="w-4 h-4" />
                                                                <span>Catatan Revisi:</span>
                                                            </div>
                                                            <ul className="list-disc list-inside pl-2 space-y-1 text-xs">
                                                                {revisionNotes.map((item, idx) => (
                                                                    <li key={`rev-${idx}`}>
                                                                        <span className="font-semibold">{item.staffName}:</span> {item.revisionNote}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="text-center text-xs text-gray-400 pt-4 border-t mt-6">
                Terakhir diperbarui: {report.lastUpdate}
            </div>
        </div>
    );
};

