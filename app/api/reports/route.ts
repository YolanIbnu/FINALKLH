import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

// --- HANDLE CREATE (POST) ---
export async function POST(request: NextRequest) {
  try {
    const reportData = await request.json()
    const { originalFiles, ...reportFields } = reportData

    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)

    // 1. Cek User & Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", details: authError?.message || "No user found" },
        { status: 401 },
      )
    }

    // 2. Cek Profile & Role
    let { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile) {
      // Buat profile baru jika belum ada (Fallback)
      const { data: newProfile } = await supabase
        .from("profiles")
        .insert({ id: user.id, name: user.email?.split("@")[0] || "User", role: "Staff" })
        .select("role")
        .single()
      profile = newProfile
    }

    const allowedRoles = ["TU", "Admin", "Coordinator", "Koordinator"]
    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { error: "Only TU, Admin, and Coordinator can create reports" },
        { status: 403 },
      )
    }

    // 3. Setup Default Values
    const status = ["draft", "in-progress", "completed", "revision-required", "forwarded-to-tu"].includes(reportFields.status) ? reportFields.status : "draft"
    const priority = ["rendah", "sedang", "tinggi"].includes(reportFields.priority) ? reportFields.priority : "sedang"

    // 4. INSERT KE DATABASE
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert({
        // Mapping Data dari Frontend ke Database
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

        // SEKARANG SUDAH AKTIF (Karena kolom sudah Anda tambahkan)
        sifat: reportFields.sifat,
        derajat: reportFields.derajat,

        status: status,
        priority: priority,
        created_by: user.id,
        current_holder: user.id,
      })
      .select()
      .single()

    if (reportError) {
      console.error("Error creating report:", reportError)
      return NextResponse.json({ error: "Failed to create report", details: reportError.message }, { status: 500 })
    }

    // 5. Insert File Attachments (Jika ada)
    if (originalFiles && originalFiles.length > 0) {
      const fileAttachments = originalFiles.map((file: any) => ({
        report_id: report.id,
        file_name: file.fileName,
        file_url: file.fileUrl,
        file_type: "original",
        file_size: file.size || null,
        uploaded_by: user.id,
      }))
      await supabase.from("file_attachments").insert(fileAttachments)
    }

    // 6. Catat di Workflow History
    await supabase.from("workflow_history").insert({
      report_id: report.id,
      action: "Laporan dibuat",
      user_id: user.id,
      status: status,
      notes: `Laporan baru dibuat oleh ${profile.role}`,
    })

    // 7. Ambil Tracking Number
    const { data: tracking } = await supabase
      .from("letter_tracking")
      .select("tracking_number")
      .eq("report_id", report.id)
      .single()

    return NextResponse.json({
      success: true,
      report: {
        ...report,
        trackingNumber: tracking?.tracking_number || `TRK-${report.id.slice(0, 8)}`,
      },
    })
  } catch (error) {
    console.error("Error in report creation:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

// --- GANTI SELURUH FUNGSI "PUT" DI route.ts DENGAN INI ---
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, notes, currentUser, originalFiles, ...reportData } = body;

    if (!id) {
      return NextResponse.json({ error: "ID Laporan diperlukan untuk update" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Update Data Laporan Utama
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
      // Update status hanya jika dikirim (misal saat forward)
      ...(reportData.status && { status: reportData.status }),
    };

    // Bersihkan field undefined
    Object.keys(updatePayload).forEach(key =>
      updatePayload[key] === undefined && delete updatePayload[key]
    );

    const { data, error } = await supabase
      .from("reports")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 2. LOGIKA BARU: Sinkronisasi File Lampiran (Fix Foto A/B)
    // Jika frontend mengirim field 'originalFiles' (walaupun array kosong), 
    // berarti kita harus menyamakan isi database dengan isi form.
    if (originalFiles) {
      // A. Hapus semua file lama yang terhubung dengan report ini
      // (Ini cara paling aman agar tidak ada duplikat atau file yang harusnya dihapus tapi ketinggalan)
      await supabase.from("file_attachments").delete().eq("report_id", id);

      // B. Insert ulang file-file yang ada di form saat ini (Foto A baru, dsb)
      if (originalFiles.length > 0) {
        const filesToInsert = originalFiles.map((file: any) => ({
          report_id: id,
          file_name: file.fileName,
          file_url: file.fileUrl,
          file_type: "original",
          file_size: file.size || null,
          // Kita set uploader ke user yang sedang mengedit agar UUID valid
          uploaded_by: user.id,
          created_at: new Date().toISOString()
        }));

        const { error: fileError } = await supabase
          .from("file_attachments")
          .insert(filesToInsert);

        if (fileError) {
          console.error("Gagal update file attachments:", fileError);
        }
      }
    }

    // 3. Insert Workflow History (Jika ada action/forward)
    if (action) {
      await supabase.from("workflow_history").insert({
        report_id: id,
        action: action,
        user_id: user.id,
        status: updatePayload.status || data.status,
        notes: notes || ""
      });
    }

    return NextResponse.json({
      success: true,
      report: data,
      message: "Berhasil update laporan"
    });

  } catch (error: any) {
    console.error("Server error during PUT:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
// --- HANDLE GET (READ) ---
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)

    const { data: reports, error: reportsError } = await supabase
      .from("reports")
      .select(`
        *,
        file_attachments (*),
        letter_tracking (*),
        profiles!reports_created_by_fkey (name, role)
      `)
      .order("created_at", { ascending: false })

    if (reportsError) {
      console.error("Error fetching reports:", reportsError)
      return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 })
    }

    return NextResponse.json({ reports })
  } catch (error) {
    console.error("Error fetching reports:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}