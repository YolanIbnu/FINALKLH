/** @type {import('next').NextConfig} */
const nextConfig = {
  // HAPUS properti `eslint` untuk menghilangkan peringatan Unrecognized Key

  // Opsi ini tidak disarankan, tetapi dipertahankan jika Anda ingin mengabaikan Type Errors
  typescript: {
    ignoreBuildErrors: true,
  },

  // Opsi ini menonaktifkan optimasi gambar bawaan Next.js
  images: {
    unoptimized: true,
  },
};

export default nextConfig;