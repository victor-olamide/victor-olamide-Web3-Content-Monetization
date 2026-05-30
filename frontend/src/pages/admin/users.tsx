import React, { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { adminApi } from '@/utils/adminApi';

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({ page: '1', limit: '50' });
      if (res && res.success) setUsers(res.data || []);
      else setError(res?.message || 'Failed to load users');
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleBan = async (id: string) => {
    await adminApi.banUser(id);
    fetchUsers();
  };

  const handleUnban = async (id: string) => {
    await adminApi.unbanUser(id);
    fetchUsers();
  };

  const handleRoleChange = async (id: string, role: string) => {
    await adminApi.changeUserRole(id, role);
    fetchUsers();
  };

  return (
    <AuthGuard requireAdmin>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">User Management</h1>
        {error && <div className="text-red-600 mb-4">{error}</div>}
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">Name</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Role</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-b">
                    <td className="p-2">{u.name}</td>
                    <td className="p-2">{u.email}</td>
                    <td className="p-2">{u.role}</td>
                    <td className="p-2">{u.isSuspended ? 'Suspended' : 'Active'}</td>
                    <td className="p-2 space-x-2">
                      {u.isSuspended ? (
                        <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={() => handleUnban(u._id)}>Unban</button>
                      ) : (
                        <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={() => handleBan(u._id)}>Ban</button>
                      )}
                      <select defaultValue={u.role} onChange={(e) => handleRoleChange(u._id, e.target.value)} className="ml-2 border rounded p-1">
                        <option value="subscriber">subscriber</option>
                        <option value="creator">creator</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AuthGuard>
  );
};

export default AdminUsersPage;
