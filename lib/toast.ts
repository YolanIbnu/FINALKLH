import { toast as sonnerToast } from "sonner"

export const toast = {
  success: (message: string, description?: string, action?: { label: string; onClick: () => void }) => {
    sonnerToast.success(message, {
      description,
      duration: 5000,
      action: action
        ? {
            label: action.label,
            onClick: action.onClick,
          }
        : undefined,
      style: {
        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        border: "1px solid #059669",
        color: "white",
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.3), 0 4px 6px -2px rgba(16, 185, 129, 0.1)",
      },
      className: "toast-success",
    })
  },

  error: (message: string, description?: string, action?: { label: string; onClick: () => void }) => {
    sonnerToast.error(message, {
      description,
      duration: 6000,
      action: action
        ? {
            label: action.label,
            onClick: action.onClick,
          }
        : undefined,
      style: {
        background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
        border: "1px solid #dc2626",
        color: "white",
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.3), 0 4px 6px -2px rgba(239, 68, 68, 0.1)",
      },
      className: "toast-error",
    })
  },

  info: (message: string, description?: string, action?: { label: string; onClick: () => void }) => {
    sonnerToast.info(message, {
      description,
      duration: 4000,
      action: action
        ? {
            label: action.label,
            onClick: action.onClick,
          }
        : undefined,
      style: {
        background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
        border: "1px solid #2563eb",
        color: "white",
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.3), 0 4px 6px -2px rgba(59, 130, 246, 0.1)",
      },
      className: "toast-info",
    })
  },

  warning: (message: string, description?: string, action?: { label: string; onClick: () => void }) => {
    sonnerToast.warning(message, {
      description,
      duration: 5000,
      action: action
        ? {
            label: action.label,
            onClick: action.onClick,
          }
        : undefined,
      style: {
        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        border: "1px solid #d97706",
        color: "white",
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 10px 25px -5px rgba(245, 158, 11, 0.3), 0 4px 6px -2px rgba(245, 158, 11, 0.1)",
      },
      className: "toast-warning",
    })
  },

  loading: (message: string) => {
    return sonnerToast.loading(message, {
      style: {
        background: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
        border: "1px solid #4b5563",
        color: "white",
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 10px 25px -5px rgba(107, 114, 128, 0.3), 0 4px 6px -2px rgba(107, 114, 128, 0.1)",
      },
      className: "toast-loading",
    })
  },

  interactive: (
    message: string,
    description: string,
    actions: Array<{ label: string; onClick: () => void; variant?: "primary" | "secondary" }>,
  ) => {
    return sonnerToast(message, {
      description,
      duration: 8000,
      action:
        actions.length > 0
          ? {
              label: actions[0].label,
              onClick: actions[0].onClick,
            }
          : undefined,
      style: {
        background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
        border: "1px solid #7c3aed",
        color: "white",
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 10px 25px -5px rgba(139, 92, 246, 0.3), 0 4px 6px -2px rgba(139, 92, 246, 0.1)",
      },
      className: "toast-interactive",
    })
  },

  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId)
  },
}

export const trackingToasts = {
  reportCreated: (reportId?: string) =>
    toast.success(
      "✅ Laporan Berhasil Dibuat",
      "Laporan telah disimpan dan akan segera diproses oleh tim terkait",
      reportId
        ? {
            label: "Lihat Detail",
            onClick: () => (window.location.href = `/tracking/${reportId}`),
          }
        : undefined,
    ),

  reportUpdated: () => toast.success("📝 Laporan Diperbarui", "Semua perubahan telah disimpan dengan sukses"),

  taskAssigned: (staffName: string) =>
    toast.success(
      "👤 Tugas Berhasil Ditugaskan",
      `Tugas telah diberikan kepada ${staffName} dan notifikasi telah dikirim`,
      {
        label: "Lihat Status",
        onClick: () => console.log("Navigate to task status"),
      },
    ),

  taskCompleted: () =>
    toast.success("✅ Tugas Selesai", "Tugas telah diselesaikan dan dikirim ke koordinator untuk review"),

  revisionRequested: () =>
    toast.warning("⚠️ Revisi Diperlukan", "Silakan periksa catatan revisi dan lakukan perbaikan yang diperlukan", {
      label: "Lihat Catatan",
      onClick: () => console.log("Show revision notes"),
    }),

  workflowUpdated: () =>
    toast.info("🔄 Status Workflow Diperbarui", "Alur kerja telah diperbarui secara real-time di semua perangkat"),

  connectionError: () =>
    toast.error("🔌 Koneksi Terputus", "Sedang mencoba menghubungkan kembali ke server...", {
      label: "Coba Lagi",
      onClick: () => window.location.reload(),
    }),

  syncSuccess: () =>
    toast.success("🔄 Data Tersinkronisasi", "Semua perubahan telah disimpan dan disinkronkan dengan server"),

  userAdded: (userName: string) =>
    toast.success("👥 Pengguna Berhasil Ditambahkan", `${userName} telah berhasil ditambahkan ke sistem`, {
      label: "Lihat Daftar",
      onClick: () => console.log("Navigate to user list"),
    }),

  fileUploaded: (fileName: string) =>
    toast.success("📎 File Berhasil Diunggah", `${fileName} telah berhasil diunggah dan dilampirkan`),

  dataExported: () =>
    toast.success("📊 Data Berhasil Diekspor", "File laporan telah berhasil diunduh ke perangkat Anda"),
}
