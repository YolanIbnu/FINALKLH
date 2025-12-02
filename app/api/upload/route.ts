import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// 1. Inisialisasi Supabase Admin Client
// Menggunakan Service Role Key untuk bypass permission issues saat upload
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("[v0] Critical Error: Missing Supabase environment variables.")
}

const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!)

export async function POST(request: NextRequest) {
  console.log("[v0] Upload API route called - handler executing")

  try {
    console.log("[v0] Request method:", request.method)
    console.log("[v0] Request URL:", request.url)

    // 2. Parsing Form Data (Code asli Anda yang bagus tetap dipertahankan)
    let formData
    try {
      console.log("[v0] Attempting to parse form data...")
      formData = await request.formData()
      console.log("[v0] Form data parsed successfully")

      // Log info file untuk debugging
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`[v0] Form field ${key}: File(${value.name}, ${value.size} bytes, type: ${value.type})`)
        } else {
          console.log(`[v0] Form field ${key}: ${value}`)
        }
      }
    } catch (formError) {
      console.error("[v0] Form data parsing failed:", formError)
      return NextResponse.json(
        {
          error: "Form data parsing failed",
          details: formError instanceof Error ? formError.message : "Unknown error",
        },
        { status: 400 },
      )
    }

    const file = formData.get("file") as File
    const reportId = formData.get("reportId") as string
    const uploadedBy = formData.get("uploadedBy") as string

    // 3. Validasi Input
    if (!file) {
      console.log("[v0] No file provided in form data")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Cek ukuran file (10MB limit)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      console.log("[v0] File too large:", file.size)
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 })
    }

    // 4. Proses Upload ke SUPABASE (Bagian ini yang diganti)
    try {
      console.log("[v0] Starting Supabase Storage upload process...")

      // Persiapkan nama file dan path
      const sanitizedFileName = file.name.replace(/\s+/g, "_")
      const timestamp = Date.now()
      // Path: Surat dari TU / [TIMESTAMP]_[NamaFile]
      const filePath = `Surat dari TU/${timestamp}_${sanitizedFileName}`

      console.log("[v0] Target path:", filePath)

      // Convert file ke Buffer
      const arrayBuffer = await file.arrayBuffer()
      const fileBuffer = new Uint8Array(arrayBuffer)

      // Eksekusi Upload ke Bucket 'original_reports'
      const { data, error: uploadError } = await supabase.storage
        .from("original_reports") // <--- Nama Bucket Sesuai Screenshot Anda
        .upload(filePath, fileBuffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        })

      if (uploadError) {
        console.error("[v0] Supabase Storage upload error:", uploadError)
        throw new Error(uploadError.message)
      }

      console.log("[v0] Upload successful. Path:", data.path)

      // 5. Dapatkan Public URL
      const { data: publicUrlData } = supabase.storage
        .from("original_reports")
        .getPublicUrl(filePath)

      const finalPublicUrl = publicUrlData.publicUrl
      console.log("[v0] Generated Public URL:", finalPublicUrl)

      // 6. Susun Response JSON
      const fileAttachment = {
        id: `supa-${timestamp}`,
        fileName: file.name,
        fileUrl: finalPublicUrl,
        uploadedAt: new Date().toISOString(),
        uploadedBy: uploadedBy || "System", // Fallback jika uploadedBy kosong
        fileType: file.type,
        fileSize: file.size,
        type: "original" as const,
      }

      console.log("[v0] Returning success response:", fileAttachment)
      return NextResponse.json(fileAttachment)

    } catch (storageError) {
      console.error("[v0] Storage operation failed:", storageError)
      return NextResponse.json(
        {
          error: "Storage upload failed",
          details: storageError instanceof Error ? storageError.message : "Unknown storage error",
        },
        { status: 500 },
      )
    }

  } catch (error) {
    console.error("[v0] Unexpected error in upload handler:", error)
    return NextResponse.json(
      {
        error: "Upload handler failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}