"use client"

import { useState, useEffect } from "react"
import { X, Upload, File, Trash2, User, LogOut } from "lucide-react"
import { SERVICES, SUB_SERVICES_MAP } from "../../types"
import type { FileAttachment } from "../../types"
import { useApp } from "../../context/AppContext"
import { toast, trackingToasts } from "../../../lib/toast"

export function ReportForm({ report, onSubmit, onCancel }) {
  const { state } = useApp()
  const currentUser = state.currentUser

  const findCategoryForService = (serviceName: string) => {
    if (!serviceName) return { category: "", subService: "" };
    if (SERVICES.includes(serviceName)) return { category: serviceName, subService: "" };
    for (const [category, subServices] of Object.entries(SUB_SERVICES_MAP)) {
      if (subServices.includes(serviceName)) return { category, subService: serviceName };
    }
    return { category: "", subService: "" };
  };

  const [formData, setFormData] = useState({
    layanan: "",
    subLayanan: "",
    linkDocuments: "",
    noAgenda: "",
    kelompokAsalSurat: "",
    agendaSestama: "",
    noSurat: "",
    hal: "",
    dari: "",
    tanggalAgenda: "",
    tanggalSurat: "",
    sifat: [],
    derajat: [],
    status: "Dalam Proses",
  })

  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})

  // === PERBAIKAN UTAMA: MEMUAT DATA FILE SAAT EDIT ===
  useEffect(() => {
    if (report) {
      const serviceState = findCategoryForService(report.layanan);
      setFormData({
        layanan: serviceState.category || report.layanan || "",
        subLayanan: report.sub_layanan || report.subLayanan || serviceState.subService || "",
        linkDocuments: report.link_documents || report.linkDocuments || "",
        noAgenda: report.no_agenda || report.noAgenda || "",
        kelompokAsalSurat: report.kelompok_asal_surat || report.kelompokAsalSurat || "",
        agendaSestama: report.agenda_sestama || report.agendaSestama || "",
        noSurat: report.no_surat || report.noSurat || "",
        hal: report.hal || "",
        dari: report.dari || "",
        tanggalAgenda: report.tanggal_agenda || report.tanggalAgenda || "",
        tanggalSurat: report.tanggal_surat || report.tanggalSurat || "",
        sifat: report.sifat || [],
        derajat: report.derajat || [],
        status: report.status || "Dalam Proses",
      });

      // MAPPING FILE: Database (snake_case) -> Frontend (camelCase)
      if (report.file_attachments && Array.isArray(report.file_attachments)) {
        const mappedFiles = report.file_attachments.map((f: any) => ({
          id: f.id,
          fileName: f.file_name || f.fileName || "File Tanpa Nama",
          fileUrl: f.file_url || f.fileUrl,
          uploadedAt: f.created_at,
          uploadedBy: f.uploaded_by,
          type: f.file_type,
          size: f.file_size
        }));
        setAttachments(mappedFiles);
      } else if (report.originalFiles) {
        setAttachments(report.originalFiles);
      }
    }
  }, [report]);

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!currentUser) return;

    try {
      const isEditing = !!report;
      const method = isEditing ? "PUT" : "POST";

      const payload = {
        ...formData,
        id: isEditing ? report.id : undefined,
        layanan: formData.layanan,
        sub_layanan: formData.subLayanan,
        originalFiles: attachments, // Kirim file terbaru
        currentUser: currentUser,
      };

      const response = await fetch("/api/reports", {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const text = await response.text();
      let result = {};
      try { if (text) result = JSON.parse(text); } catch (err) { }

      if (!response.ok) throw new Error((result as any).error || "Gagal menyimpan")

      toast.success("✅ Berhasil", isEditing ? "Laporan diperbarui" : "Laporan dibuat")

      onSubmit({
        ...formData,
        sub_layanan: formData.subLayanan,
        file_attachments: attachments.map(a => ({ ...a, file_name: a.fileName, file_url: a.fileUrl })),
        id: (result as any).report?.id || report?.id,
        trackingNumber: (result as any).report?.trackingNumber || report?.trackingNumber,
      })
    } catch (error: any) {
      console.error("Error:", error)
      toast.error("❌ Gagal", error.message)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === "layanan") setFormData({ ...formData, layanan: value, subLayanan: "" })
    else setFormData({ ...formData, [name]: value })
  }

  const handleCheckboxChange = (e, field) => {
    const { value, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [field]: checked ? [...prev[field], value] : prev[field].filter((item) => item !== value),
    }))
  }

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return
    setUploading(true)
    const reportId = report?.id || `temp-${Date.now()}`

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        if (file.size > 10 * 1024 * 1024) throw new Error(`File terlalu besar (Max 10MB)`)
        const formData = new FormData()
        formData.append("file", file)
        formData.append("reportId", reportId)
        formData.append("uploadedBy", currentUser?.name || "Unknown")

        const response = await fetch("/api/upload", { method: "POST", body: formData })
        if (!response.ok) throw new Error("Upload failed")

        const fileAttachment: FileAttachment = await response.json()
        setAttachments((prev) => [...prev, fileAttachment])
        trackingToasts.fileUploaded(file.name)
      } catch (error: any) {
        toast.error("Gagal Upload", error.message)
      }
    }
    setUploading(false)
  }

  const handleRemoveFile = (fileId: string) => {
    setAttachments((prev) => prev.filter((file) => file.id !== fileId))
  }

  const subServices = formData.layanan ? SUB_SERVICES_MAP[formData.layanan] || [] : []

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{report ? "Edit Laporan" : "Buat Laporan Baru"}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Layanan</label>
              <select name="layanan" value={formData.layanan} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg">
                <option value="">Pilih Layanan</option>
                {SERVICES.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
            {subServices.length > 0 && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Detail Layanan</label>
                <select name="subLayanan" value={formData.subLayanan} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Pilih Detail</option>
                  {subServices.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
            )}
            {/* Field Input Link Dokumen telah diubah dari type="url" menjadi type="text" */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Link Dokumen</label>
              {/* === PERUBAHAN UTAMA DI SINI === */}
              <input type="text" name="linkDocuments" value={formData.linkDocuments} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
            </div>

            <div><label className="block text-sm font-medium mb-1">No Agenda</label><input type="text" name="noAgenda" value={formData.noAgenda} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Kelompok Asal Surat</label><input type="text" name="kelompokAsalSurat" value={formData.kelompokAsalSurat} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Agenda Sestama</label><input type="text" name="agendaSestama" value={formData.agendaSestama} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">No Surat</label><input type="text" name="noSurat" value={formData.noSurat} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Hal</label><input type="text" name="hal" value={formData.hal} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Dari</label><input type="text" name="dari" value={formData.dari} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Tgl Agenda</label><input type="date" name="tanggalAgenda" value={formData.tanggalAgenda} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Tgl Surat</label><input type="date" name="tanggalSurat" value={formData.tanggalSurat} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg" /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div><label className="block mb-2 text-sm font-medium">Sifat</label>{["Biasa", "Penting", "Rahasia"].map(s => (<label key={s} className="flex items-center gap-2"><input type="checkbox" checked={formData.sifat.includes(s)} onChange={(e) => handleCheckboxChange(e, "sifat")} value={s} />{s}</label>))}</div>
            <div><label className="block mb-2 text-sm font-medium">Derajat</label>{["Biasa", "Segera", "Kilat"].map(d => (<label key={d} className="flex items-center gap-2"><input type="checkbox" checked={formData.derajat.includes(d)} onChange={(e) => handleCheckboxChange(e, "derajat")} value={d} />{d}</label>))}</div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium mb-2">Unggah Berkas</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 cursor-pointer relative">
              <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files && handleFileUpload(e.target.files)} disabled={uploading} />
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Klik atau Drag & Drop untuk upload</p>
            </div>

            <div className="mt-4 space-y-2">
              {attachments.map((file, idx) => (
                <div key={file.id || idx} className="flex justify-between items-center p-3 bg-gray-50 border rounded-lg">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <File className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <span className="truncate text-sm font-medium">{file.fileName}</span>
                  </div>
                  <button type="button" onClick={() => handleRemoveFile(file.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            {uploading && <p className="text-sm text-blue-500 mt-2 animate-pulse">Sedang mengupload...</p>}
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-100 rounded-lg">Batal</button>
            <button type="submit" disabled={uploading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{report ? "Update" : "Simpan"}</button>
          </div>
        </form>
      </div>
    </div>
  )
}