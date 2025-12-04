"use client";

import React, { useState } from 'react';
import {
    Search, CheckCircle, Circle, Loader2, AlertCircle, User,
    Clock, MessageSquareText, MapPin, FileText,
    Activity, Info, Building2, AlertTriangle
} from "lucide-react";
import { toast } from "@/lib/toast";

// ==================================================================
// 1. TIPE DATA
// ==================================================================
interface TimelineStep {
    step: string;
    title: string;
    description: string;
    date: string | null;
    timestamp: Date | null;
    location: string;
    status: 'completed' | 'current' | 'pending';
    notes?: string | null;
}

interface CoordinatorNote {
    staffName: string;
    note: string | null;       // Instruksi Awal
    revisionNote: string | null; // Catatan Revisi
    date?: string;
}

interface Report {
    no_surat: string;
    hal: string;
    dari: string;
    status: string;
    layanan: string;
    progress: number;
    timeline: TimelineStep[];
    lastUpdate: string;
    lastUpdateRaw: string;
    coordinatorNotes?: CoordinatorNote[]; // Array berisi catatan semua staff
    currentHolder?: string;
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
// 2. FUNGSI HELPER
// ==================================================================
async function formatApiDataToReport(apiData): Promise<Report> {
    const history = apiData.workflow_history || [];

    const timeAgo = (dateStr) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " tahun lalu";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " bulan lalu";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " hari lalu";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " jam lalu";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " menit lalu";
        return "Baru saja";
    };

    const statusLower = apiData.status?.toLowerCase() || 'draft';
    const isCompleted = statusLower === 'selesai' || statusLower === 'completed';

