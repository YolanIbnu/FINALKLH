import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

// --- API ENDPOINT: KIRIM REVISI (POST) ---
// Menggunakan service role agar semua koordinator bisa update task_assignments
// tanpa dibatasi oleh RLS (Row Level Security).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { assignmentId, reportId, revisionNotes } = body

    if (!assignmentId || !reportId || !revisionNotes?.trim()) {
      return NextResponse.json(
        { error: "Data tidak lengkap: assignmentId, reportId, dan revisionNotes diperlukan." },
        { status: 400 }
      )
    }

    // 1. Verifikasi user yang login (menggunakan cookie-based client)
    const cookieStore = await cookies()
    const authClient = createServerClient(cookieStore)
    const { data: { user }, error: authError } = await authClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Verifikasi role user (hanya Koordinator/Admin yang boleh)
    const { data: profile } = await authClient
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single()

    if (!profile || !["Koordinator", "Admin"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Hanya Koordinator atau Admin yang dapat mengirim revisi." },
        { status: 403 }
      )
    }

    // 3. Gunakan SERVICE ROLE client untuk bypass RLS
    const supabase = createServiceClient()

    // 4. Ambil data assignment untuk mendapatkan staff_id
    const { data: assignment, error: fetchError } = await supabase
      .from("task_assignments")
      .select("id, staff_id")
      .eq("id", assignmentId)
      .single()

    if (fetchError || !assignment) {
      return NextResponse.json(
        { error: "Task assignment tidak ditemukan." },
        { status: 404 }
      )
    }

    // 5. Update task_assignments - Reset SEMUA field progress
    const { error: taskUpdateError } = await supabase
      .from("task_assignments")
      .update({
        status: "revision-required",
        revision_notes: revisionNotes.trim(),
        completed_tasks: [],
        progress: 0,
        file_path: null,
        revised_file_path: null,
        staff_revision_notes: null,
        Staff_notes: null,
        completed_at: null,
      })
      .eq("id", assignmentId)

    if (taskUpdateError) {
      console.error("Error updating task_assignments:", taskUpdateError)
      return NextResponse.json(
        { error: "Gagal mengupdate tugas: " + taskUpdateError.message },
        { status: 500 }
      )
    }

    // 6. Update status laporan utama ke 'revision-required'
    const { error: reportUpdateError } = await supabase
      .from("reports")
      .update({ status: "revision-required" })
      .eq("id", reportId)

    if (reportUpdateError) {
      console.error("Error updating reports:", reportUpdateError)
      return NextResponse.json(
        { error: "Gagal mengupdate laporan: " + reportUpdateError.message },
        { status: 500 }
      )
    }

    // 7. Ambil nama staff dari profiles
    const { data: staffProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", assignment.staff_id)
      .single()

    const staffName = staffProfile?.full_name || "Staff"

    // 8. Catat di workflow_history
    await supabase.from("workflow_history").insert({
      report_id: reportId,
      action: "Permintaan Revisi",
      user_id: user.id,
      status: "revision-required",
      notes: `Revisi diminta oleh ${profile.full_name || profile.role} untuk staff: ${staffName}. Catatan: ${revisionNotes.trim()}`,
    })

    return NextResponse.json({
      success: true,
      message: `Permintaan revisi berhasil dikirim ke ${staffName}.`,
      staffName,
    })
  } catch (error: any) {
    console.error("Revision API Error:", error)
    return NextResponse.json(
      { error: error.message || "Server Error" },
      { status: 500 }
    )
  }
}
