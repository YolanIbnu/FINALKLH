"use client"

import type React from "react"
import { createContext, useContext, useReducer, useMemo, useCallback, useEffect, type ReactNode } from "react"
import type { User, Report, TaskAssignment } from "../types"
import { supabase } from "../../lib/supabaseClient"

// Antarmuka State dan Aksi
interface AppState {
  currentUser: User | null
  users: User[]
  reports: Report[]
  isAuthenticated: boolean
  isConnected: boolean
  lastSyncTime: string | null
}

type AppAction =
  | { type: "LOGIN"; payload: User }
  | { type: "LOGOUT" }
  | { type: "SET_USERS"; payload: User[] }
  | { type: "ADD_USER"; payload: User }
  | { type: "UPDATE_USER"; payload: User }
  | { type: "DELETE_USER"; payload: string }
  | { type: "SET_REPORTS"; payload: Report[] }
  | { type: "ADD_REPORT"; payload: Report }
  | { type: "UPDATE_REPORT"; payload: Report }
  | { type: "DELETE_REPORT"; payload: string }
// Tipe aksi lain bisa ditambahkan di sini jika perlu

// State Awal
const initialState: AppState = {
  currentUser: null,
  users: [],
  reports: [],
  isAuthenticated: false,
  isConnected: false,
  lastSyncTime: null,
}

// Reducer untuk mengelola state
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "LOGIN":
      localStorage.setItem("sitrack_app_state", JSON.stringify({ currentUser: action.payload, isAuthenticated: true }))
      return { ...state, currentUser: action.payload, isAuthenticated: true }
    case "LOGOUT":
      localStorage.removeItem("sitrack_app_state")
      return { ...initialState }
    case "SET_USERS":
      return { ...state, users: action.payload }
    case "ADD_USER":
      if (state.users.some(u => u.id === action.payload.id)) return state
      return { ...state, users: [...state.users, action.payload] }
    case "UPDATE_USER":
      return { ...state, users: state.users.map((u) => (u.id === action.payload.id ? action.payload : u)) }
    case "DELETE_USER":
      return { ...state, users: state.users.filter((u) => u.id !== action.payload) }
    case "SET_REPORTS":
      return { ...state, reports: action.payload }
    case "ADD_REPORT":
      if (state.reports.some((report) => report.id === action.payload.id)) return state
      return { ...state, reports: [action.payload, ...state.reports] }
    case "UPDATE_REPORT":
      return { ...state, reports: state.reports.map((r) => (r.id === action.payload.id ? action.payload : r)) }
    case "DELETE_REPORT":
      return { ...state, reports: state.reports.filter((r) => r.id !== action.payload) }
    default:
      return state
  }
}

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<AppAction> } | null>(null)

export { AppContext }

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  useEffect(() => {
    const saved = localStorage.getItem("sitrack_app_state")
    if (saved) {
      const { currentUser, isAuthenticated } = JSON.parse(saved)
      if (currentUser && isAuthenticated) {
        dispatch({ type: "LOGIN", payload: currentUser })
      }
    }
  }, [])

  useEffect(() => {
    if (!state.isAuthenticated) return

    const fetchInitialData = async () => {
      const { data: usersData, error: usersError } = await supabase.from("profiles").select("*")
      if (usersError) console.error("Error fetching users:", usersError)
      else if (usersData) dispatch({ type: "SET_USERS", payload: usersData as User[] })

      const { data: reportsData, error: reportsError } = await supabase.from("reports").select("*, file_attachments(*)").order("created_at", { ascending: false })
      if (reportsError) console.error("Error fetching reports:", reportsError)
      else if (reportsData) dispatch({ type: "SET_REPORTS", payload: reportsData as Report[] })
    }
    fetchInitialData()

    // 🔥 PERBAIKAN UTAMA: Listener ini sekarang menerima SEMUA perubahan dari tabel 'reports' tanpa filter.
    const reportChannel = supabase
      .channel("reports-realtime-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, (payload) => {
        if (payload.eventType === "INSERT") {
          dispatch({ type: "ADD_REPORT", payload: payload.new as Report })
        }
        if (payload.eventType === "UPDATE") {
          dispatch({ type: "UPDATE_REPORT", payload: payload.new as Report })
        }
        if (payload.eventType === "DELETE") {
          dispatch({ type: "DELETE_REPORT", payload: (payload.old as any).id })
        }
      })
      .subscribe()

    const profileChannel = supabase
      .channel("profiles-realtime-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, (payload) => {
        if (payload.eventType === "INSERT") dispatch({ type: "ADD_USER", payload: payload.new as User })
        if (payload.eventType === "UPDATE") dispatch({ type: "UPDATE_USER", payload: payload.new as User })
        if (payload.eventType === "DELETE") dispatch({ type: "DELETE_USER", payload: (payload.old as any).id })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(reportChannel)
      supabase.removeChannel(profileChannel)
    }
  }, [state.isAuthenticated])

  const contextValue = useMemo(() => ({ state, dispatch }), [state])

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}