    const formatHistoryToTimeline = (): TimelineStep[] => {
        let activeStepIndex = -1;

        if (isCompleted) {
            activeStepIndex = PROCESS_STEPS.length - 1;
        } else {
            const lastHistoryAction = history.length > 0 ? history[history.length - 1].action : '';
            const foundIndex = PROCESS_STEPS.findIndex(p => p.id === lastHistoryAction);

            if (foundIndex !== -1) {
                activeStepIndex = foundIndex;
            } else {
                activeStepIndex = Math.min(history.length - 1, PROCESS_STEPS.length - 2);
                if (activeStepIndex < 0) activeStepIndex = 0;
            }
        }

        return PROCESS_STEPS.map((def, index) => {
            const historyItem = history.find(h => h.action === def.id) ||
                (index === activeStepIndex && history.length > 0 ? history[history.length - 1] : null);

            let stepStatus: 'completed' | 'current' | 'pending' = 'pending';
            if (index < activeStepIndex) stepStatus = 'completed';
            else if (index === activeStepIndex) stepStatus = isCompleted ? 'completed' : 'current';

            return {
                step: def.id,
                title: def.title,
                description: historyItem?.notes || def.description,
                date: historyItem?.created_at ? new Date(historyItem.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null,
                timestamp: historyItem?.created_at ? new Date(historyItem.created_at) : null,
                location: historyItem ? "Sistem / Staff" : "-",
                status: stepStatus,
                notes: historyItem?.notes
            };
        });
    };

    const timeline = formatHistoryToTimeline();

    let progress = 0;
    if (isCompleted) progress = 100;
    else {
        const completedCount = timeline.filter(t => t.status === 'completed').length;
        progress = Math.round((completedCount / PROCESS_STEPS.length) * 100);
        if (progress === 0 && history.length > 0) progress = 10;
    }

    const lastHistoryItem = history.length > 0 ? history[history.length - 1] : { created_at: apiData.created_at };
    const lastUpdateRaw = lastHistoryItem.created_at;
    const lastUpdate = timeAgo(lastUpdateRaw);

    // Ambil data assignment (staff & notes)
    // Kita filter hanya yang punya 'note' ATAU 'revisionNote'
    const coordinatorNotes: CoordinatorNote[] = (apiData.task_assignments || [])
        .map(assignment => ({
            staffName: assignment.profiles?.name || 'Staff',
            note: assignment.notes,
            revisionNote: assignment.revision_notes,
            date: assignment.updated_at
        }))
        .filter(note => note.note || note.revisionNote);

    return {
        no_surat: apiData.no_surat,
        hal: apiData.hal || "-",
        dari: apiData.dari || "-",
        status: apiData.status,
        layanan: apiData.sub_layanan || apiData.layanan || "Layanan Umum",
        progress: progress,
        timeline: timeline,
        lastUpdate: lastUpdate,
        lastUpdateRaw: lastUpdateRaw,
        coordinatorNotes: coordinatorNotes,
        currentHolder: apiData.current_holder_profile?.name || "TU / Admin"
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
                throw new Error(errorData.error || 'Gagal mengambil data.');
            }

            const data = await response.json();
            const formattedData = await formatApiDataToReport(data);
            setSearchState({ status: 'success', data: formattedData });

        } catch (error: any) {
            console.error("Tracking error:", error);
            setSearchState({ status: 'error', data: null, error: error.message });
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen pb-12 font-sans">
            {/* Header / Hero Section */}
            <div className="bg-white border-b border-gray-200 pt-12 pb-16 px-4 shadow-sm">
                <div className="max-w-3xl mx-auto text-center">
                    <img src="/Logo SDMO x1.png" alt="Logo" className="mx-auto h-24 w-auto mb-6 drop-shadow-sm" />
                    <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                        Lacak Status Dokumen
                    </h1>
                    <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
                        Masukkan nomor registrasi atau nomor surat untuk mengetahui posisi dan status terkini dokumen Anda.
                    </p>

                    <form onSubmit={handleSearch} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-lg mx-auto relative">
                        <div className="relative flex-grow">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={trackingId}
                                onChange={(e) => setTrackingId(e.target.value)}
                                placeholder="Contoh: TRK-12345678"
                                className="block w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 shadow-sm text-gray-900 placeholder-gray-400 transition-all"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={searchState.status === 'loading'}
                            className="inline-flex justify-center items-center px-8 py-4 border border-transparent text-base font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg shadow-blue-200 transition-all disabled:opacity-70 disabled:shadow-none"
                        >
                            {searchState.status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : "Lacak"}
                        </button>
                    </form>
                </div>
            </div>

            {/* Content Section */}
            <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-10">
                {searchState.status === 'success' && searchState.data && <TrackingResult report={searchState.data} />}
                {searchState.status === 'not_found' && <MessageState type="not_found" />}
                {searchState.status === 'error' && <MessageState type="error" message={searchState.error} />}
            </div>
        </div>
    );
}

