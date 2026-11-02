import React, { useState, useEffect, useMemo, useRef } from 'react';
import { VideoLesson, SubtitleLine } from '../../types';
import { 
  X, 
  Video, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  Upload, 
  BookOpen, 
  Zap, 
  Loader2,
  FileCode
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  parseSubtitleFile, 
  rechunkSubtitles, 
  segmentRawTextIntoSubtitles,
  sanitizeAndAlignCues
} from '../../utils/subtitleParser';
import { batchTranslateSubtitles } from '../../services/dictionaryService';

type ImportTab = 'youtube' | 'file' | 'text';

interface ImportVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportLesson: (lesson: VideoLesson) => void;
}

export const ImportVideoModal: React.FC<ImportVideoModalProps> = ({
  isOpen,
  onClose,
  onImportLesson
}) => {
  const [activeTab, setActiveTab] = useState<ImportTab>('youtube');
  const [url, setUrl] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [level, setLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1'>('B1');
  const [topic, setTopic] = useState<string>('Daily Life');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // YouTube 1-Click Captions
  const [autoFetchedSubtitles, setAutoFetchedSubtitles] = useState<SubtitleLine[]>([]);
  const [isFetchingCaptions, setIsFetchingCaptions] = useState<boolean>(false);
  const [captionFetchStatus, setCaptionFetchStatus] = useState<string>('');
  const [captionFetchError, setCaptionFetchError] = useState<string>('');
  const [enableRechunk, setEnableRechunk] = useState<boolean>(true);

  // File Upload State (.srt / .vtt)
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [fileSubtitles, setFileSubtitles] = useState<SubtitleLine[]>([]);
  const [filePairYtUrl, setFilePairYtUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Text Reader State
  const [rawArticleText, setRawArticleText] = useState<string>('');

  // Live YouTube Preview
  const [previewData, setPreviewData] = useState<{
    id: string;
    title: string;
    author: string;
    thumbnail: string;
  } | null>(null);

  const extractYouTubeId = (inputUrl: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = inputUrl.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  // Preview YouTube video on URL change
  useEffect(() => {
    setAutoFetchedSubtitles([]);
    setCaptionFetchError('');
    setCaptionFetchStatus('');
    const targetUrl = activeTab === 'file' && filePairYtUrl ? filePairYtUrl : url;
    const ytId = extractYouTubeId(targetUrl.trim());

    if (ytId) {
      setError('');
      const fetchInfo = async () => {
        try {
          const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${ytId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.title) {
              setPreviewData({
                id: ytId,
                title: data.title,
                author: data.author_name || 'YouTube Creator',
                thumbnail: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
              });
              return;
            }
          }
        } catch {
          // fallback
        }
        setPreviewData({
          id: ytId,
          title: `Video YouTube #${ytId}`,
          author: 'YouTube Creator',
          thumbnail: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
        });
      };
      fetchInfo();
    } else {
      if (activeTab === 'youtube') setPreviewData(null);
    }
  }, [url, filePairYtUrl, activeTab]);

  // 1-Click 4You Auto Caption Fetcher
  const handleAutoFetchCaptions = async () => {
    const ytId = extractYouTubeId(url.trim());
    if (!ytId) {
      setError('Vui lòng dán đường dẫn YouTube hợp lệ trước khi tải phụ đề.');
      return;
    }

    setIsFetchingCaptions(true);
    setCaptionFetchError('');
    setCaptionFetchStatus('Đang kết nối YouTube InnerTube API...');

    try {
      const res = await fetch(`/api/youtube-captions?v=${ytId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Không thể tải phụ đề từ YouTube cho video này.');
      }

      const data = await res.json();
      if (!data.subtitles || data.subtitles.length === 0) {
        throw new Error('Video này không có phụ đề tiếng Anh trên YouTube.');
      }

      if (data.title && !previewData?.title) {
        setPreviewData({
          id: ytId,
          title: data.title,
          author: data.author || 'YouTube Creator',
          thumbnail: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
        });
      }

      // Check if official Vietnamese subtitles were already paired by backend
      const missingTranslationSubs = data.subtitles.filter((s: any) => !s.translation || !s.translation.trim());
      let translations: string[] = [];
      
      if (missingTranslationSubs.length > 0) {
        setCaptionFetchStatus(`Đang dịch phụ đề song ngữ (0/${missingTranslationSubs.length} câu)...`);
        translations = await batchTranslateSubtitles(missingTranslationSubs, (done, total) => {
          setCaptionFetchStatus(`Đang dịch phụ đề song ngữ: ${done}/${total} câu...`);
        });
      }

      let mIdx = 0;
      let rawSubs: SubtitleLine[] = data.subtitles.map((s: any, idx: number) => ({
        id: `yt-${idx + 1}`,
        start: s.start,
        end: s.end,
        text: s.text,
        translation: s.translation && s.translation.trim() ? s.translation : (translations[mIdx++] || s.text)
      }));

      // Apply LingQ Re-Chunker if enabled
      if (enableRechunk) {
        rawSubs = rechunkSubtitles(rawSubs);
      }

      setAutoFetchedSubtitles(rawSubs);
      setIsFetchingCaptions(false);
      setCaptionFetchStatus('');
      confetti({ particleCount: 50, spread: 50 });
    } catch (err: any) {
      console.error('Caption fetch error', err);
      setIsFetchingCaptions(false);
      setCaptionFetchStatus('');
      setCaptionFetchError(err.message || 'Lỗi khi tải phụ đề tự động.');
    }
  };

  // Handle Drag & Drop / Upload of .srt or .vtt file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = parseSubtitleFile(content);
        if (parsed.length === 0) {
          setError('Không tìm thấy dòng phụ đề hợp lệ trong tệp SRT/VTT.');
          return;
        }

        const rechunked = rechunkSubtitles(parsed);
        setFileSubtitles(rechunked);
        if (!customTitle) {
          setCustomTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
        confetti({ particleCount: 40, spread: 50 });
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let finalYtId = 'RKK7wGAYP6k'; // Default background video if text or subtitle without video
    let finalTitle = '';
    let finalChannel = '4You LingQ Studio';
    let finalThumbnail = 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&fit=crop';
    let finalSubtitles: SubtitleLine[] = [];

    if (activeTab === 'youtube') {
      const ytId = extractYouTubeId(url.trim());
      if (!ytId) {
        setError('Vui lòng dán đường dẫn YouTube hợp lệ.');
        return;
      }
      finalYtId = ytId;
      finalTitle = previewData?.title || `YouTube Lesson: ${ytId}`;
      finalChannel = previewData?.author || 'YouTube Creator';
      finalThumbnail = previewData?.thumbnail || `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      finalSubtitles = autoFetchedSubtitles.length > 0 ? autoFetchedSubtitles : [
        {
          id: 'def-1',
          start: 0,
          end: 6.0,
          text: 'Welcome to this custom YouTube lesson! Tap any word to look up its definition.',
          translation: 'Chào mừng bạn đến với bài học này! Nhấn vào từ bất kỳ để tra nghĩa.'
        }
      ];
    } else if (activeTab === 'file') {
      if (fileSubtitles.length === 0) {
        setError('Vui lòng chọn tệp phụ đề .srt hoặc .vtt hợp lệ.');
        return;
      }
      if (filePairYtUrl) {
        const pairId = extractYouTubeId(filePairYtUrl);
        if (pairId) {
          finalYtId = pairId;
          finalThumbnail = `https://img.youtube.com/vi/${pairId}/hqdefault.jpg`;
        }
      }
      finalTitle = customTitle.trim() || uploadedFileName || 'Bài học Phụ đề Tùy chỉnh';
      finalSubtitles = fileSubtitles;
    } else if (activeTab === 'text') {
      if (!rawArticleText.trim()) {
        setError('Vui lòng dán nội dung bài đọc hoặc văn bản tiếng Anh.');
        return;
      }
      finalSubtitles = segmentRawTextIntoSubtitles(rawArticleText);
      finalTitle = customTitle.trim() || 'Bài Đọc Tiếng Anh (LingQ Reader)';
      finalChannel = 'Reader Mode';
    }

    setIsProcessing(true);

    const durationSec = finalSubtitles.length > 0 ? Math.ceil(finalSubtitles[finalSubtitles.length - 1].end) : 300;
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    const durationFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const newLesson: VideoLesson = {
      id: `lesson-custom-${Date.now()}`,
      isCustom: true,
      createdAt: Date.now(),
      youtubeId: finalYtId,
      title: finalTitle,
      channel: finalChannel,
      channelAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      thumbnail: finalThumbnail,
      level,
      topic,
      duration: durationFormatted,
      durationSec,
      views: '1',
      description: `Bài học tùy chỉnh được tạo bởi LingQ-Grade Importer với ${finalSubtitles.length} câu phụ đề song ngữ.`,
      subtitles: sanitizeAndAlignCues(finalSubtitles),
      subtitleOffset: 0,
      quizzes: [
        {
          id: `quiz-imp-1`,
          question: `What is the main purpose of this study session?`,
          options: [
            'To practice English listening, vocabulary, and shadowing',
            'To memorize grammar rules only',
            'To play background music',
            'Nothing at all'
          ],
          correctAnswer: 0,
          explanation: 'Interactive subtitles allow you to click any word for instant definitions and LingQ spaced repetition review.'
        }
      ]
    };

    setTimeout(() => {
      setIsProcessing(false);
      onImportLesson(newLesson);
      confetti({ particleCount: 70, spread: 60 });
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="size-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Nhập Bài Học Mới (Chuẩn LingQ)</h2>
            <p className="text-xs text-slate-500 font-medium">Hỗ trợ YouTube, Tệp phụ đề SRT/VTT và Bài đọc văn bản</p>
          </div>
        </div>

        {/* Source Tab Selector */}
        <div className="flex p-1.5 bg-slate-100 rounded-2xl gap-1 mb-5">
          <button
            type="button"
            onClick={() => { setActiveTab('youtube'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'youtube'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>YouTube URL</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('file'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'file'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Tệp SRT / VTT</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('text'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'text'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Bài Đọc / Sách</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* TAB 1: YOUTUBE */}
          {activeTab === 'youtube' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Đường dẫn YouTube URL
                </label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=... hoặc https://youtu.be/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                  required
                />
              </div>

              {/* YouTube Preview */}
              {previewData && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3 animate-fade-in">
                  <img
                    src={previewData.thumbnail}
                    alt="preview"
                    className="w-20 h-14 rounded-xl object-cover bg-black shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-black uppercase text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">
                      Đã nhận diện video
                    </span>
                    <p className="text-xs font-black text-slate-900 truncate mt-0.5">
                      {previewData.title}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Kênh: {previewData.author}
                    </p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                </div>
              )}

              {/* 1-Click Captions Box */}
              {extractYouTubeId(url.trim()) && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50 via-emerald-50 to-indigo-50 border border-teal-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        Tự Động Tải Phụ Đề Gốc YouTube
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-teal-600 text-white uppercase">
                          LingQ Re-Chunker
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Khớp âm thanh 100% từng mili-giây & tự động ghép câu ngữ pháp hoàn chỉnh
                      </p>
                    </div>
                  </div>

                  {autoFetchedSubtitles.length > 0 ? (
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-emerald-100/90 border border-emerald-300 text-xs font-bold text-emerald-900 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>Đã tải & chuẩn hóa {autoFetchedSubtitles.length} câu song ngữ!</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAutoFetchCaptions}
                          className="text-[11px] text-teal-800 underline hover:text-teal-950 shrink-0 font-extrabold ml-1"
                        >
                          Tải lại
                        </button>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/95 border border-slate-200 text-[11px] space-y-1 shadow-xs">
                        <p className="text-slate-800 font-bold truncate">
                          🎬 {autoFetchedSubtitles[0]?.text}
                        </p>
                        <p className="text-teal-700 italic truncate">
                          ➔ {autoFetchedSubtitles[0]?.translation}
                        </p>
                      </div>
                    </div>
                  ) : isFetchingCaptions ? (
                    <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 flex items-center gap-2.5 text-xs font-bold text-teal-800 animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin text-teal-600 shrink-0" />
                      <span>{captionFetchStatus || 'Đang kết nối trích xuất phụ đề YouTube...'}</span>
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        onClick={handleAutoFetchCaptions}
                        className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                      >
                        <Sparkles className="w-4 h-4" />
                        ⚡ Tự động tải phụ đề YouTube (Chuẩn 4You & LingQ)
                      </button>
                      {captionFetchError && (
                        <p className="text-xs text-rose-600 font-bold mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {captionFetchError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FILE UPLOAD (.SRT / .VTT) */}
          {activeTab === 'file' && (
            <div className="space-y-4 animate-fade-in">
              <input
                ref={fileInputRef}
                type="file"
                accept=".srt,.vtt,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-teal-300 rounded-3xl bg-teal-50/40 hover:bg-teal-50/70 cursor-pointer flex flex-col items-center justify-center text-center transition-all group"
              >
                <div className="size-12 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-black text-slate-800">
                  {uploadedFileName ? `Tệp đã chọn: ${uploadedFileName}` : 'Nhấn để chọn tệp .SRT hoặc .VTT'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Hỗ trợ phụ đề xuất từ Netflix, YouTube, Coursera, phim ảnh
                </p>
              </div>

              {fileSubtitles.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Đã phân tích & gom câu thông minh: {fileSubtitles.length} câu phụ đề</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs">
                    <p className="font-bold text-slate-800 truncate">Câu đầu: "{fileSubtitles[0]?.text}"</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Thời gian: {fileSubtitles[0]?.start}s - {fileSubtitles[0]?.end}s</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Tiêu đề bài học
                </label>
                <input
                  type="text"
                  placeholder="Nhập tiêu đề bài học..."
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium focus:bg-white focus:border-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Đường dẫn Video YouTube khớp tệp Sub (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=... (nếu có)"
                  value={filePairYtUrl}
                  onChange={(e) => setFilePairYtUrl(e.target.value)}
                  className="w-full h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium focus:bg-white focus:border-teal-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 3: TEXT ARTICLE / BOOK */}
          {activeTab === 'text' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Tiêu đề bài báo / Bài đọc
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: BBC News - How Language Shapes Our Thoughts..."
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium focus:bg-white focus:border-teal-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Nội dung bài viết (Tiếng Anh)
                </label>
                <textarea
                  rows={6}
                  placeholder="Dán bài báo, đoạn văn, hoặc sách tiếng Anh bạn muốn học tại đây..."
                  value={rawArticleText}
                  onChange={(e) => setRawArticleText(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium focus:bg-white focus:border-teal-500 outline-none resize-none leading-relaxed"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Hệ thống sẽ tự động bóc tách từng câu văn, tạo phòng đọc LingQ và phát âm giọng người thật.
                </p>
              </div>
            </div>
          )}

          {/* Common Fields: Level & Topic */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Trình độ (Level)
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none"
              >
                <option value="A1">A1 - Sơ cấp</option>
                <option value="A2">A2 - Cơ bản</option>
                <option value="B1">B1 - Trung cấp</option>
                <option value="B2">B2 - Nâng cao</option>
                <option value="C1">C1 - Cao cấp</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Chủ đề
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none"
              >
                <option value="Daily Life">Đời sống hằng ngày</option>
                <option value="Language Learning">Học ngôn ngữ</option>
                <option value="Science & Nature">Khoa học & Tự nhiên</option>
                <option value="Technology">Công nghệ</option>
                <option value="Culture & Society">Văn hóa & Xã hội</option>
                <option value="Comedy & Sitcoms">Hài kịch / Phim ảnh</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3.5 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-600/25 transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang khởi tạo bài học LingQ...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Bắt đầu Học Ngay ➔</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
