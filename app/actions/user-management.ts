// app/actions/user-management.ts
'use server'

import { createClient } from '@supabase/supabase-js'

// Inisialisasi Admin Client (Hanya berjalan di Server)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

export async function adminCreateUser(userData: {
    email: string;
    password?: string;
    name: string;
    fullName: string;
    role: string;
}) {
    try {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: userData.email,
            password: userData.password || "123456", // Password default jika kosong
            email_confirm: true,
            user_metadata: {
                name: userData.name,
                full_name: userData.fullName,
                role: userData.role
            }
        })

        if (error) throw error
        return { success: true, user: data.user }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function adminUpdateUser(userId: string, data: {
    password?: string;
    name?: string;     // Untuk update username/user_metadata
    fullName?: string; // Untuk update full_name/user_metadata
    email?: string;    // Jika username berubah, email buatan juga berubah
}) {
    try {
        const updates: any = { user_metadata: {} }

        // Update Password jika diisi
        if (data.password && data.password.trim() !== "") {
            updates.password = data.password
        }

        // Update Email jika ada
        if (data.email) {
            updates.email = data.email
        }

        // Update Metadata (agar nama di Auth ikut berubah)
        if (data.name) updates.user_metadata.name = data.name
        if (data.fullName) updates.user_metadata.full_name = data.fullName

        // Gabungkan metadata baru dengan yang lama
        const { error } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            updates
        )

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function adminDeleteUser(userId: string) {
    try {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (error) throw error
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}