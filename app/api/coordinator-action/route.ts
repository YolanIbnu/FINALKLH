import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient, createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

// --- API: Aksi Koordinator pada Task & Report ---
// Menggunakan service role untuk bypass RLS agar semua koordinator
// yang menerima disposisi bisa melakukan aksi (approve, reject, forward).
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, reportId, taskIds, notes } = body

    if (!action || !reportId) {
      return NextResponse.json(
        { error: "Data tidak lengkap: action dan reportId diperlukan." },
        { status: 400 }
      )
    }

    // 1. Verifikasi user yang login
    const cookieStore = await cookies()
    const authClient = createServerClient(cookieStore)
    const { data: { user }, error: authError } = await authClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Verifikasi role
    const { data: profile } = await authClient
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single()

    if (!profile || !["Koordinator", "Admin"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Hanya Koordinator atau Admin yang dapat melakukan aksi ini." },
        { status: 403 }
      )
    }

    // 3. Gunakan SERVICE ROLE client untuk bypass RLS
    const supabase = createServiceClient()

    switch (action) {
      // --- APPROVE REVISIONS (Tahap 1: Cyan Review) ---
      case "approve-revisions": {
        if (!taskIds || taskIds.length === 0) {
          return NextResponse.json({ error: "Tidak ada task untuk diapprove." }, { status: 400 })
        }

        const { error: updateTaskError } = await supabase
          .from("task_assignments")
          .update({ status: "pending-review" })
          .in("id", taskIds)

        if (updateTaskError) throw updateTaskError

        await supabase.from("workflow_history").insert({
          report_id: reportId,
          action: "Revisi Disetujui (Menunggu Review Akhir)",
          user_id: user.id,
          status: "pending-review",
          notes: notes || `Koordinator menyetujui revisi. Laporan masuk ke tahap review akhir.`,
        })

        return NextResponse.json({ success: true, message: "Revisi berhasil disetujui!" })
      }

      // --- APPROVE TASK & FORWARD TO TU (Tahap 2: Final Review) ---
      case "approve-and-forward": {
        const { error: updateError } = await supabase
          .from("reports")
          .update({ status: "pending-approval-tu", current_holder: null })
          .eq("id", reportId)

        if (updateError) throw updateError

        await supabase.from("workflow_history").insert({
          report_id: reportId,
          action: notes ? "Pekerjaan Staff Disetujui & Diteruskan ke TU" : "Laporan disetujui dan diteruskan ke TU via Aksi Cepat",
          user_id: user.id,
          status: "pending-approval-tu",
          notes: notes || `Laporan disetujui oleh ${profile.full_name || 'Koordinator'} dan diteruskan ke TU.`,
        })

        return NextResponse.json({ success: true, message: "Laporan berhasil diteruskan ke TU!" })
      }

      default:
        return NextResponse.json({ error: `Aksi '${action}' tidak dikenali.` }, { status: 400 })
    }
  } catch (error: any) {
    console.error("Coordinator Action API Error:", error)
    return NextResponse.json(
      { error: error.message || "Server Error" },
      { status: 500 }
    )
  }
}