// ==================================================================
// 4. KOMPONEN PENDUKUNG (TAMPILAN DETAIL)
// ==================================================================
const TrackingResult = ({ report }: { report: Report }) => {
    // 1. Catatan Revisi (Untuk Alert di Atas)
    const revisionNotesOnly = report.coordinatorNotes?.filter(n => n.revisionNote) || [];

    // 2. SEMUA Catatan (Untuk Timeline - agar tampil 2 staff atau lebih)
    const allCoordinatorNotes = report.coordinatorNotes || [];

    const getStatusColor = (status) => {
        const s = status.toLowerCase();
        if (s.includes('selesai') || s.includes('completed')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        if (s.includes('revisi') || s.includes('revision')) return 'bg-red-100 text-red-800 border-red-200';
        if (s.includes('draft')) return 'bg-gray-100 text-gray-800 border-gray-200';
        return 'bg-blue-100 text-blue-800 border-blue-200';
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* 1. KARTU UTAMA (HERO INFO) */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 h-2"></div>
                <div className="p-6 sm:p-8">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                        <div className="space-y-3 flex-1">
                            {/* Badges Status & Updated */}
                            <div className="flex flex-wrap items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusColor(report.status)}`}>
                                    {report.status.replace(/-/g, ' ')}
                                </span>
                                <span className="text-gray-400 text-xs flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" /> Updated: {report.lastUpdate}
                                </span>
                            </div>

                            {/* Judul Perihal */}
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Perihal / Hal</p>
                                <h2 className="text-2xl font-bold text-gray-900 leading-snug">
                                    {report.hal}
                                </h2>
                            </div>

                            {/* No Surat */}
                            <div className="flex items-center gap-2 text-gray-600 font-medium bg-gray-50 px-3 py-2 rounded-lg w-fit">
                                <FileText className="w-4 h-4 text-blue-500" />
                                <span className="text-sm">No. Surat: <strong>{report.no_surat}</strong></span>
                            </div>
                        </div>

                        {/* Progress Circle */}
                        <div className="flex flex-row md:flex-col items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="relative flex items-center justify-center">
                                <svg className="transform -rotate-90 w-16 h-16">
                                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-200" />
                                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-blue-600 transition-all duration-1000 ease-out"
                                        strokeDasharray={175.92}
                                        strokeDashoffset={175.92 - (175.92 * report.progress) / 100}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <span className="absolute text-sm font-black text-blue-800">{report.progress}%</span>
                            </div>
                            <div className="text-left md:text-center">
                                <span className="text-xs font-bold text-gray-500 uppercase block">Progress</span>
                                <span className="text-sm font-semibold text-gray-900">Pengerjaan</span>
                            </div>
                        </div>
                    </div>

                    {/* Informasi Detail Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 pt-6 border-t border-gray-100">
                        {/* Kolom DARI */}
                        <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Asal Surat</p>
                                <p className="text-gray-900 font-semibold mt-0.5">{report.dari}</p>
                            </div>
                        </div>

                        {/* Kolom LAYANAN */}
                        <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                                <Activity className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Layanan</p>
                                <p className="text-gray-900 font-semibold mt-0.5">{report.layanan}</p>
                            </div>
                        </div>

                        {/* Kolom POSISI */}
                        <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-orange-50 rounded-xl text-orange-600">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Posisi Dokumen</p>
                                <p className="text-gray-900 font-semibold mt-0.5">{report.currentHolder || "Sistem"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. ALERT REVISI (Peringatan Penting) */}
            {revisionNotesOnly.length > 0 && (
                <div className="bg-white border-l-4 border-red-500 rounded-xl shadow-md overflow-hidden">
                    <div className="p-5">
                        <div className="flex items-start">
                            <div className="p-2 bg-red-100 rounded-full mr-4">
                                <AlertCircle className="w-6 h-6 text-red-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-red-800 font-bold text-lg mb-1">Perlu Revisi</h3>
                                <p className="text-red-600 text-sm mb-4">Mohon perhatikan catatan revisi berikut:</p>
                                <div className="grid gap-3">
                                    {revisionNotesOnly.map((note, idx) => (
                                        <div key={idx} className="bg-red-50 p-3 rounded-lg border border-red-100">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-bold text-red-700 uppercase bg-red-200 px-2 py-0.5 rounded">Untuk: {note.staffName}</span>
                                            </div>
                                            <p className="text-gray-800 text-sm font-medium">"{note.revisionNote}"</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. TIMELINE PROSES */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <MapPin className="w-6 h-6 text-blue-600" />
                        Riwayat Perjalanan
                    </h3>
                </div>

                <div className="relative">
                    {/* Vertical Line */}
                    <div className="absolute top-2 bottom-0 left-[22px] w-0.5 bg-gray-200"></div>

                    <div className="space-y-10">
                        {report.timeline.map((step, index) => {
                            const isCompleted = step.status === 'completed';
                            const isCurrent = step.status === 'current';

                            return (
                                <div key={index} className={`relative pl-14 group ${isCurrent ? 'opacity-100' : isCompleted ? 'opacity-100' : 'opacity-60'}`}>
                                    {/* Icon Indicator */}
                                    <div className={`absolute left-0 top-0 w-11 h-11 rounded-full flex items-center justify-center border-4 z-10 transition-all duration-300 bg-white
                                        ${isCompleted ? 'border-emerald-100' : isCurrent ? 'border-blue-100 shadow-xl shadow-blue-100 scale-110' : 'border-gray-100'}
                                    `}>
                                        {isCompleted ? (
                                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                                        ) : isCurrent ? (
                                            <div className="w-4 h-4 rounded-full bg-blue-600 animate-pulse"></div>
                                        ) : (
                                            <Circle className="w-5 h-5 text-gray-300" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className={`transition-all duration-300`}>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                                            <h4 className={`text-lg font-bold ${isCurrent ? 'text-blue-700' : isCompleted ? 'text-gray-900' : 'text-gray-500'}`}>
                                                {step.title}
                                            </h4>
                                            {step.date && (
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${isCurrent ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {step.date}
                                                </span>
                                            )}
                                        </div>

                                        <p className={`text-sm leading-relaxed mb-3 ${isCurrent ? 'text-gray-800' : 'text-gray-500'}`}>
                                            {step.description}
                                        </p>

                                        {/* --- PERBAIKAN: Tampilkan SEMUA catatan koordinator di Step 'Penugasan Staff' --- */}
                                        {step.step === 'Penugasan Staff' && allCoordinatorNotes.length > 0 && (
                                            <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                                    <Info className="w-3 h-3" /> Detail Penugasan & Catatan
                                                </div>
                                                <div className="grid gap-3">
                                                    {allCoordinatorNotes.map((cn, i) => (
                                                        <div key={i} className="flex flex-col bg-slate-50 border border-slate-200 p-3 rounded-lg relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${cn.revisionNote ? 'bg-orange-400' : 'bg-blue-400'}`}></div>

                                                            {/* Nama Staff */}
                                                            <div className="flex justify-between items-center mb-2 pl-3">
                                                                <span className="text-xs font-bold text-slate-700 uppercase">{cn.staffName}</span>
                                                                {cn.revisionNote && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">REVISI</span>}
                                                            </div>

                                                            {/* Isi Catatan Instruksi */}
                                                            {cn.note && (
                                                                <div className="flex gap-2 pl-3 mb-1">
                                                                    <MessageSquareText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                                                                    <p className="text-sm text-slate-800 italic">"{cn.note}"</p>
                                                                </div>
                                                            )}

                                                            {/* Isi Catatan Revisi (Jika ada) */}
                                                            {cn.revisionNote && (
                                                                <div className="flex gap-2 pl-3 mt-1 pt-1 border-t border-slate-200">
                                                                    <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
                                                                    <p className="text-sm text-orange-800 font-medium">Revisi: "{cn.revisionNote}"</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MessageState = ({ type, message }: { type: 'not_found' | 'error', message?: string }) => {
    const content = {
        not_found: {
            icon: <Search className="w-16 h-16 text-gray-300" />,
            title: "Data Tidak Ditemukan",
            text: "Nomor surat yang Anda masukkan tidak terdaftar dalam sistem kami. Mohon periksa kembali penulisan nomor surat."
        },
        error: {
            icon: <AlertCircle className="w-16 h-16 text-red-300" />,
            title: "Terjadi Kesalahan",
            text: message || "Sistem sedang mengalami gangguan. Mohon coba beberapa saat lagi."
        }
    };
    const current = content[type];

    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl shadow-xl border border-gray-100 animate-in zoom-in-95 duration-300">
            <div className="mb-6 p-6 bg-slate-50 rounded-full shadow-inner">{current.icon}</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{current.title}</h3>
            <p className="text-gray-500 max-w-md mx-auto leading-relaxed">{current.text}</p>
        </div>
    );
};