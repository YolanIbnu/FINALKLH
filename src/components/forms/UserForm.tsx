"use client"

import { useState } from "react"
import { X } from "lucide-react"

const ROLES = ["Admin", "TU", "Koordinator", "Staff"]

interface UserFormProps {
  user?: {
    id?: string;
    name?: string;
    full_name?: string;
    password?: string;
    role?: string;
    supabase_id?: string;
  };
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
};

export function UserForm({ user, onSubmit, onCancel, loading = false }: UserFormProps): React.ReactElement {
  const [formData, setFormData] = useState({
    name: user?.name || "", // Username/ID Pengguna
    full_name: user?.full_name || "", // Nama Lengkap
    password: user?.password || "",
    role: user?.role || "Staff",
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const userData = {
      name: formData.get('name') as string,
      full_name: formData.get('full_name') as string,
      password: formData.get('password') as string,
      role: formData.get('role') as string,
      // Tambahkan id dan supabase_id jika sedang mengedit user
      ...(user?.id && { id: user.id }),
      ...(user?.supabase_id && { supabase_id: user.supabase_id })
    };

    onSubmit(userData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "name") {
      // Hanya izinkan huruf dan angka, tanpa spasi/simbol
      const sanitized = value.replace(/[^a-zA-Z0-9]/g, "");
      setFormData({
        ...formData,
        [name]: sanitized,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{user ? "Edit Pengguna" : "Tambah Pengguna"}</h2>
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            type="button"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          {loading && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-sm">Menyimpan data ke database...</p>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Username (ID Pengguna)
              </label>
              <input
                type="text"
                id="name"
                name="name"
                defaultValue={user?.name || ""}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="Masukkan username/ID pengguna"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                Nama Lengkap
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                defaultValue={user?.full_name || ""}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="Masukkan nama lengkap"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="Masukkan password"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                disabled={loading}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : user ? "Simpan" : "Tambah"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

