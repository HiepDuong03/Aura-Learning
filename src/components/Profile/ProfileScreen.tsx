import React, { useState, useEffect, useRef } from 'react';
import { SavedWord, AnkiCollectionStats } from '../../types';
import { 
  Flame, 
  BookOpen, 
  Trophy, 
  ShieldCheck, 
  Settings, 
  RotateCcw, 
  Sparkles, 
  Calendar,
  Layers,
  Sprout,
  Download,
  Upload,
  Database,
  FileText,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { ankiDb } from '../../services/ankiDatabase';

interface ProfileScreenProps {
  savedWords: SavedWord[];
  streakDays: number;
  onResetProgress?: () => void;
  onImportWords?: (words: SavedWord[]) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  savedWords,
  streakDays,
  onResetProgress,
  onImportWords
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);
  const [ankiStats, setAnkiStats] = useState<AnkiCollectionStats | null>(null);
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const masteredWords = savedWords.filter(w => (w.interval ?? 0) >= 21).length;
  const learningWords = savedWords.filter(w => (w.interval ?? 0) < 3).length;
  const reviewingWords = savedWords.length - masteredWords - learningWords;

  const totalReviews = savedWords.reduce((acc, curr) => acc + (curr.repetitions || 0), 0);
  const xpPoints = savedWords.length * 25 + totalReviews * 10 + streakDays * 50;

  // Load Anki statistics from revlog
  useEffect(() => {
    let isMounted = true;
    ankiDb.getStats(savedWords).then(stats => {
      if (isMounted) setAnkiStats(stats);
    }).catch(console.warn);

    return () => {
      isMounted = false;
    };
  }, [savedWords]);

  // Export to Anki Desktop TSV format
  const handleExportAnkiTxt = () => {
    if (savedWords.length === 0) {
      alert('Chưa có từ vựng nào để xuất tệp Anki.');
      return;
    }
    const txtContent = ankiDb.exportToAnkiTxt(savedWords);
    const filename = `4you_anki_deck_${new Date().toISOString().slice(0, 10)}.txt`;
    ankiDb.downloadFile(filename, txtContent, 'text/plain;charset=utf-8');
  };

  // Export complete JSON backup
  const handleExportJson = async () => {
    if (savedWords.length === 0) {
      alert('Chưa có dữ liệu nào để sao lưu.');
      return;
    }
    const jsonContent = await ankiDb.exportFullBackupJSON(savedWords);
    const filename = `4you_backup_collection_${new Date().toISOString().slice(0, 10)}.json`;
    ankiDb.downloadFile(filename, jsonContent, 'application/json;charset=utf-8');
  };

  // Import JSON backup
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const result = await ankiDb.importFullBackupJSON(text);
        if (onImportWords) {
          onImportWords(result.words);
        }
        setImportNotification(`Đã khôi phục thành công ${result.importedCount} thẻ từ vựng!`);
        setTimeout(() => setImportNotification(null), 4000);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Lỗi khi nhập tệp sao lưu.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in pb-16">
      {/* User Header Profile Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10 text-center sm:text-left">
          <div className="size-20 sm:size-24 rounded-3xl bg-white text-teal-700 font-black text-3xl flex items-center justify-center shadow-lg ring-4 ring-white/20 shrink-0">
            4U
          </div>
          
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl font-black tracking-tight">Học Viên Chăm Chỉ</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400 text-amber-950 flex items-center gap-1 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 fill-current" /> Anki Pro Member
              </span>
            </div>
            <p className="text-xs sm:text-sm text-teal-100 font-medium">
              Cơ sở dữ liệu Local-First IndexedDB & Thuật toán lặp lại ngắt quãng (SM-2)
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-2 pt-2 text-xs font-bold text-teal-200">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Thành viên từ tháng 10/2026
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5" /> Bản quyền trọn đời
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {importNotification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{importNotification}</span>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm text-center">
          <div className="size-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-2">
            <Flame className="w-5 h-5 fill-current" />
          </div>
          <p className="text-2xl font-black text-slate-800">{streakDays}</p>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">Ngày chuỗi liên tục</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm text-center">
          <div className="size-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-2">
            <BookOpen className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-slate-800">{savedWords.length}</p>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">Từ vựng đã lưu</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm text-center">
          <div className="size-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-2">
            <Trophy className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-slate-800">{xpPoints.toLocaleString()}</p>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">Điểm kinh nghiệm XP</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm text-center">
          <div className="size-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
            <Layers className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-slate-800">{totalReviews}</p>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">Lượt lặp Anki</p>
        </div>
      </div>

      {/* Anki Retention & Learning Health Engine */}
      {ankiStats && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-50 via-indigo-50 to-sky-50 border border-purple-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-purple-200/60">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-600 text-white shadow-xs">
                <Activity className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Chỉ số sức khỏe trí nhớ Anki (Memory Retention Health)
                </h3>
                <p className="text-[11px] text-slate-600 font-medium">
                  Đo lường trực tiếp từ nhật ký ôn tập revlog của thuật toán SM-2
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-purple-200/80 text-purple-900">
              Retention: {ankiStats.retentionRate}%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-white/80 shadow-xs">
              <span className="block text-[11px] font-bold text-slate-500">Tỉ lệ nhớ thành công</span>
              <span className="text-xl font-black text-emerald-600">{ankiStats.retentionRate}%</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Mục tiêu: 80 - 90%</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/80 shadow-xs">
              <span className="block text-[11px] font-bold text-slate-500">Độ dễ Ease Factor TB</span>
              <span className="text-xl font-black text-indigo-600">{ankiStats.averageEaseFactor}</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Chuẩn ban đầu: 2.50</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/80 shadow-xs">
              <span className="block text-[11px] font-bold text-slate-500">Thẻ đến hạn hôm nay</span>
              <span className="text-xl font-black text-amber-600">{ankiStats.dueTodayCount}</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Cần ôn trong ngày</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/80 shadow-xs">
              <span className="block text-[11px] font-bold text-slate-500">Thẻ cổ thụ (Mature)</span>
              <span className="text-xl font-black text-teal-600">{ankiStats.matureCards}</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Interval ≥ 21 ngày</span>
            </div>
          </div>
        </div>
      )}

      {/* Vocabulary Mastery Breakdown */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <Sprout className="w-4 h-4 text-teal-600" />
          Phân bố độ bền trí nhớ từ vựng (SM-2 Algorithm)
        </h3>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-emerald-700">Đã làm chủ (Cổ thụ - Interval ≥ 21 ngày)</span>
              <span className="text-slate-600">{masteredWords} từ ({savedWords.length > 0 ? Math.round((masteredWords / savedWords.length) * 100) : 0}%)</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                style={{ width: `${savedWords.length > 0 ? (masteredWords / savedWords.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-amber-700">Đang củng cố (Đơm hoa - 3 ≤ Interval &lt; 21 ngày)</span>
              <span className="text-slate-600">{Math.max(0, reviewingWords)} từ</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div 
                className="h-full bg-amber-400 rounded-full transition-all duration-500" 
                style={{ width: `${savedWords.length > 0 ? (Math.max(0, reviewingWords) / savedWords.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-lime-700">Mới học (Nảy mầm - Interval &lt; 3 ngày)</span>
              <span className="text-slate-600">{learningWords} từ</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div 
                className="h-full bg-lime-400 rounded-full transition-all duration-500" 
                style={{ width: `${savedWords.length > 0 ? (learningWords / savedWords.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ANKI & DATA PORTABILITY (LOCAL-FIRST BACKUP & SYNC) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-600" />
            Bảo toàn dữ liệu & Đồng bộ Anki (Data Portability)
          </h3>
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Lưu trữ IndexedDB 0đ
          </span>
        </div>

        <p className="text-xs text-slate-500">
          Dữ liệu của bạn được lưu an toàn trong cơ sở dữ liệu IndexedDB của trình duyệt. Bạn có thể xuất tệp để nhập trực tiếp vào <strong>Anki Desktop</strong> hoặc sao lưu chuyển sang thiết bị khác.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Export to Anki TXT */}
          <button
            type="button"
            onClick={handleExportAnkiTxt}
            className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 transition-all text-left space-y-1 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-teal-600" /> Xuất tệp Anki (.txt)
              </span>
              <Download className="w-3.5 h-3.5 text-teal-500 group-hover:translate-y-0.5 transition-transform" />
            </div>
            <p className="text-[10px] text-teal-700">
              Nhập 1 click vào Anki Desktop / AnkiMobile trên PC và điện thoại.
            </p>
          </button>

          {/* Export full JSON backup */}
          <button
            type="button"
            onClick={handleExportJson}
            className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-800 hover:bg-indigo-100 transition-all text-left space-y-1 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black flex items-center gap-1.5">
                <Database className="w-4 h-4 text-indigo-600" /> Sao lưu JSON
              </span>
              <Download className="w-3.5 h-3.5 text-indigo-500 group-hover:translate-y-0.5 transition-transform" />
            </div>
            <p className="text-[10px] text-indigo-700">
              Xuất toàn bộ thẻ và lịch sử ôn tập revlog để lưu trữ an toàn.
            </p>
          </button>

          {/* Import JSON backup */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition-all text-left space-y-1 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-amber-600" /> Khôi phục dữ liệu
              </span>
              <Upload className="w-3.5 h-3.5 text-amber-500 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <p className="text-[10px] text-amber-700">
              Tải lên file JSON để hợp nhất từ vựng từ máy khác sang máy này.
            </p>
          </button>
        </div>

        {/* Hidden file input for import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* App Preferences */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <Settings className="w-4 h-4 text-slate-600" />
          Cài đặt & Trải nghiệm học
        </h3>

        <div className="divide-y divide-slate-100">
          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">Âm thanh & Hiệu ứng phát âm</p>
              <p className="text-xs text-slate-400">Tự động phát giọng đọc chuẩn AI khi tra từ</p>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${soundEnabled ? 'bg-teal-600' : 'bg-slate-200'}`}
            >
              <div className={`size-5 rounded-full bg-white shadow-md transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">Tự động phát câu thoại AI</p>
              <p className="text-xs text-slate-400">Phát âm lời thoại nhân vật khi luyện phản xạ nói</p>
            </div>
            <button
              onClick={() => setAutoPlayAudio(!autoPlayAudio)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${autoPlayAudio ? 'bg-teal-600' : 'bg-slate-200'}`}
            >
              <div className={`size-5 rounded-full bg-white shadow-md transition-transform ${autoPlayAudio ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {onResetProgress && (
          <div className="pt-2">
            <button
              onClick={() => {
                if (window.confirm('Bạn có chắc chắn muốn đặt lại toàn bộ tiến độ học và từ vựng?')) {
                  onResetProgress();
                }
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 p-2 rounded-xl hover:bg-rose-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Đặt lại dữ liệu học tập về mặc định
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
