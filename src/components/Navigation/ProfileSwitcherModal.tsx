import React, { useState } from 'react';
import { AnkiUserProfile, AuthUser } from '../../types';
import { useNotify } from '../Common/ToastProvider';
import {
  Users,
  Plus,
  Check,
  X,
  Trash2,
  Cloud,
  Flame,
  LogIn
} from 'lucide-react';

interface ProfileSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: AnkiUserProfile[];
  activeProfileId: string;
  currentUser?: AuthUser | null;
  streakDays?: number;
  onSwitchProfile: (profileId: string) => void;
  onCreateProfile: (name: string) => void;
  onDeleteProfile: (profileId: string) => void;
  onOpenAuth?: () => void;
}

export const ProfileSwitcherModal: React.FC<ProfileSwitcherModalProps> = ({
  isOpen,
  onClose,
  profiles,
  activeProfileId,
  currentUser = null,
  streakDays,
  onSwitchProfile,
  onCreateProfile,
  onDeleteProfile,
  onOpenAuth
}) => {
  const { confirmDialog, toast } = useNotify();
  const [isCreating, setIsCreating] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    onCreateProfile(newProfileName.trim());
    setNewProfileName('');
    setIsCreating(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-800">
                Hồ Sơ Bộ Thẻ Học Tập (Anki Profiles)
              </h2>
              <p className="text-xs text-slate-400">
                Tách riêng kho từ vựng & lịch ôn tập cho từng mục tiêu học
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cloud Sync Account Status Banner (Real JWT Auth, no fake local email) */}
        {currentUser ? (
          <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200/80 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Cloud className="w-4 h-4 text-teal-600 shrink-0" />
              <div className="min-w-0">
                <p className="font-black text-teal-900">Đã đồng bộ Cloud tự động</p>
                <p className="text-[11px] text-teal-700 truncate">{currentUser.email}</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-white text-teal-700 border border-teal-200 text-[10px] font-black shrink-0 uppercase">
              {currentUser.role}
            </span>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <p className="font-black text-amber-900">Chưa đăng nhập tài khoản Cloud</p>
              <p className="text-[11px] text-amber-800/80">
                Đăng nhập để đồng bộ từ vựng & tiến độ trên mọi thiết bị.
              </p>
            </div>
            {onOpenAuth && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs flex items-center gap-1 shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" /> Đăng Nhập
              </button>
            )}
          </div>
        )}

        {/* Profiles List */}
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {profiles.map((profile) => {
            const isActive = profile.id === activeProfileId;
            const displayStreak = isActive && typeof streakDays === 'number' ? streakDays : profile.streakDays;

            return (
              <div
                key={profile.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isActive
                    ? 'bg-teal-50/70 border-teal-500 shadow-sm ring-2 ring-teal-400/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSwitchProfile(profile.id)}
                  className="flex items-center gap-3 flex-1 text-left min-w-0"
                >
                  <img
                    src={isActive && currentUser?.avatar ? currentUser.avatar : profile.avatar}
                    alt={profile.name}
                    className="size-11 rounded-2xl object-cover ring-2 ring-slate-100 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900 truncate">
                        {isActive && currentUser?.name && profile.id === 'default'
                          ? `${currentUser.name} (Chính)`
                          : profile.name}
                      </h4>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-600 text-white flex items-center gap-0.5 shadow-xs shrink-0">
                          <Check className="w-3 h-3" /> Đang dùng
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold mt-0.5">
                      <span className="flex items-center gap-0.5 text-orange-600 font-bold">
                        <Flame className="w-3.5 h-3.5 fill-current" /> {displayStreak} ngày
                      </span>
                      <span>•</span>
                      <span className={currentUser ? 'text-teal-700 font-bold truncate' : 'text-slate-400'}>
                        {currentUser ? 'Đồng bộ theo tài khoản' : 'Lưu cục bộ trên máy'}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Delete Action */}
                {profiles.length > 1 && (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirmDialog({
                        title: 'Xóa hồ sơ học tập',
                        message: `Bạn có chắc chắn muốn xoá hồ sơ "${profile.name}"?`,
                        confirmLabel: 'Xóa hồ sơ',
                        destructive: true
                      });
                      if (ok) {
                        onDeleteProfile(profile.id);
                        toast.success(`Đã xóa hồ sơ "${profile.name}".`);
                      }
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                    title="Xoá hồ sơ này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Create Profile Section */}
        {isCreating ? (
          <form onSubmit={handleCreate} className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 space-y-2.5 animate-fade-in">
            <span className="text-xs font-black text-teal-900 block">
              Tạo hồ sơ học tập mới:
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Ví dụ: IELTS Speaking, Giao tiếp công sở..."
                autoFocus
                className="flex-1 p-2.5 rounded-xl border border-teal-300 text-xs focus:ring-2 focus:ring-teal-400 outline-none bg-white"
              />
              <button
                type="submit"
                disabled={!newProfileName.trim()}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs disabled:opacity-50"
              >
                Tạo
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-2.5 rounded-xl bg-white text-slate-500 hover:bg-slate-100 font-bold text-xs border border-slate-200"
              >
                Hủy
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 text-slate-600 hover:text-teal-700 text-xs font-black transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Thêm hồ sơ học tập mới
          </button>
        )}
      </div>
    </div>
  );
};
