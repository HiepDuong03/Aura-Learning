-- ==============================================================================
-- AURA LEARNING - PRODUCTION RELATIONAL DATABASE SCHEMA (3NF NORMALIZED)
-- Compatible with PostgreSQL 14+ and SQLite 3 (with Foreign Key pragma)
-- Version: 2.1 | Architecture: EdTech Spaced Repetition (Anki/LingQ)
-- ==============================================================================

-- 1. EXTENSIONS (PostgreSQL only - ignored in SQLite)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- TABLE 1: users (Hệ thống Định danh & Phân quyền RBAC)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,                         -- UUID hoặc usr_timestamp
    email VARCHAR(255) NOT NULL UNIQUE,                -- Email đăng nhập (Unique index)
    password_hash VARCHAR(255) NOT NULL,               -- PBKDF2/Argon2 salted hash
    salt VARCHAR(64) NOT NULL,                         -- Muối bảo mật ngẫu nhiên 32 bytes
    name VARCHAR(100) NOT NULL,                        -- Họ và tên hiển thị
    avatar_url TEXT,                                   -- Đường dẫn ảnh đại diện
    role VARCHAR(20) NOT NULL DEFAULT 'user',          -- RBAC Role: 'guest' | 'user' | 'pro' | 'admin'
    status VARCHAR(20) NOT NULL DEFAULT 'active',      -- 'active' | 'suspended' | 'pending'
    created_at BIGINT NOT NULL,                        -- Epoch timestamp (ms)
    updated_at BIGINT NOT NULL                         -- Epoch timestamp (ms)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ==============================================================================
-- TABLE 2: user_profiles (Hồ sơ học viên Anki độc lập per user)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id VARCHAR(36) PRIMARY KEY,                         -- UUID hồ sơ học viên
    user_id VARCHAR(36) NOT NULL,                      -- Khóa ngoại liên kết với bảng users
    name VARCHAR(100) NOT NULL,                        -- Tên hồ sơ (e.g. "IELTS Prep", "Giao tiếp")
    avatar_url TEXT,                                   -- Avatar hồ sơ
    target_language VARCHAR(10) DEFAULT 'en',          -- Ngôn ngữ đích
    native_language VARCHAR(10) DEFAULT 'vi',          -- Ngôn ngữ mẹ đẻ
    daily_goal_cards INTEGER DEFAULT 20,               -- Mục tiêu học từ vựng mỗi ngày
    streak_days INTEGER DEFAULT 0,                     -- Chuỗi ngày học liên tiếp
    last_active_at BIGINT NOT NULL,                    -- Lần học gần nhất
    created_at BIGINT NOT NULL,                        -- Thời điểm tạo hồ sơ
    CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON user_profiles(user_id);

-- ==============================================================================
-- TABLE 3: words_master (Từ điển chuẩn hóa dùng chung toàn hệ thống - Global Dictionary)
-- Tránh việc 10,000 học viên lưu từ "serendipity" lại nhân bản 10,000 định nghĩa giống nhau
-- ==============================================================================
CREATE TABLE IF NOT EXISTS words_master (
    id VARCHAR(36) PRIMARY KEY,                         -- ID từ vựng từ điển
    lemma VARCHAR(100) NOT NULL UNIQUE,                -- Từ vựng gốc chữ thường (e.g. "serendipity")
    phonetic VARCHAR(100),                             -- Phiên âm IPA (e.g. "/ˌser.ənˈdɪp.ə.ti/")
    part_of_speech VARCHAR(50),                        -- Từ loại (noun, verb, adjective, ...)
    default_translation_vi TEXT NOT NULL,              -- Bản dịch tiếng Việt chuẩn
    definition_en TEXT,                                -- Định nghĩa tiếng Anh chuẩn Oxford/Cambridge
    cefr_level VARCHAR(5) DEFAULT 'B1',                -- Khung CEFR: A1, A2, B1, B2, C1, C2
    frequency_rank INTEGER,                            -- Thứ hạng tần suất xuất hiện (1 - 50,000)
    created_at BIGINT NOT NULL                         -- Thời điểm lập mục từ điển
);

