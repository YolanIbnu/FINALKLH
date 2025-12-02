import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase URL or Service Role Key is not defined in .env.local");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    if (!search) {
        return NextResponse.json({ error: 'Nomor surat diperlukan' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('reports')
            .select(`
                *,
                workflow_history (
                    *,
                    profiles: user_id ( name )
                ),
                task_assignments (
                    notes,
                    revision_notes,
                    profiles: staff_id ( name )
                )
            `)
            .ilike('no_surat', search.trim())
            .order('created_at', { foreignTable: 'workflow_history', ascending: true })
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ message: 'Data surat tidak ditemukan' }, { status: 404 });
            }
            throw error;
        }

        if (!data) {
             return NextResponse.json({ message: 'Data surat tidak ditemukan' }, { status: 404 });
        }
        
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('API Tracking Error:', error.message);
        return NextResponse.json({ error: 'Terjadi kesalahan pada server', details: error.message }, { status: 500 });
    }
}

