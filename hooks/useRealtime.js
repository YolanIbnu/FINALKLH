"use client"

import { useEffect, useRef, useState } from "react"
import {
  subscribeToReports,
  subscribeToFileAttachments,
  subscribeToLetterTracking,
  subscribeToProfiles,
} from "../lib/supabase/realtime"

export function useRealtime(tables = [], callbacks = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const subscriptionsRef = useRef([])

  useEffect(() => {
    if (!tables.length) return

    const subscriptions = []

    try {
      tables.forEach((table) => {
        const tableCallbacks = callbacks[table] || {}

        let subscription

        switch (table) {
          case "reports":
            subscription = subscribeToReports(
              (payload) => {
                tableCallbacks.onInsert?.(payload)
                setLastSync(new Date().toISOString())
              },
              (payload) => {
                tableCallbacks.onUpdate?.(payload)
                setLastSync(new Date().toISOString())
              },
              (payload) => {
                tableCallbacks.onDelete?.(payload)
                setLastSync(new Date().toISOString())
              },
            )
            break

          case "file_attachments":
            subscription = subscribeToFileAttachments(
              (payload) => {
                tableCallbacks.onInsert?.(payload)
                setLastSync(new Date().toISOString())
              },
              (payload) => {
                tableCallbacks.onUpdate?.(payload)
                setLastSync(new Date().toISOString())
              },
              (payload) => {
                tableCallbacks.onDelete?.(payload)
                setLastSync(new Date().toISOString())
              },
            )
            break

          case "letter_tracking":
            subscription = subscribeToLetterTracking(
              (payload) => {
                tableCallbacks.onInsert?.(payload)
                setLastSync(new Date().toISOString())
              },
              (payload) => {
                tableCallbacks.onUpdate?.(payload)
                setLastSync(new Date().toISOString())
              },
              (payload) => {
                tableCallbacks.onDelete?.(payload)
                setLastSync(new Date().toISOString())
              },
            )
            break

          case "profiles":
            subscription = subscribeToProfiles(
              (payload) => {
                tableCallbacks.onInsert?.(payload)
                setLastSync(new Date().toISOString())
              },
              (payload) => {
                tableCallbacks.onUpdate?.(payload)
                setLastSync(new Date().toISOString())
              },
              (payload) => {
                tableCallbacks.onDelete?.(payload)
                setLastSync(new Date().toISOString())
              },
            )
            break

          default:
            console.warn(`Unknown table: ${table}`)
            return
        }

        if (subscription) {
          subscriptions.push(subscription)
        }
      })

      subscriptionsRef.current = subscriptions
      setIsConnected(true)
    } catch (error) {
      console.error("Error setting up realtime subscriptions:", error)
      setIsConnected(false)
    }

    return () => {
      subscriptionsRef.current.forEach((subscription) => {
        subscription.unsubscribe()
      })
      subscriptionsRef.current = []
      setIsConnected(false)
    }
  }, [tables, callbacks])

  return {
    isConnected,
    lastSync,
    subscriptions: subscriptionsRef.current,
  }
}
