import type React from "react"
import type { Metadata } from "next"
import ClientLayout from "./client-layout"
import "./globals.css"

export const metadata: Metadata = {
  title: "Sistem Tracking Pesan & Workflow - Kementerian Lingkungan Hidup",
  description: "Sistem pelacakan pesan dan alur kerja resmi Kementerian Lingkungan Hidup Republik Indonesia",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <ClientLayout>{children}</ClientLayout>
}