CREATE INDEX IF NOT EXISTS idx_words_lemma ON words_master(lemma);
CREATE INDEX IF NOT EXISTS idx_words_cefr ON words_master(cefr_level);

-- ==============================================================================
-- TABLE 4: user_vocabulary_notes (Ngữ cảnh lưu từ thực tế của người học trong bài học)
-- Quan hệ: 1 User + 1 Video Sentence -> 1 Note
-- ==============================================================================
CREATE TABLE IF NOT EXISTS user_vocabulary_notes (
    id VARCHAR(36) PRIMARY KEY,                         -- ID ghi chú từ vựng
    user_id VARCHAR(36) NOT NULL,                      -- Người sở hữu từ
    profile_id VARCHAR(36) NOT NULL,                   -- Profile học viên
    word_id VARCHAR(36) NOT NULL,                      -- Tham chiếu từ điển words_master(id)
    custom_translation TEXT,                           -- Bản dịch cá nhân hóa người dùng tự sửa
    context_sentence TEXT,                             -- Câu phụ đề ngữ cảnh video nơi từ xuất hiện
    context_translation TEXT,                          -- Dịch nghĩa câu phụ đề ngữ cảnh
    source_type VARCHAR(20) DEFAULT 'youtube',         -- Nguồn: 'youtube' | 'custom' | 'shorts'
    source_lesson_id VARCHAR(100),                     -- ID bài học (e.g. 'lesson-1')
    source_video_title VARCHAR(255),                   -- Tiêu đề video bài học
    source_timestamp_sec FLOAT,                        -- Mốc thời gian xuất hiện trong video (giây)
    created_at BIGINT NOT NULL,                        -- Thời điểm bấm Lưu từ
    updated_at BIGINT NOT NULL,                        -- Thời điểm sửa ngữ cảnh
    CONSTRAINT fk_note_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_note_profile FOREIGN KEY (profile_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_note_word FOREIGN KEY (word_id) REFERENCES words_master(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_notes_user ON user_vocabulary_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_profile ON user_vocabulary_notes(profile_id);
CREATE INDEX IF NOT EXISTS idx_notes_word ON user_vocabulary_notes(word_id);

-- ==============================================================================
-- TABLE 5: srs_cards (Thẻ Flashcard lặp lại ngắt quãng Anki SM-2)
-- Tách riêng tiến độ ôn tập (SRS Parameters) ra khỏi nội dung ngữ nghĩa (Note)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS srs_cards (
    id VARCHAR(36) PRIMARY KEY,                         -- ID thẻ học Anki
    note_id VARCHAR(36) NOT NULL,                      -- Khóa ngoại liên kết note nội dung
    user_id VARCHAR(36) NOT NULL,                      -- Khóa ngoại người sở hữu
    profile_id VARCHAR(36) NOT NULL,                   -- Khóa ngoại profile
    card_type VARCHAR(20) NOT NULL DEFAULT 'recognition', -- 'recognition' | 'dictation' | 'shadowing'
    state VARCHAR(20) NOT NULL DEFAULT 'new',          -- 'new' | 'learning' | 'review' | 'relearning'
    ease_factor FLOAT NOT NULL DEFAULT 2.50,           -- Hệ số dễ Anki SM-2 (2.50 = 250%, min 1.30)
    interval_days INTEGER NOT NULL DEFAULT 0,          -- Khoảng cách ngày đến lần ôn tiếp theo
    repetitions INTEGER NOT NULL DEFAULT 0,            -- Số lần nhớ đúng liên tiếp
    lapses INTEGER NOT NULL DEFAULT 0,                 -- Số lần quên (bấm Again)
    due_at BIGINT NOT NULL,                            -- Thời điểm đến hạn ôn tiếp theo (timestamp ms)
    last_reviewed_at BIGINT,                           -- Lần ôn tập gần nhất
    usn INTEGER NOT NULL DEFAULT 1,                    -- Update Sequence Number cho Sync Protocol
    created_at BIGINT NOT NULL,                        -- Thời điểm sinh thẻ
    CONSTRAINT fk_card_note FOREIGN KEY (note_id) REFERENCES user_vocabulary_notes(id) ON DELETE CASCADE,
    CONSTRAINT fk_card_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_card_profile FOREIGN KEY (profile_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cards_user_due ON srs_cards(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_cards_profile_due ON srs_cards(profile_id, due_at);
CREATE INDEX IF NOT EXISTS idx_cards_state ON srs_cards(state);

-- ==============================================================================
-- TABLE 6: srs_review_logs (Nhật ký ôn tập bất biến - Audit Trail tuân thủ BR-13)
-- Ghi nhận từng lần bấm Again/Hard/Good/Easy để vẽ biểu đồ và phân tích trí nhớ
-- ==============================================================================
CREATE TABLE IF NOT EXISTS srs_review_logs (
    id VARCHAR(36) PRIMARY KEY,                         -- ID log ôn tập
    card_id VARCHAR(36) NOT NULL,                      -- Khóa ngoại thẻ đã ôn
    user_id VARCHAR(36) NOT NULL,                      -- Khóa ngoại người ôn
    rating SMALLINT NOT NULL,                          -- 1: Again, 2: Hard, 3: Good, 4: Easy
    scheduled_interval INTEGER NOT NULL,               -- Khoảng cách mới tính ra (ngày)
    previous_interval INTEGER NOT NULL,                -- Khoảng cách trước đó (ngày)
    ease_factor FLOAT NOT NULL,                        -- Hệ số dễ sau khi đánh giá
    time_spent_ms INTEGER DEFAULT 0,                   -- Thời gian suy nghĩ trước khi lật thẻ (ms)
    reviewed_at BIGINT NOT NULL,                       -- Thời điểm đánh giá thẻ
    CONSTRAINT fk_log_card FOREIGN KEY (card_id) REFERENCES srs_cards(id) ON DELETE CASCADE,
    CONSTRAINT fk_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_logs_user_reviewed ON srs_review_logs(user_id, reviewed_at);
CREATE INDEX IF NOT EXISTS idx_logs_card ON srs_review_logs(card_id);

-- ==============================================================================
-- TABLE 7: user_lingq_matrix (Ma trận 5 trạng thái màu sắc LingQ theo người dùng)
-- 0: New (Xanh dương), 1: L1 (Vàng đậm), 2: L2 (Vàng nhạt), 3: L3 (Xanh lá), 4: Known (Trắng), 5: Ignored
-- ==============================================================================
CREATE TABLE IF NOT EXISTS user_lingq_matrix (
    id VARCHAR(36) PRIMARY KEY,                         -- ID trạng thái LingQ
    user_id VARCHAR(36) NOT NULL,                      -- Người sở hữu
    word VARCHAR(100) NOT NULL,                        -- Từ vựng (viết thường)
    status SMALLINT NOT NULL DEFAULT 0,                -- Trạng thái 0, 1, 2, 3, 4, 5
    updated_at BIGINT NOT NULL,                        -- Lần cập nhật màu sắc gần nhất
    CONSTRAINT fk_lingq_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_word UNIQUE (user_id, word)     -- 1 user chỉ có 1 trạng thái cho 1 từ
);

CREATE INDEX IF NOT EXISTS idx_lingq_user_status ON user_lingq_matrix(user_id, status);

-- ==============================================================================
-- TABLE 8: user_custom_lessons (Bài học YouTube tự nhập lưu trữ lâu dài)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS user_custom_lessons (
    id VARCHAR(100) PRIMARY KEY,                        -- ID bài học (lesson-custom-...)
    user_id VARCHAR(36) NOT NULL,                      -- Người import
    youtube_id VARCHAR(50) NOT NULL,                   -- YouTube Video ID
    title VARCHAR(255) NOT NULL,                       -- Tiêu đề video
    channel VARCHAR(100),                              -- Tên kênh
    level VARCHAR(10) DEFAULT 'B1',                    -- CEFR Level
    duration VARCHAR(20),                              -- Thời lượng định dạng MM:SS
    duration_sec INTEGER DEFAULT 0,                    -- Thời lượng tính theo giây
    subtitles_json TEXT NOT NULL,                      -- Chuỗi JSON phụ đề song ngữ đầy đủ
    created_at BIGINT NOT NULL,                        -- Thời điểm import
    CONSTRAINT fk_lesson_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lessons_user ON user_custom_lessons(user_id);
