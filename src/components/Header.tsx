"use client"

import { Bell } from "lucide-react"
import { useState, useEffect } from "react"
import { useApp } from "../context/AppContext"
import { createClient } from "@supabase/supabase-js"
import Image from "next/image" // Import component Image dari Next.js

// Inisialisasi klien Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function Header({ userRole }: { userRole: string }) {
  const [showLogoutMenu, setShowLogoutMenu] = useState(false)
  const [displayName, setDisplayName] = useState("Memuat...")
  const { dispatch } = useApp()

  useEffect(() => {
    async function fetchUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single()

        if (error) {
          console.error("Error fetching user profile:", error)
          setDisplayName(user.email || "User")
        } else {
          setDisplayName(profile.full_name)
        }
      } else {
        setDisplayName("User")
      }
    }

    fetchUserProfile()
  }, [])

  const handleLogout = () => {
    dispatch({ type: "LOGOUT" })
    setShowLogoutMenu(false)
  }

  const safeUserName = displayName
  const safeUserRole = userRole || "Role"
  const displayTitle = safeUserRole

  const userInitials =
    safeUserName
      .split(" ")
      .map((n) => n[0] || "")
      .join("")
      .toUpperCase() || "U"

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-4">

          {/* --- BAGIAN LOGO DIPERBARUI --- */}
          <div className="relative flex-shrink-0">
            <Image
              src="/Logo SDMO x1.png" // Mengarah ke folder public
              alt="Logo SDMO"
              width={48} // Sesuaikan ukuran (w-12 setara 48px)
              height={48}
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
              priority
            />
          </div>
          {/* ----------------------------- */}

          <div className="hidden sm:block">
            <h1 className="text-xl font-bold text-gray-900">WORKFLOW SDMO - Alur Proses Administrasi</h1>
            <p className="text-sm text-gray-600">Sistem Tracking Surat</p>
          </div>
          <div className="sm:hidden">
            <h1 className="text-lg font-bold text-gray-900">WORKFLOW SDMO</h1>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          <Bell className="hidden sm:block w-5 h-5 text-gray-600 cursor-pointer hover:text-gray-800" />

          <div className="flex items-center space-x-2">
            <div className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium">
              {userInitials}
            </div>
            <div className="cursor-pointer relative" onClick={() => setShowLogoutMenu(!showLogoutMenu)}>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 truncate max-w-24 sm:max-w-none">{safeUserName}</p>
                <p className="text-xs text-gray-600 hidden sm:block">{displayTitle}</p>
              </div>

              {showLogoutMenu && (
                <div className="absolute right-0 top-full mt-2 w-40 sm:w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showLogoutMenu && <div className="fixed inset-0 z-40" onClick={() => setShowLogoutMenu(false)} />}
    </header>
  )
}