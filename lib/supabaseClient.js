import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tfpleowwysvuaijbxmsl.supabase.co"

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmcGxlb3d3eXN2dWFpamJ4bXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjM1NjAsImV4cCI6MjA3MTc5OTU2MH0._42yCm4fr-1KS2Ud1-bYuYSrrPBEt0Uo4ekomI17dto"

console.log("[v0] Client - Environment variables check:")
console.log("[v0] Client - NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✓ Found" : "✗ Missing")
console.log("[v0] Client - NEXT_PUBLIC_SUPABASE_ANON_KEY:", supabaseAnonKey ? "✓ Found" : "✗ Missing")
console.log("[v0] Client - Using Supabase URL:", supabaseUrl?.substring(0, 30) + "...")

console.log("[v0] Creating real browser Supabase client")
const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
console.log("[v0] Successfully created Supabase client")

export { supabase }
