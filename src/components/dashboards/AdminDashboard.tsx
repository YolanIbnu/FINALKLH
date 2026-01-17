"use client";

import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Plus, Edit, Trash2, Users, FileText, Clock, LogOut, Search } from "lucide-react";
import { UserForm } from "../forms/UserForm";
import { supabase } from "../../../lib/supabaseClient";
// IMPORT SERVER ACTION YANG BARU DIBUAT
import { adminCreateUser, adminUpdateUser, adminDeleteUser } from "@/app/actions/user-management";

type UserFormUser = {
  name?: string;
  full_name?: string;
  password?: string;
  role?: string;
  supabase_id?: string;
  id?: string;
};

// Helper function untuk mengambil nama yang akan ditampilkan
function getDisplayName(user: any) {
  if (!user) return "-";
  return user.full_name || "-";
}

export function AdminDashboard() {
  const { state, dispatch } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserFormUser | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [supabaseUsers, setSupabaseUsers] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadAndSetup = async () => {
      await loadUsersFromDatabase();
      setupRealtimeSubscription();
    };
    loadAndSetup();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: string | Date) => {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];
    const d = typeof date === "string" ? new Date(date) : date;
    const dayName = days[d.getDay()];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const time = d.toLocaleTimeString("id-ID", { hour12: false });
    return {
      time,
      date: `${dayName}, ${day} ${month} ${year}`,
    };
  };

  const loadUsersFromDatabase = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, name, full_name, role, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading users:", error);
        return;
      }

      const mappedData = data.map((user) => ({
        ...user,
        full_name: user.full_name || user.name || '',
      }));

      // Hapus duplikat jika ada
      const uniqueUsers = [...new Map(mappedData.map((u) => [u.id, u])).values()];
      setSupabaseUsers(uniqueUsers);

    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("profiles-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          setSupabaseUsers((prev) => {
            const updated = new Map(prev.map((u) => [u.id, u]));

            if (payload.eventType === "DELETE") {
              updated.delete((payload.old as any).id);
            } else {
              const user = { ...(payload.new as any), full_name: (payload.new as any).full_name ?? "" };
              // Pastikan ada ID
              const userId = (user as any).id;
              if (userId) {
                updated.set(userId, user);
              }
            }
            return [...updated.values()];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAddUser = () => {
    setEditingUser(undefined);
    setShowForm(true);
  };

  const handleEditUser = (user: UserFormUser) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleDeleteUser = async (profileId: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus pengguna ini?")) {
      try {
        setLoading(true);

        const userToDelete = supabaseUsers.find((u) => u.id === profileId);
        if (!userToDelete) {
          alert("Pengguna tidak ditemukan.");
          return;
        }

        // 1. Hapus dari Auth menggunakan Server Action
        const result = await adminDeleteUser(userToDelete.user_id);

        if (!result.success) {
          console.error("Auth delete error:", result.error);
          alert("Gagal menghapus akun login: " + result.error);
          return;
        }

        // 2. Hapus dari Profiles (Database)
        // Note: Jika kamu punya CASCADE setting di database, ini mungkin otomatis.
        // Tapi kita hapus manual untuk memastikan UI update.
        const { error: dbError } = await supabase
          .from("profiles")
          .delete()
          .eq("id", profileId);

        if (dbError) {
          console.warn("Profile delete warning (might be cascaded):", dbError);
        }

        console.log("Pengguna berhasil dihapus.");
        await new Promise((resolve) => setTimeout(resolve, 500));
        await loadUsersFromDatabase();

        alert("Pengguna berhasil dihapus.");
      } catch (error) {
        console.error("Kesalahan saat menghapus pengguna:", error);
        alert("Gagal menghapus pengguna.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFormSubmit = async (userData: UserFormUser) => {
    try {
      setLoading(true);

      // Validasi dasar
      if (!userData.name || userData.name.trim() === "") {
        alert("Username/ID Pengguna wajib diisi.");
        setLoading(false);
        return;
      }

      // Format Email otomatis dari Username
      const usernameForEmail = userData.name.toLowerCase().replace(/\s+/g, '.');
      const generatedEmail = `${usernameForEmail}@sitrack.gov.id`;

      if (editingUser && editingUser.id) {
        // === MODE EDIT USER ===

        // Cari data asli untuk mendapatkan user_id (Auth ID)
        const originalUser = supabaseUsers.find(u => u.id === editingUser.id);

        if (!originalUser || !originalUser.user_id) {
          alert("Data autentikasi pengguna tidak ditemukan.");
          setLoading(false);
          return;
        }

        // 1. Update ke SUPABASE AUTH (Login, Password, Email) via Server Action
        const authResult = await adminUpdateUser(originalUser.user_id, {
          password: userData.password, // Akan diabaikan jika kosong
          email: generatedEmail,       // Update email login sesuai username baru
          name: userData.name,
          fullName: userData.full_name
        });

        if (!authResult.success) {
          alert("Gagal update data login: " + authResult.error);
          setLoading(false);
          return;
        }

        // 2. Update ke TABLE PROFILES (Data Tampilan)
        const { error: dbError } = await supabase
          .from("profiles")
          .update({
            name: userData.name,
            full_name: userData.full_name,
            role: userData.role,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingUser.id);

        if (dbError) {
          alert("Gagal mengupdate profil database: " + dbError.message);
          return;
        }

      } else {
        // === MODE TAMBAH USER BARU ===

        // 1. Buat User di Auth via Server Action (Auto Confirm Email)
        const authResult = await adminCreateUser({
          email: generatedEmail,
          password: userData.password,
          name: userData.name,
          fullName: userData.full_name || "",
          role: userData.role || "Staff"
        });

        if (!authResult.success) {
          alert("Gagal membuat user login: " + authResult.error);
          setLoading(false);
          return;
        }

        // Note: Biasanya ada Trigger Database 'handle_new_user' yang otomatis 
        // membuat baris di tabel 'profiles' saat user Auth dibuat.
        // Jika trigger gagal atau tidak ada, kita bisa insert manual di sini.
        // Namun, jika sudah ada trigger, insert manual akan error "duplicate key".
        // Kita asumsikan Trigger berjalan normal. 
      }

      await loadUsersFromDatabase();
      alert(editingUser ? "Pengguna berhasil diupdate." : "Pengguna baru berhasil dibuat.");
      setShowForm(false);
      setEditingUser(undefined);
    } catch (error) {
      console.error("Unexpected error in handleFormSubmit:", error);
      alert("Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    dispatch({ type: "LOGOUT" });
  };

  const filteredUsers = supabaseUsers.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalUsers: supabaseUsers.length,
    adminUsers: supabaseUsers.filter((u) => u.role === "Admin").length,
    tuUsers: supabaseUsers.filter((u) => u.role === "TU").length,
    coordinatorUsers: supabaseUsers.filter((u) => u.role === "Koordinator" || u.role === "Coordinator").length,
    staffUsers: supabaseUsers.filter((u) => u.role === "Staff").length,
  };

  const { time, date } = formatDateTime(currentTime);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Tracking Letters</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
              <Clock className="w-4 h-4" />
              <span>{time}</span>
              <span>{date}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{state.currentUser?.name || "User"}</div>
                <div className="text-xs text-blue-600">Sesi Aktif</div>
              </div>
              <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-medium">
                {state.currentUser?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* STATS CARDS */}
        <div className="grid grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
              <Users className="w-6 h-6 text-gray-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Admin</p>
                <p className="text-3xl font-bold text-red-600">{stats.adminUsers}</p>
              </div>
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Koordinator</p>
                <p className="text-3xl font-bold text-blue-600">{stats.coordinatorUsers}</p>
              </div>
              <div className="w-6 h-6 text-blue-500">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Tata Usaha</p>
                <p className="text-3xl font-bold text-green-600">{stats.tuUsers}</p>
              </div>
              <FileText className="w-6 h-6 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Staff</p>
                <p className="text-3xl font-bold text-gray-900">{stats.staffUsers}</p>
              </div>
              <Users className="w-6 h-6 text-gray-500" />
            </div>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Manajemen User</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari pengguna..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <button
                  onClick={handleAddUser}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Tambah User
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-6 font-medium text-gray-600 text-sm">Username</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-600 text-sm">Nama Lengkap</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-600 text-sm">Role</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-600 text-sm">Dibuat</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-600 text-sm">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6 text-sm font-medium text-gray-900">{user.name}</td>
                    <td className="py-4 px-6 text-sm text-gray-900">{getDisplayName(user)}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-3 py-1 inline-flex text-xs font-medium rounded-full ${user.role === "Admin"
                          ? "bg-red-100 text-red-800"
                          : user.role === "TU"
                            ? "bg-blue-100 text-blue-800"
                            : user.role === "Koordinator" || user.role === "Coordinator"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString("id-ID") : "-"}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          disabled={loading}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Edit Pengguna"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={loading}
                          className="p-2 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
                          title="Hapus Pengguna"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      {searchTerm ? "Tidak ada pengguna yang cocok." : "Belum ada pengguna yang terdaftar."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              <p className="text-gray-900 font-medium">Memproses data...</p>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <UserForm
          user={editingUser}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingUser(undefined);
          }}
          loading={loading}
        />
      )}
    </div>
  );
}