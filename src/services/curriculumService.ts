import {
  CurriculumGrammarUnitData,
  CurriculumManifest,
  CurriculumVocabUnitData
} from '../types';

let manifestCache: CurriculumManifest | null = null;
const unitCache = new Map<string, CurriculumVocabUnitData | CurriculumGrammarUnitData>();

function withVersionQuery(url: string, version?: string): string {
  const sep = url.includes('?') ? '&' : '?';
  const v = encodeURIComponent(version || String(Date.now()));
  return `${url}${sep}v=${v}`;
}

export const curriculumService = {
  async getManifest(): Promise<CurriculumManifest> {
    if (manifestCache) return manifestCache;
    const res = await fetch(`/curriculum/manifest.json?t=${Date.now()}`, {
      cache: 'no-cache'
    });
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
    const url = withVersionQuery(dataPath, manifestCache?.version);
    const res = await fetch(url, { cache: 'no-cache' });
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
    const url = withVersionQuery(dataPath, manifestCache?.version);
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) {
      throw new Error(`Không thể tải dữ liệu ngữ pháp (${dataPath}).`);
    }
    const data = (await res.json()) as CurriculumGrammarUnitData;
    unitCache.set(dataPath, data);
    return data;
  }
};
