-- Tambah kolom full_name ke tabel profiles jika belum ada
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
