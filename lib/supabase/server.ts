import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export function createClient() {
  const cookieStore = cookies()

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://tfpleowwysvuaijbxmsl.supabase.co"

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmcGxlb3d3eXN2dWFpamJ4bXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjM1NjAsImV4cCI6MjA3MTc5OTU2MH0._42yCm4fr-1KS2Ud1-bYuYSrrPBEt0Uo4ekomI17dto"

  console.log("[v0] Server - Environment variables check:")
  console.log("[v0] Server - NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ Found" : "✗ Missing")
  console.log("[v0] Server - SUPABASE_URL:", process.env.SUPABASE_URL ? "✓ Found" : "✗ Missing")
  console.log(
    "[v0] Server - NEXT_PUBLIC_SUPABASE_ANON_KEY:",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✓ Found" : "✗ Missing",
  )
  console.log("[v0] Server - SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "✓ Found" : "✗ Missing")
  console.log("[v0] Server - Final URL:", supabaseUrl ? "✓ Found" : "✗ Missing")
  console.log("[v0] Server - Final Key:", supabaseAnonKey ? "✓ Found" : "✗ Missing")

  console.log("[v0] Creating real server Supabase client connection")
  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

export function createServerClient(cookieStore: any) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://tfpleowwysvuaijbxmsl.supabase.co"

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmcGxlb3d3eXN2dWFpamJ4bXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjM1NjAsImV4cCI6MjA3MTc5OTU2MH0._42yCm4fr-1KS2Ud1-bYuYSrrPBEt0Uo4ekomI17dto"

  console.log("[v0] ServerClient - Environment variables check:")
  console.log(
    "[v0] ServerClient - NEXT_PUBLIC_SUPABASE_URL:",
    process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ Found" : "✗ Missing",
  )
  console.log("[v0] ServerClient - SUPABASE_URL:", process.env.SUPABASE_URL ? "✓ Found" : "✗ Missing")
  console.log(
    "[v0] ServerClient - NEXT_PUBLIC_SUPABASE_ANON_KEY:",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✓ Found" : "✗ Missing",
  )
  console.log("[v0] ServerClient - SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "✓ Found" : "✗ Missing")

  console.log("[v0] Creating real server client with URL:", supabaseUrl.substring(0, 30) + "...")
  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

export function createServiceClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://tfpleowwysvuaijbxmsl.supabase.co"

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmcGxlb3d3eXN2dWFpamJ4bXNsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjIyMzU2MCwiZXhwIjoyMDcxNzk5NTYwfQ.y4iezeRUKPqLnJzL6ZtEvTunR5hHzmiXgBvF39RD1yk"

  console.log("[v0] Service - Environment variables check:")
  console.log(
    "[v0] Service - NEXT_PUBLIC_SUPABASE_URL:",
    process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ Found" : "✗ Missing",
  )
  console.log("[v0] Service - SUPABASE_URL:", process.env.SUPABASE_URL ? "✓ Found" : "✗ Missing")
  console.log(
    "[v0] Service - SUPABASE_SERVICE_ROLE_KEY:",
    process.env.SUPABASE_SERVICE_ROLE_KEY ? "✓ Found" : "✗ Missing",
  )

  console.log("[v0] Creating real service role Supabase client connection")
  return createSupabaseServerClient(supabaseUrl, serviceRoleKey, {
    cookies: {
      getAll() {
        return []
      },
      setAll() {
        // No-op for service role client
      },
    },
  })
}
