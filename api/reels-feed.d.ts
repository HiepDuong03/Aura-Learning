export interface ReelChannelConfig {
  channelId: string;
  channelName: string;
  category: 'daily_life' | 'work_talk' | 'my_videos';
  register: 'casual_us' | 'workplace_us' | 'everyday';
  level: 'A2' | 'B1' | 'B2';
  isCustomChannel?: boolean;
}

export interface RssReelItem {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  channelId: string;
  thumbnail: string;
  publishedAt: string;
  expression: string;
  reelCategory: 'daily_life' | 'work_talk' | 'my_videos';
  register: 'casual_us' | 'workplace_us' | 'everyday';
  level: 'A2' | 'B1' | 'B2';
  isCustomChannel: boolean;
}

export const DEFAULT_REEL_CHANNELS: ReelChannelConfig[];
export function isValidChannelId(id: unknown): boolean;
export function decodeXmlEntities(text: string): string;
export function extractExpressionFromTitle(title: string): string;
export function extractShortVideoId(rawInput: string): string | null;
export function parseYouTubeRssShorts(xml: string, channelMeta?: Partial<ReelChannelConfig>): RssReelItem[];
export function getAutoUpdatingReelsFeed(customChannelIds?: string[], forceRefresh?: boolean): Promise<{
  updatedAt: string;
  cached: boolean;
  channels: Array<{ channelId: string; channelName: string; category: string; shortsCount: number; ok: boolean }>;
  total: number;
  reels: RssReelItem[];
}>;
export function resolveChannelOrShort(rawInput: string): Promise<
  | { type: 'short'; videoId: string; title: string; author: string; vertical: boolean; thumbnail: string }
  | { type: 'channel'; channelId: string; channelName: string; shortsCount: number; sampleReels: RssReelItem[] }
>;
export function handleReelsFeedRequest(req: unknown, res: unknown, pathname: string): Promise<void>;
