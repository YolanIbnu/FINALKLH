"use client"

import type React from "react"
import { Inter, Work_Sans } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "600", "700"],
})

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${workSans.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Toaster
          position="top-right"
          richColors={false}
          closeButton
          duration={5000}
          expand={true}
          visibleToasts={5}
          toastOptions={{
            style: {
              fontSize: "14px",
              fontWeight: "500",
            },
            className: "toast-enhanced",
          }}
          theme="light"
        />
        <style jsx global>{`
          .toast-enhanced {
            backdrop-filter: blur(10px);
            animation: slideInRight 0.3s ease-out;
          }
          
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          .toast-success [data-icon] {
            color: #10b981 !important;
          }
          
          .toast-error [data-icon] {
            color: #ef4444 !important;
          }
          
          .toast-warning [data-icon] {
            color: #f59e0b !important;
          }
          
          .toast-info [data-icon] {
            color: #3b82f6 !important;
          }
          
          .toast-interactive [data-icon] {
            color: #8b5cf6 !important;
          }
          
          [data-sonner-toast] [data-button] {
            background: rgba(255, 255, 255, 0.2) !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            color: white !important;
            border-radius: 8px !important;
            padding: 8px 12px !important;
            font-weight: 600 !important;
            transition: all 0.2s ease !important;
          }
          
          [data-sonner-toast] [data-button]:hover {
            background: rgba(255, 255, 255, 0.3) !important;
            transform: translateY(-1px) !important;
          }
        `}</style>
      </body>
    </html>
  )
}
