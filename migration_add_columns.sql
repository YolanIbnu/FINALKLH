-- SQL Migration untuk menambahkan kolom yang hilang di tabel reports

-- Menambahkan kolom sub_layanan
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS sub_layanan TEXT;

-- Menambahkan kolom no_agenda
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS no_agenda TEXT;

-- Menambahkan kolom kelompok_asal_surat
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS kelompok_asal_surat TEXT;

-- Menambahkan kolom agenda_sestama
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS agenda_sestama TEXT;

-- Menambahkan kolom sifat (sebagai array text karena checkbox multiple)
-- Jika Anda lebih suka JSON, bisa ganti TEXT[] menjadi JSONB
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS sifat TEXT[];

-- Menambahkan kolom derajat (sebagai array text)
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS derajat TEXT[];

-- Memberikan komentar pada kolom (opsional)
COMMENT ON COLUMN public.reports.sub_layanan IS 'Detail layanan spesifik';
COMMENT ON COLUMN public.reports.no_agenda IS 'Nomor agenda surat';
COMMENT ON COLUMN public.reports.kelompok_asal_surat IS 'Kelompok asal surat';
COMMENT ON COLUMN public.reports.agenda_sestama IS 'Agenda Sestama';
