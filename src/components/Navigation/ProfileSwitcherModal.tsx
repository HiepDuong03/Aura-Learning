import React, { useState } from 'react';
import { AnkiUserProfile } from '../../types';
import { 
  Users, 
  Plus, 
  Check, 
  X, 
  Trash2, 
  Cloud, 
  Sparkles,
  ShieldCheck,
  Flame,
  BookOpen
} from 'lucide-react';

interface ProfileSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: AnkiUserProfile[];
  activeProfileId: string;
  onSwitchProfile: (profileId: string) => void;
  onCreateProfile: (name: string) => void;
  onDeleteProfile: (profileId: string) => void;
  onUpdateAccountEmail: (profileId: string, email: string) => void;
}

export const ProfileSwitcherModal: React.FC<ProfileSwitcherModalProps> = ({
  isOpen,
  onClose,
  profiles,
  activeProfileId,
  onSwitchProfile,
  onCreateProfile,
  onDeleteProfile,
  onUpdateAccountEmail
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [editingEmailProfileId, setEditingEmailProfileId] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    onCreateProfile(newProfileName.trim());
    setNewProfileName('');
    setIsCreating(false);
  };

  const handleSaveEmail = (profileId: string) => {
    if (!emailInput.trim()) return;
    onUpdateAccountEmail(profileId, emailInput.trim());
    setEditingEmailProfileId(null);
    setEmailInput('');
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
                Chuyển Đổi Hồ Sơ Người Học (Anki Profiles)
              </h2>
              <p className="text-xs text-slate-400">
                Mỗi hồ sơ có kho từ vựng và thuật toán ôn tập độc lập 100%
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profiles List */}
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {profiles.map((profile) => {
            const isActive = profile.id === activeProfileId;
            const hasEmail = Boolean(profile.cloudAccount?.email);

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
                    src={profile.avatar}
                    alt={profile.name}
                    className="size-11 rounded-2xl object-cover ring-2 ring-slate-100 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900 truncate">
                        {profile.name}
                      </h4>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-600 text-white flex items-center gap-0.5 shadow-xs shrink-0">
                          <Check className="w-3 h-3" /> Đang dùng
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold mt-0.5">
                      <span className="flex items-center gap-0.5 text-orange-600 font-bold">
                        <Flame className="w-3.5 h-3.5 fill-current" /> {profile.streakDays} ngày
                      </span>
                      <span>•</span>
                      {hasEmail ? (
                        <span className="text-teal-700 font-bold flex items-center gap-1 truncate">
                          <Cloud className="w-3.5 h-3.5" /> {profile.cloudAccount?.email}
                        </span>
                      ) : (
                        <span className="text-slate-400">Chưa liên kết email</span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEmailProfileId(editingEmailProfileId === profile.id ? null : profile.id);
                      setEmailInput(profile.cloudAccount?.email || '');
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-slate-100 transition-colors"
                    title="Liên kết Email tài khoản đồng bộ"
                  >
                    <Cloud className="w-4 h-4" />
                  </button>

                  {profiles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Bạn có chắc chắn muốn xoá hồ sơ "${profile.name}"?`)) {
                          onDeleteProfile(profile.id);
                        }
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Xoá hồ sơ này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Link Email Expandable Input */}
        {editingEmailProfileId && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 animate-fade-in">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-teal-600" />
              Liên kết Email đồng bộ tài khoản (Anki Cloud Sync):
            </span>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Nhập email của bạn (ví dụ: user@gmail.com)"
                className="flex-1 p-2.5 rounded-xl border border-slate-200 text-xs focus:border-teal-500 outline-none"
              />
              <button
                type="button"
                onClick={() => handleSaveEmail(editingEmailProfileId)}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
              >
                Lưu
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              * Theo chuẩn Anki: Mỗi hồ sơ trên máy tính/điện thoại liên kết với 1 tài khoản email duy nhất để không bị lẫn thẻ khi đồng bộ.
            </p>
          </div>
        )}

        {/* Create Profile Section */}
        {isCreating ? (
          <form onSubmit={handleCreate} className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 space-y-2.5 animate-fade-in">
            <span className="text-xs font-black text-teal-900 block">
              Tạo hồ sơ người học mới:
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Tên hồ sơ (ví dụ: Hiệp, Mai, Học tiếng Anh...)"
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
            <Plus className="w-4 h-4" /> Thêm hồ sơ người học mới
          </button>
        )}
      </div>
    </div>
  );
};
