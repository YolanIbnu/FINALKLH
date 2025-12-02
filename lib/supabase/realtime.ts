import { supabase } from "../supabaseClient"
import type { RealtimeChannel } from "@supabase/supabase-js"

export type RealtimeSubscription = {
  channel: RealtimeChannel
  unsubscribe: () => void
}

export function subscribeToReports(
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
  onDelete?: (payload: any) => void,
): RealtimeSubscription {
  const channel = supabase
    .channel("reports_changes")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "reports" }, (payload) => onInsert?.(payload))
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "reports" }, (payload) => onUpdate?.(payload))
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "reports" }, (payload) => onDelete?.(payload))
    .subscribe()

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}

export function subscribeToTaskAssignments(
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
  onDelete?: (payload: any) => void,
): RealtimeSubscription {
  const channel = supabase
    .channel("task_assignments_changes")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "task_assignments" }, (payload) =>
      onInsert?.(payload),
    )
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "task_assignments" }, (payload) =>
      onUpdate?.(payload),
    )
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "task_assignments" }, (payload) =>
      onDelete?.(payload),
    )
    .subscribe()

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}

export function subscribeToWorkflowHistory(
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
): RealtimeSubscription {
  const channel = supabase
    .channel("workflow_history_changes")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "workflow_history" }, (payload) =>
      onInsert?.(payload),
    )
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "workflow_history" }, (payload) =>
      onUpdate?.(payload),
    )
    .subscribe()

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}

export function subscribeToFileAttachments(
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
  onDelete?: (payload: any) => void,
): RealtimeSubscription {
  const channel = supabase
    .channel("file_attachments_changes")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "file_attachments" }, (payload) =>
      onInsert?.(payload),
    )
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "file_attachments" }, (payload) =>
      onUpdate?.(payload),
    )
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "file_attachments" }, (payload) =>
      onDelete?.(payload),
    )
    .subscribe()

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}

export function subscribeToLetterTracking(
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
  onDelete?: (payload: any) => void,
): RealtimeSubscription {
  const channel = supabase
    .channel("letter_tracking_changes")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "letter_tracking" }, (payload) =>
      onInsert?.(payload),
    )
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "letter_tracking" }, (payload) =>
      onUpdate?.(payload),
    )
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "letter_tracking" }, (payload) =>
      onDelete?.(payload),
    )
    .subscribe()

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}

export function subscribeToProfiles(
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
  onDelete?: (payload: any) => void,
): RealtimeSubscription {
  const channel = supabase
    .channel("profiles_changes")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, (payload) => onInsert?.(payload))
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => onUpdate?.(payload))
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "profiles" }, (payload) => onDelete?.(payload))
    .subscribe()

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}
