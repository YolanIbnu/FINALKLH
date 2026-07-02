"use client"

import React, { useState } from "react"

interface UserFormUser {
  name: string;
  role: string;
  email?: string;
}

interface UserFormProps {
  user?: UserFormUser;
  onSubmit: (userData: UserFormUser) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function UserForm({ user, onSubmit, onCancel, loading }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormUser>({
    name: user?.name || "",
    role: user?.role || "",
    email: user?.email || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-96">
        <h2 className="text-xl font-semibold mb-4">
          {user ? "Edit Pengguna" : "Tambah Pengguna"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Username (ID Pengguna)
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded">Batal</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}