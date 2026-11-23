import {
  CurriculumGrammarUnitData,
  CurriculumManifest,
  CurriculumVocabUnitData
} from '../types';

let manifestCache: CurriculumManifest | null = null;
const unitCache = new Map<string, CurriculumVocabUnitData | CurriculumGrammarUnitData>();

export const curriculumService = {
  async getManifest(): Promise<CurriculumManifest> {
    if (manifestCache) return manifestCache;
    const res = await fetch('/curriculum/manifest.json');
    if (!res.ok) {
      throw new Error(`Không thể tải mục lục Lộ trình (HTTP ${res.status}).`);
    }
    const data = (await res.json()) as CurriculumManifest;
    manifestCache = data;
    return data;
  },

  async getVocabUnit(dataPath: string): Promise<CurriculumVocabUnitData> {
    const cached = unitCache.get(dataPath);
    if (cached && cached.trackType !== 'grammar') {
      return cached;
    }
    const res = await fetch(dataPath);
    if (!res.ok) {
      throw new Error(`Không thể tải dữ liệu chặng học (${dataPath}).`);
    }
    const data = (await res.json()) as CurriculumVocabUnitData;
    unitCache.set(dataPath, data);
    return data;
  },

  async getGrammarUnit(dataPath: string): Promise<CurriculumGrammarUnitData> {
    const cached = unitCache.get(dataPath);
    if (cached && cached.trackType === 'grammar') {
      return cached;
    }
    const res = await fetch(dataPath);
    if (!res.ok) {
      throw new Error(`Không thể tải dữ liệu ngữ pháp (${dataPath}).`);
    }
    const data = (await res.json()) as CurriculumGrammarUnitData;
    unitCache.set(dataPath, data);
    return data;
  }
};
