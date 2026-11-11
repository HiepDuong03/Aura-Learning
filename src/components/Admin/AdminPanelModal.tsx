import React, { useState, useEffect } from 'react';
import { AuthUser, UserRole } from '../../types';
import { authService } from '../../services/authService';
import { 
  X, 
  ShieldCheck, 
  Users, 
  Database, 
  BarChart3, 
  Crown, 
  User, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Search
} from 'lucide-react';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  createdAt: number;
  wordCount?: number;
}

interface AdminMetrics {
  totalUsers: number;
  totalWordsMaster: number;
  totalNotes: number;
  totalSRSCards: number;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const token = authService.getToken();

  const fetchAdminData = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const [usersRes, metricsRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/metrics', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (usersRes.status === 403) {
        setError('Bạn không có quyền quản trị viên (Admin).');
        setIsLoading(false);
        return;
      }

      if (usersRes.ok && metricsRes.ok) {
        const usersData = await usersRes.json();
        const metricsData = await metricsRes.json();
        setUsers(usersData.users || []);
        setMetrics(metricsData.metrics || null);
      } else {
        setError('Không thể tải dữ liệu quản trị từ máy chủ.');
      }
    } catch (e: any) {
      setError(e?.message || 'Lỗi kết nối API quản trị.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAdminData();
    }
  }, [isOpen]);

  const handleChangeRole = async (targetUserId: string, newRole: UserRole) => {
    if (!token) return;
    setUpdatingUserId(targetUserId);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/admin/users/role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId, newRole })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Cập nhật vai trò thất bại.');
      }

      setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, role: newRole } : u));
      setSuccessMsg(`Đã đổi quyền thành công cho người dùng.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (e: any) {
      setError(e.message || 'Lỗi khi cập nhật vai trò.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                Bảng Quản Trị Hệ Thống (RBAC Admin)
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Kiểm soát toàn vẹn dữ liệu quan hệ (3NF) và phân quyền người dùng
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAdminData}
              disabled={isLoading}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              type="button" 
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Metrics Overview Cards */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-teal-600" /> Người Dùng
              </span>
              <p className="text-xl font-black text-slate-800 mt-1">{metrics.totalUsers}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-sky-600" /> Từ Vựng Gốc (3NF)
              </span>
              <p className="text-xl font-black text-slate-800 mt-1">{metrics.totalWordsMaster}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-purple-600" /> Ghi Chú Cá Nhân
              </span>
              <p className="text-xl font-black text-slate-800 mt-1">{metrics.totalNotes}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-600" /> Thẻ SRS Cards
              </span>
              <p className="text-xl font-black text-slate-800 mt-1">{metrics.totalSRSCards}</p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm người dùng theo tên hoặc email..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 text-xs font-semibold focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
          />
        </div>

        {/* Users Table */}
        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0">
              <tr>
                <th className="p-3.5">Học Viên</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Vai Trò Hiện Tại</th>
                <th className="p-3.5 text-right">Hành Động Đổi Quyền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3.5 font-bold text-slate-800 flex items-center gap-2.5">
                    <img 
                      src={u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.email)}`} 
                      alt="" 
                      className="size-7 rounded-full bg-slate-100 border border-slate-200" 
                    />
                    <span>{u.name}</span>
                  </td>
                  <td className="p-3.5 text-slate-600 font-medium">{u.email}</td>
                  <td className="p-3.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                      u.role === 'admin' 
                        ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                        : u.role === 'pro'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {u.role === 'admin' ? '🛡️ Admin' : u.role === 'pro' ? '👑 Pro' : '🌱 User'}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <select
                      value={u.role || 'user'}
                      disabled={updatingUserId === u.id}
                      onChange={(e) => handleChangeRole(u.id, e.target.value as UserRole)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-bold text-xs text-slate-700 focus:border-teal-500 outline-none cursor-pointer"
                    >
                      <option value="user">User Thường</option>
                      <option value="pro">Nâng lên Pro 👑</option>
                      <option value="admin">Quản Trị Viên 🛡️</option>
                    </select>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                    Không tìm thấy người dùng nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
