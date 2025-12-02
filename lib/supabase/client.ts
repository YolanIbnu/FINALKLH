import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase environment variables not found. Using mock client.")

    const createMockQueryBuilder = () => ({
      select: (columns?: string) => createMockQueryBuilder(),
      insert: (data: any) => createMockQueryBuilder(),
      update: (data: any) => createMockQueryBuilder(),
      delete: () => createMockQueryBuilder(),
      upsert: (data: any) => createMockQueryBuilder(),
      order: (column: string, options?: any) => createMockQueryBuilder(),
      limit: (count: number) => createMockQueryBuilder(),
      range: (from: number, to: number) => createMockQueryBuilder(),
      eq: (column: string, value: any) => createMockQueryBuilder(),
      neq: (column: string, value: any) => createMockQueryBuilder(),
      gt: (column: string, value: any) => createMockQueryBuilder(),
      gte: (column: string, value: any) => createMockQueryBuilder(),
      lt: (column: string, value: any) => createMockQueryBuilder(),
      lte: (column: string, value: any) => createMockQueryBuilder(),
      like: (column: string, pattern: string) => createMockQueryBuilder(),
      ilike: (column: string, pattern: string) => createMockQueryBuilder(),
      is: (column: string, value: any) => createMockQueryBuilder(),
      in: (column: string, values: any[]) => createMockQueryBuilder(),
      contains: (column: string, value: any) => createMockQueryBuilder(),
      containedBy: (column: string, value: any) => createMockQueryBuilder(),
      rangeGt: (column: string, value: any) => createMockQueryBuilder(),
      rangeGte: (column: string, value: any) => createMockQueryBuilder(),
      rangeLt: (column: string, value: any) => createMockQueryBuilder(),
      rangeLte: (column: string, value: any) => createMockQueryBuilder(),
      rangeAdjacent: (column: string, value: any) => createMockQueryBuilder(),
      overlaps: (column: string, value: any) => createMockQueryBuilder(),
      textSearch: (column: string, query: string) => createMockQueryBuilder(),
      match: (query: Record<string, any>) => createMockQueryBuilder(),
      not: (column: string, operator: string, value: any) => createMockQueryBuilder(),
      or: (filters: string) => createMockQueryBuilder(),
      filter: (column: string, operator: string, value: any) => createMockQueryBuilder(),
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (resolve: any, reject?: any) => Promise.resolve({ data: [], error: null }).then(resolve, reject),
      catch: (reject: any) => Promise.resolve({ data: [], error: null }).catch(reject),
    })

    return {
      from: (table: string) => createMockQueryBuilder(),
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithPassword: () => Promise.resolve({ data: null, error: null }),
        signUp: (credentials: any) =>
          Promise.resolve({
            data: {
              user: {
                id: `mock-user-${Date.now()}`,
                email: credentials.email,
                user_metadata: credentials.options?.data || {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            },
            error: null,
          }),
        signOut: () => Promise.resolve({ error: null }),
        admin: {
          deleteUser: () => Promise.resolve({ data: null, error: null }),
          updateUserById: () => Promise.resolve({ data: null, error: null }),
        },
      },
      channel: () => ({
        on: () => ({ subscribe: () => {} }),
        unsubscribe: () => {},
      }),
    }
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
