"use client"
import { Download, Eye, File } from "lucide-react"
// Pastikan path ini sesuai dengan struktur proyek Anda
import type { FileAttachment } from "../types" 

interface FileViewerProps {
  files: FileAttachment[] | null // Izinkan files menjadi null untuk keamanan
  canDownload?: boolean
  title?: string
}

export function FileViewer({ files, canDownload = true, title = "File Terlampir" }: FileViewerProps) {
  
  const handleDownload = async (fileUrl: string, fileName: string) => {
    // Logika unduh Anda (tidak ada perubahan)
    try {
      const response = await fetch(
        `/api/download?url=${encodeURIComponent(fileUrl)}&fileName=${encodeURIComponent(fileName)}`,
      )
      if (!response.ok) throw new Error("Download failed")
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading file:", error)
      alert("Gagal mengunduh file")
    }
  }

  const handleView = (fileUrl: string) => {
    window.open(fileUrl, "_blank")
  }

  // --- INI PERBAIKANNYA ---
  // Fungsi ini sekarang aman dan tidak akan menyebabkan crash.
  const getFileIcon = (fileName: string | null) => {
    // 1. Tambahkan pemeriksaan ini. Jika fileName tidak ada, langsung kembalikan ikon default.
    if (!fileName || typeof fileName !== 'string') {
      return <File className="w-5 h-5 text-gray-500" />
    }
    // 2. Baris ini sekarang aman karena sudah dilindungi oleh pemeriksaan di atas.
    const extension = fileName.split(".").pop()?.toLowerCase()
    // Anda bisa menambahkan ikon spesifik di sini nanti jika mau
    return <File className="w-5 h-5 text-gray-500" />
  }

  // --- Pemeriksaan Keamanan Tambahan ---
  // Jika `files` bukan sebuah array, tampilkan pesan yang jelas.
  if (!Array.isArray(files)) {
    return (
      <div className="text-center py-8 text-gray-500">
        <File className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>Data lampiran tidak dapat dimuat.</p>
      </div>
    )
  }
  
  if (files.length === 0) {
    return (
       <div className="text-center py-8 text-gray-500">
        <File className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>Tidak ada file terlampir</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <div className="space-y-2">
        {files.map((file) => {
          // Lewati file jika datanya tidak lengkap
          if (!file || !file.id) return null;
          
          return (
            <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center space-x-3 overflow-hidden">
                {getFileIcon(file.fileName)}
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-gray-900 truncate" title={file.fileName || "File tanpa nama"}>
                    {/* Tampilkan nama default jika tidak ada */}
                    {file.fileName || "File tanpa nama"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Diupload oleh {file.uploadedBy || 'Sistem'} pada{" "}
                    {new Date(file.uploadedAt).toLocaleDateString("id-ID", {
                      year: "numeric", month: "long", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {canDownload && file.fileUrl && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleView(file.fileUrl!)}
                    className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                    title="Lihat file"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Lihat</span>
                  </button>
                  <button
                    onClick={() => handleDownload(file.fileUrl!, file.fileName || 'file-unduhan')}
                    className="flex items-center space-x-1 px-3 py-1 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                    title="Unduh file"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh</span>
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}