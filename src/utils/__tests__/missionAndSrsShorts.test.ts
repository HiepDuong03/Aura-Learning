import { describe, it, expect } from 'vitest';
import { buildMissionRoleplayPersona } from '../missionRoleplayBuilder';
import { buildFullSrsShortsFeed } from '../srsShortsBuilder';
import { ActivePracticeMission, SavedWord } from '../../types';
import { youglishEngine } from '../../services/youglishEngine';

function makeSavedWord(id: string, word: string, translation: string, extra?: Partial<SavedWord>): SavedWord {
  const now = Date.now();
  return {
    id,
    word,
    phonetic: '',
    partOfSpeech: 'n. phr.',
    translation,
    definitionEn: `Definition of ${word}`,
    exampleEn: `In modern society, ${word} plays an important role.`,
    contextSentence: `In modern society, ${word} plays an important role.`,
    savedAt: now,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    lapses: 0,
    state: 'new',
    dueAt: now - 1000,
    ...extra
  };
}

describe('buildMissionRoleplayPersona (Bug #1 fix)', () => {
  it('builds a dedicated topic persona incorporating the lesson vocabulary instead of Barista default', () => {
    const mission: ActivePracticeMission = {
      id: 'speak-edu-l01-123',
      mode: 'roleplay',
      sourceTitle: 'Education & Learning · Bài 01',
      topicName: 'Education & Learning',
      cefr: 'B2',
      targetWords: [
        { word: 'early childhood education', meaningVi: 'giáo dục mầm non' },
        { word: 'compulsory education', meaningVi: 'giáo dục bắt buộc' },
        { word: 'higher education', meaningVi: 'giáo dục đại học' },
        { word: 'vocational training', meaningVi: 'đào tạo nghề' },
        { word: 'state school', meaningVi: 'trường công lập' }
      ],
      createdAt: Date.now()
    };

    const persona = buildMissionRoleplayPersona(mission);
    expect(persona.id).toContain('mission-vocab-');
    expect(persona.name).not.toContain('Emma');
    expect(persona.role).toContain('Education & Learning');
    expect(persona.mission).toContain('early childhood education');
    expect(persona.mission).toContain('vocational training');
    expect(persona.initialMessage).toContain('early childhood education');
    expect(persona.initialMessage).toContain('compulsory education');
  });

  it('builds a dedicated grammar mission persona when grammarFocus is present', () => {
    const mission: ActivePracticeMission = {
      id: 'speak-grammar-1',
      mode: 'roleplay',
      sourceTitle: 'Mixed Conditionals',
      topicName: 'Grammar B2',
      cefr: 'B2',
      targetWords: [],
      grammarFocus: { title: 'Mixed Conditionals', formula: 'If + S + had V3, S + would + V' },
      createdAt: Date.now()
    };

    const persona = buildMissionRoleplayPersona(mission);
    expect(persona.id).toContain('mission-grammar-');
    expect(persona.mission).toContain('Mixed Conditionals');
    expect(persona.initialMessage).toContain('Mixed Conditionals');
  });
});

describe('buildFullSrsShortsFeed (Bug #2 fix: 100% vault coverage)', () => {
  it('returns all 11 review items for an 11-word vault mixing corpus, source video, and IELTS phrases', () => {
    const vault11: SavedWord[] = [
      makeSavedWord('w1', 'complicated', 'phức tạp'),
      makeSavedWord('w2', 'early childhood education', 'giáo dục mầm non'),
      makeSavedWord('w3', 'compulsory education', 'giáo dục bắt buộc'),
      makeSavedWord('w4', 'higher education', 'giáo dục đại học'),
      makeSavedWord('w5', 'vocational training', 'đào tạo nghề'),
      makeSavedWord('w6', 'state school', 'trường công lập'),
      makeSavedWord('w7', 'private tuition', 'học phí tư thục'),
      makeSavedWord('w8', 'academic curriculum', 'chương trình học thuật'),
      makeSavedWord('w9', 'distance learning', 'học từ xa'),
      makeSavedWord('w10', 'student loan', 'khoản vay sinh viên'),
      makeSavedWord('w11', 'scholarship grant', 'học bổng tài trợ', {
        sourceYoutubeId: 'RKK7wGAYP6k',
        sourceTimestampSec: 42
      })
    ];

    const exactOccurrences = youglishEngine.mineYouGlishOccurrences(vault11, []);
    // Old behavior dropped 10 of 11 words (only 'complicated' matched YOUGLISH_CORPUS)
    expect(exactOccurrences.length).toBeLessThan(vault11.length);

    const fullFeed = buildFullSrsShortsFeed({
      savedWords: vault11,
      exactOccurrences,
      lessons: []
    });

    // New 3-Tier builder guarantees 11/11 coverage with zero dropped words
    expect(fullFeed).toHaveLength(11);
    expect(new Set(fullFeed.map((c) => c.srsWordId)).size).toBe(11);

    const exactItem = fullFeed.find((c) => c.srsWordId === 'w1');
    expect(exactItem?.srsMatchTier).toBe('exact_video');
    expect(exactItem?.youtubeId).toBeTruthy();

    const sourceVideoItem = fullFeed.find((c) => c.srsWordId === 'w11');
    expect(sourceVideoItem?.srsMatchTier).toBe('source_video');
    expect(sourceVideoItem?.youtubeId).toBe('RKK7wGAYP6k');
    expect(sourceVideoItem?.startSeconds).toBe(42);

    const audioCards = fullFeed.filter((c) => c.isAudioSrsCard);
    expect(audioCards.length).toBeGreaterThan(0);
    for (const card of audioCards) {
      expect(card.isSrsReviewClip).toBe(true);
      expect(card.subtitles.length).toBe(1);
      expect(card.srsMatchTier).toBe('audio_context');
    }
  });
});
