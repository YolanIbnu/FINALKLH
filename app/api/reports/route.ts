import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

// --- HANDLE CREATE (POST) ---
export async function POST(request: NextRequest) {
  try {
    const reportData = await request.json()
    // 🔑 Destructure currentUser agar tidak masuk ke payload insert
    const { originalFiles, currentUser, ...reportFields } = reportData

    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (!profile) {
      const { data: newProfile } = await supabase.from("profiles").insert({ id: user.id, name: user.email?.split("@")[0] || "User", role: "Staff" }).select("role").single()
      profile = newProfile
    }

    const allowedRoles = ["TU", "Admin", "Coordinator", "Koordinator"]
    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: "Only TU, Admin, and Coordinator can create reports" }, { status: 403 })
    }

    const status = ["draft", "in-progress", "completed", "revision-required", "forwarded-to-tu", "forwarded-to-coordinator"].includes(reportFields.status) ? reportFields.status : "draft"
    const priority = ["rendah", "sedang", "tinggi"].includes(reportFields.priority) ? reportFields.priority : "sedang"

    const { data: report, error: reportError } = await supabase.from("reports").insert({
      no_surat: reportFields.noSurat,
      hal: reportFields.hal,
      layanan: reportFields.layanan,
      sub_layanan: reportFields.subLayanan || reportFields.sub_layanan,
      dari: reportFields.dari,
      tanggal_surat: reportFields.tanggalSurat,
      tanggal_agenda: reportFields.tanggalAgenda,
      link_documents: reportFields.linkDocuments,
      no_agenda: reportFields.noAgenda,
      kelompok_asal_surat: reportFields.kelompokAsalSurat,
      agenda_sestama: reportFields.agendaSestama,
      sifat: reportFields.sifat,
      derajat: reportFields.derajat,
      status: status,
      priority: priority,
      created_by: user.id,
      current_holder: user.id,
    }).select().single()

    if (reportError) return NextResponse.json({ error: reportError.message }, { status: 500 })

    if (originalFiles && originalFiles.length > 0) {
      const fileAttachments = originalFiles.map((file: any) => ({
        report_id: report.id,
        file_name: file.fileName || file.file_name || file.name,
        file_url: file.fileUrl || file.file_url || file.url,
        file_type: "original",
        file_size: file.size || null,
        uploaded_by: user.id,
      })).filter((f: any) => f.file_url);

      if (fileAttachments.length > 0) {
        await supabase.from("file_attachments").insert(fileAttachments)
      }
    }

    await supabase.from("workflow_history").insert({
      report_id: report.id,
      action: "Laporan dibuat",
      user_id: user.id,
      status: status,
      notes: `Laporan baru dibuat oleh ${profile.role}`,
    })

    return NextResponse.json({ success: true, report })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 })
  }
}

// --- HANDLE UPDATE (PUT) ---
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    // 🔑 Tambahkan coordinatorId di sini untuk ditangkap dari body
    const { id, action, notes, currentUser, originalFiles, coordinatorId, ...reportData } = body;

    if (!id) return NextResponse.json({ error: "ID Laporan diperlukan" }, { status: 400 });

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. UPDATE LAPORAN
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
      no_surat: reportData.noSurat,
      hal: reportData.hal,
      layanan: reportData.layanan,
      sub_layanan: reportData.sub_layanan || reportData.subLayanan,
      dari: reportData.dari,
      tanggal_surat: reportData.tanggalSurat,
      tanggal_agenda: reportData.tanggalAgenda,
      link_documents: reportData.linkDocuments,
      no_agenda: reportData.noAgenda,
      kelompok_asal_surat: reportData.kelompokAsalSurat,
      agenda_sestama: reportData.agendaSestama,
      sifat: reportData.sifat,
      derajat: reportData.derajat,
      // 🔑 Masukkan coordinator_id ke dalam database jika dikirim dari frontend
      ...(coordinatorId && { coordinator_id: coordinatorId }),
      ...(reportData.status && { status: reportData.status }),
    };

    // Bersihkan payload dari nilai undefined agar tidak error
    Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);

    const { data, error } = await supabase.from("reports").update(updatePayload).eq("id", id).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 2. UPDATE FILE LAMPIRAN
    if (originalFiles) {
      await supabase.from("file_attachments").delete().eq("report_id", id);
      if (originalFiles.length > 0) {
        const filesToInsert = originalFiles.map((file: any) => {
          const name = file.fileName || file.file_name || file.name || "Lampiran";
          const url = file.fileUrl || file.file_url || file.url;
          if (!url) return null;
          return {
            report_id: id,
            file_name: name,
            file_url: url,
            file_type: file.type || file.file_type || "document",
            file_size: file.size || file.file_size || null,
            uploaded_by: user.id,
            created_at: new Date().toISOString()
          };
        }).filter(Boolean);

        if (filesToInsert.length > 0) {
          const { error: fileError } = await supabase.from("file_attachments").insert(filesToInsert);
          if (fileError) throw new Error("Gagal menyimpan lampiran: " + fileError.message);
        }
      }
    }

    // 3. HISTORY
    if (action) {
      await supabase.from("workflow_history").insert({
        report_id: id,
        action: action,
        user_id: user.id,
        status: updatePayload.status || data.status,
        notes: notes || ""
      });
    }

    return NextResponse.json({ success: true, report: data, message: "Berhasil update" });
  } catch (error: any) {
    console.error("PUT Error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}

// --- HANDLE GET (READ) ---
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const { data: reports, error } = await supabase.from("reports").select(`*, file_attachments (*), letter_tracking (*), profiles!reports_created_by_fkey (name, role)`).order("created_at", { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ reports })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}