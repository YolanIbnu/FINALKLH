interface UserFormProps {
  user?: UserFormUser;
  onSubmit: (userData: UserFormUser) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function UserForm({ user, onSubmit, onCancel, loading }: UserFormProps) {
  // ...existing code...

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
              defaultValue={user?.name || ""}
              className="w-full p-2 border rounded"
              // Hapus pattern dan validasi yang membatasi spasi
              required
            />
          </div>
          // ...existing code...
        </form>
      </div>
    </div>
  );
}